import { prisma } from "@/lib/prisma";
import { extractPdfPages } from "./pdf-extractor";
import {
  createVisionProvidersFromEnv,
  type VisionProvider,
} from "./vision-provider";
import { getRateLimiter } from "./rate-limiter";
import { CostTracker } from "./cost-tracker";
import type {
  GeneratedGuide,
  GeneratedStep,
  QualityFlag,
  VisionAnalysisResponse,
} from "./types";

// ─── Step Extraction Prompt ───

const STEP_EXTRACTION_PROMPT = `You are analyzing a single page from an IKEA assembly instruction PDF. Extract all assembly information visible on this page and return it as structured JSON.

Analyze the image carefully and extract:
1. What assembly step(s) are shown on this page
2. What parts and hardware are referenced (look for part numbers, screws, dowels, cam locks)
3. What tools are needed
4. Any warnings, tips, or important notes
5. The direction of screw/fastener rotation if shown
6. Whether this page is a parts list/legend page or an assembly step page

For each step visible on the page, provide:
- stepNumber: The step number shown in the diagram (or 0 if this is a parts/tools page)
- title: A short descriptive title for this step
- instruction: Clear, concise text instruction describing what to do. Write as if explaining to someone who cannot see the diagram.
- parts: Array of {partNumber, partName, quantity} for parts used in this step
- tools: Array of {toolName} for tools needed
- callouts: Array of {type: "warning"|"tip"|"info", text} for any safety warnings, tips, or notes
- screwDirection: "clockwise" | "counter_clockwise" | "none"
- complexity: "simple" if it shows a single straightforward action, "complex" if it shows multiple sub-actions, exploded views, or precise spatial relationships
- confidence: Your confidence from 0.0 to 1.0 that you correctly interpreted this page

Also report these page-level indicators for escalation decisions:
- arrowCount: How many directional arrows are visible on this page
- hasHingeOrRotation: true if the page shows hinge alignment, drawer slides, or rotation instructions
- hasFastenerAmbiguity: true if screws/fasteners are hard to distinguish (Torx vs Philips, similar sizes)
- isPartsPage: true if this is primarily a parts legend or tools page (not an assembly step)

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "...",
      "instruction": "...",
      "parts": [{"partNumber": "...", "partName": "...", "quantity": 1}],
      "tools": [{"toolName": "..."}],
      "callouts": [{"type": "warning", "text": "..."}],
      "screwDirection": "none",
      "complexity": "simple",
      "confidence": 0.85
    }
  ],
  "pageIndicators": {
    "arrowCount": 3,
    "hasHingeOrRotation": false,
    "hasFastenerAmbiguity": false,
    "isPartsPage": false
  }
}`;

// ─── Types for page analysis ───

interface PageAnalysisResult {
  steps: Array<{
    stepNumber: number;
    title: string;
    instruction: string;
    parts: Array<{ partNumber: string; partName: string; quantity: number }>;
    tools: Array<{ toolName: string }>;
    callouts: Array<{ type: "warning" | "tip" | "info"; text: string }>;
    screwDirection: "clockwise" | "counter_clockwise" | "none";
    complexity: "simple" | "complex";
    confidence: number;
  }>;
  pageIndicators: {
    arrowCount: number;
    hasHingeOrRotation: boolean;
    hasFastenerAmbiguity: boolean;
    isPartsPage: boolean;
  };
}

interface PageResult {
  pageNumber: number;
  analysis: PageAnalysisResult;
  modelUsed: string;
  escalated: boolean;
}

// ─── Escalation Logic ───

function shouldEscalateToPro(analysis: PageAnalysisResult): boolean {
  const { pageIndicators } = analysis;
  // Tuned from 20-page benchmark (2026-02-12)
  if (pageIndicators.arrowCount >= 5) return true;
  if (pageIndicators.hasHingeOrRotation) return true;
  if (pageIndicators.hasFastenerAmbiguity) return true;
  // Low confidence on any step
  const lowConfStep = analysis.steps.some((s) => s.confidence < 0.7);
  if (lowConfStep) return true;
  return false;
}

// ─── JSON Parsing ───

function parseAnalysisJson(content: string): PageAnalysisResult | null {
  // Try to extract JSON from the response (handle markdown code fences, extra text)
  let jsonStr = content.trim();

  // Strip markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Try to find JSON object
  const objStart = jsonStr.indexOf("{");
  const objEnd = jsonStr.lastIndexOf("}");
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    jsonStr = jsonStr.slice(objStart, objEnd + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    // Basic validation
    if (!parsed.steps || !Array.isArray(parsed.steps)) return null;
    if (!parsed.pageIndicators) {
      parsed.pageIndicators = {
        arrowCount: 0,
        hasHingeOrRotation: false,
        hasFastenerAmbiguity: false,
        isPartsPage: false,
      };
    }
    return parsed as PageAnalysisResult;
  } catch {
    return null;
  }
}

// ─── Main Generation Function ───

export interface GenerateGuideOptions {
  /** Skip creating/updating the AIGenerationJob record (for testing) */
  skipJobRecord?: boolean;
  /** Override the PDF URL (for testing with a specific PDF) */
  pdfUrlOverride?: string;
}

export async function generateGuideForProduct(
  productId: number,
  options: GenerateGuideOptions = {}
): Promise<GeneratedGuide> {
  const startTime = Date.now();

  // 1. Look up product
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      documents: {
        where: { document_type: "assembly" },
      },
    },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  // 2. Find assembly PDF
  const pdfUrl = options.pdfUrlOverride ?? product.documents[0]?.source_url;
  if (!pdfUrl) {
    throw new Error(
      `No assembly PDF found for product ${productId} (${product.product_name})`
    );
  }

  // 3. Create AIGenerationJob record
  let jobId: string | undefined;
  if (!options.skipJobRecord) {
    const job = await prisma.aIGenerationJob.create({
      data: {
        productId,
        status: "processing",
        inputPdfUrl: pdfUrl,
        priority: "normal",
        triggeredBy: "manual",
      },
    });
    jobId = job.id;

    // Update product guide status
    await prisma.product.update({
      where: { id: productId },
      data: { guide_status: "generating" },
    });
  }

  const costTracker = new CostTracker(jobId);

  try {
    // 4. Set up vision providers
    const { primary: flashProvider, secondary: proProvider } =
      createVisionProvidersFromEnv();
    const rateLimiter = getRateLimiter(flashProvider.provider);

    // 5. Extract PDF pages
    const pdfResult = await extractPdfPages(pdfUrl);

    if (pdfResult.pages.length === 0) {
      throw new Error("PDF extraction produced no pages");
    }

    // 6. Analyze each page
    const pageResults: PageResult[] = [];

    for (const page of pdfResult.pages) {
      // Rate limit
      await rateLimiter.acquire();

      // First pass: Flash
      let response: VisionAnalysisResponse;
      try {
        response = await flashProvider.analyzeImage({
          image: page.imageBuffer,
          mimeType: page.mimeType,
          prompt: STEP_EXTRACTION_PROMPT,
          maxTokens: 4096,
        });
      } catch (err) {
        // If Flash fails entirely, try Pro if available
        if (proProvider) {
          await rateLimiter.acquire();
          response = await proProvider.analyzeImage({
            image: page.imageBuffer,
            mimeType: page.mimeType,
            prompt: STEP_EXTRACTION_PROMPT,
            maxTokens: 4096,
          });
          costTracker.record(
            proProvider.model,
            response.usage.inputTokens,
            response.usage.outputTokens,
            `page_${page.pageNumber}_flash_fail_escalation`
          );
          pageResults.push({
            pageNumber: page.pageNumber,
            analysis: parseAnalysisJson(response.content) ?? {
              steps: [],
              pageIndicators: {
                arrowCount: 0,
                hasHingeOrRotation: false,
                hasFastenerAmbiguity: false,
                isPartsPage: false,
              },
            },
            modelUsed: proProvider.model,
            escalated: true,
          });
          continue;
        }
        throw err;
      }

      costTracker.record(
        flashProvider.model,
        response.usage.inputTokens,
        response.usage.outputTokens,
        `page_${page.pageNumber}_flash`
      );

      // Try to parse Flash response
      let analysis = parseAnalysisJson(response.content);

      // Escalation trigger: JSON parse failure
      if (!analysis && proProvider) {
        await rateLimiter.acquire();
        const proResponse = await proProvider.analyzeImage({
          image: page.imageBuffer,
          mimeType: page.mimeType,
          prompt: STEP_EXTRACTION_PROMPT,
          maxTokens: 4096,
        });
        costTracker.record(
          proProvider.model,
          proResponse.usage.inputTokens,
          proResponse.usage.outputTokens,
          `page_${page.pageNumber}_json_fail_escalation`
        );
        analysis = parseAnalysisJson(proResponse.content);
        pageResults.push({
          pageNumber: page.pageNumber,
          analysis: analysis ?? {
            steps: [],
            pageIndicators: {
              arrowCount: 0,
              hasHingeOrRotation: false,
              hasFastenerAmbiguity: false,
              isPartsPage: false,
            },
          },
          modelUsed: proProvider.model,
          escalated: true,
        });
        continue;
      }

      if (!analysis) {
        // Both failed or no Pro available — empty result for this page
        pageResults.push({
          pageNumber: page.pageNumber,
          analysis: {
            steps: [],
            pageIndicators: {
              arrowCount: 0,
              hasHingeOrRotation: false,
              hasFastenerAmbiguity: false,
              isPartsPage: false,
            },
          },
          modelUsed: flashProvider.model,
          escalated: false,
        });
        continue;
      }

      // Escalation trigger: content-based triggers
      if (shouldEscalateToPro(analysis) && proProvider) {
        await rateLimiter.acquire();
        const proResponse = await proProvider.analyzeImage({
          image: page.imageBuffer,
          mimeType: page.mimeType,
          prompt: STEP_EXTRACTION_PROMPT,
          maxTokens: 4096,
        });
        costTracker.record(
          proProvider.model,
          proResponse.usage.inputTokens,
          proResponse.usage.outputTokens,
          `page_${page.pageNumber}_content_escalation`
        );
        const proAnalysis = parseAnalysisJson(proResponse.content);
        if (proAnalysis) {
          pageResults.push({
            pageNumber: page.pageNumber,
            analysis: proAnalysis,
            modelUsed: proProvider.model,
            escalated: true,
          });
          continue;
        }
        // Pro parse failed too — fall back to Flash result
      }

      pageResults.push({
        pageNumber: page.pageNumber,
        analysis,
        modelUsed: flashProvider.model,
        escalated: false,
      });
    }

    // 7. Assemble all steps from all pages
    const allSteps: GeneratedStep[] = [];
    const allToolNames = new Set<string>();
    const allParts = new Map<
      string,
      { partNumber: string; partName: string; quantity: number }
    >();

    for (const pageResult of pageResults) {
      for (const step of pageResult.analysis.steps) {
        allSteps.push({
          stepNumber: step.stepNumber,
          title: step.title,
          instruction: step.instruction,
          parts: step.parts,
          tools: step.tools,
          callouts: step.callouts,
          screwDirection: step.screwDirection,
          complexity: step.complexity,
          confidence: step.confidence,
          sourcePdfPage: pageResult.pageNumber,
        });

        // Collect tools
        for (const tool of step.tools) {
          allToolNames.add(tool.toolName);
        }

        // Collect parts (deduplicate by partNumber, sum quantities)
        for (const part of step.parts) {
          const existing = allParts.get(part.partNumber);
          if (existing) {
            existing.quantity = Math.max(existing.quantity, part.quantity);
          } else {
            allParts.set(part.partNumber, { ...part });
          }
        }
      }
    }

    // Sort steps by stepNumber, filter out step 0 (parts pages) for the main steps list
    const assemblySteps = allSteps
      .filter((s) => s.stepNumber > 0)
      .sort((a, b) => a.stepNumber - b.stepNumber);

    // Renumber steps sequentially if there are gaps
    for (let i = 0; i < assemblySteps.length; i++) {
      assemblySteps[i].stepNumber = i + 1;
    }

    // 8. Calculate overall confidence
    const stepConfidences = assemblySteps.map((s) => s.confidence);
    const overallConfidence =
      stepConfidences.length > 0
        ? stepConfidences.reduce((a, b) => a + b, 0) / stepConfidences.length
        : 0;

    // 9. Run quality checks
    const qualityFlags: QualityFlag[] = [];

    // Check: low confidence steps
    for (const step of assemblySteps) {
      if (step.confidence < 0.7) {
        qualityFlags.push({
          code: "low_confidence_step",
          message: `Step ${step.stepNumber} has low confidence (${step.confidence.toFixed(2)})`,
          severity: "warning",
          stepNumber: step.stepNumber,
        });
      }
    }

    // Check: sequence gaps in original numbering
    const originalNumbers = allSteps
      .filter((s) => s.stepNumber > 0)
      .map((s) => s.stepNumber)
      .sort((a, b) => a - b);
    if (originalNumbers.length > 0) {
      const maxStep = originalNumbers[originalNumbers.length - 1];
      if (originalNumbers.length < maxStep) {
        qualityFlags.push({
          code: "sequence_gap",
          message: `Expected ${maxStep} steps based on numbering but found ${originalNumbers.length}`,
          severity: "warning",
        });
      }
    }

    // Check: no steps extracted
    if (assemblySteps.length === 0) {
      qualityFlags.push({
        code: "step_count_mismatch",
        message: "No assembly steps were extracted from the PDF",
        severity: "error",
      });
    }

    // Check: tools used in steps but not in summary
    const toolsInSteps = new Set(
      assemblySteps.flatMap((s) => s.tools.map((t) => t.toolName))
    );
    if (toolsInSteps.size === 0 && assemblySteps.length > 3) {
      qualityFlags.push({
        code: "missing_tools",
        message:
          "No tools were identified across all steps — assembly likely requires tools",
        severity: "info",
      });
    }

    // Estimate difficulty from step count and complexity
    const complexStepRatio =
      assemblySteps.length > 0
        ? assemblySteps.filter((s) => s.complexity === "complex").length /
          assemblySteps.length
        : 0;
    let difficulty: "easy" | "medium" | "hard" = "medium";
    if (assemblySteps.length <= 5 && complexStepRatio < 0.3) {
      difficulty = "easy";
    } else if (assemblySteps.length > 15 || complexStepRatio > 0.5) {
      difficulty = "hard";
    }

    // Estimate time (rough: 3-5 min per step depending on complexity)
    const estimatedTimeMinutes = assemblySteps.reduce((total, step) => {
      return total + (step.complexity === "complex" ? 5 : 3);
    }, 0);

    const partsArray = Array.from(allParts.values());
    const toolsArray = Array.from(allToolNames).map((name) => ({
      toolName: name,
    }));

    // 10. Build the GeneratedGuide
    const guide: GeneratedGuide = {
      productId,
      title: `How to Assemble ${product.product_name ?? "Product"}`,
      description: `Step-by-step assembly guide for ${product.product_name ?? "this product"}. ${assemblySteps.length} steps.`,
      difficulty,
      estimatedTimeMinutes,
      tools: {
        required: toolsArray,
        optional: [],
      },
      parts: {
        parts: partsArray,
        totalPartCount: partsArray.reduce((sum, p) => sum + p.quantity, 0),
      },
      steps: assemblySteps,
      overallConfidence,
      qualityFlags,
      metadata: {
        primaryModel: flashProvider.model,
        secondaryModel: proProvider?.model,
        pdfPageCount: pdfResult.totalPages,
        processingTimeMs: Date.now() - startTime,
        pdfUrl,
        generatedAt: new Date().toISOString(),
      },
    };

    // 11. Update AIGenerationJob with results
    if (jobId) {
      await prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: overallConfidence >= 0.7 ? "review" : "review",
          modelPrimary: flashProvider.model,
          modelSecondary: proProvider?.model,
          rawOutput: JSON.parse(JSON.stringify(guide)),
          confidenceScore: overallConfidence,
          qualityFlags: JSON.parse(JSON.stringify(qualityFlags)),
          completedAt: new Date(),
        },
      });

      // Update product guide status
      await prisma.product.update({
        where: { id: productId },
        data: { guide_status: "in_review" },
      });
    }

    return guide;
  } catch (error) {
    // Update job as failed
    if (jobId) {
      await prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          reviewNotes:
            error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });

      // Reset product guide status
      await prisma.product.update({
        where: { id: productId },
        data: { guide_status: "none" },
      });
    }

    throw error;
  }
}
