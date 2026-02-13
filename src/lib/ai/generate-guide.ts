import { prisma } from "@/lib/prisma";
import { extractPdfPages } from "./pdf-extractor";
import {
  createVisionProvidersFromEnv,
  type VisionProvider,
} from "./vision-provider";
import { getRateLimiter } from "./rate-limiter";
import { CostTracker } from "./cost-tracker";
import {
  generateIllustrationsForGuide,
  classifyComplexityForIllustration,
} from "./illustration-generator";
import { runQualityChecks } from "./quality-checker";
import type {
  GeneratedGuide,
  GeneratedStep,
  PartReference,
  ToolReference,
  QualityFlag,
  VisionAnalysisResponse,
  RawPageExtraction,
  RawStepExtraction,
} from "./types";

// ─── Raw Visual Extraction Prompt (Pass 1) ───
// Extracts factual visual observations only. No narrative prose.
// The continuity refinement pass (Pass 2) will later generate human-readable instructions.

const STEP_EXTRACTION_PROMPT = `You are analyzing a single page from an IKEA assembly instruction PDF. Extract all visual information as raw factual observations. Do NOT write narrative instructions — only describe what you see.

Your job is to report WHAT is shown on this page, not to explain HOW to do it. Focus on:
- What parts are visible (with part numbers/letters if labeled)
- What actions are depicted (insert, attach, rotate, tighten, flip, slide)
- Spatial relationships between parts (which goes on top, which aligns where)
- Arrow directions and what they indicate
- Fastener types and any rotation shown
- Text annotations, quantity markers (x4), and icons (two-person icon, click icon, warning triangle)

For each step visible on the page, provide:
- stepNumber: The step number shown in the diagram (0 for parts/tools legend pages)
- rawDescription: A factual observation of what is depicted. Describe the scene, not instructions. Example: "Two side panels (A) shown being lowered onto dowels inserted in base panel (B). Four downward arrows indicate direction. x4 quantity marker near dowels."
- partsShown: Array of {partNumber, partName, quantity} — every part visible in this step
- toolsShown: Array of {toolName} — tools shown or implied
- actions: Array of {actionType, subject, target, direction} — each distinct action depicted
  - actionType: "insert", "attach", "rotate", "tighten", "loosen", "align", "flip", "slide", "push", "pull", "place", "remove", "hold", "press"
  - subject: what is being moved/acted on (include part ID)
  - target: where it goes or what it interacts with (include part ID)
  - direction: movement direction if shown (e.g., "downward", "left-to-right", "toward viewer")
- spatialDetails: {orientation, alignmentNotes}
  - orientation: how the product is positioned (e.g., "Product on its side, back panel facing up")
  - alignmentNotes: alignment cues shown (e.g., "Arrow indicates hole alignment between panels A and B")
- arrows: Array of {direction, label, indicatesMotion}
  - direction: "downward", "upward", "clockwise", "counter-clockwise", "left-to-right", etc.
  - label: text near the arrow if any (e.g., "CLICK", "90°")
  - indicatesMotion: true if the arrow shows assembly motion, false if it's just a callout pointer
- fasteners: Array of {type, partId, rotation, notes}
  - type: "cam lock", "wooden dowel", "screw", "bolt", "nail", "pin", "hook"
  - partId: part number if labeled
  - rotation: "clockwise", "counter_clockwise", or "none"
  - notes: any visual cues (e.g., "quarter-turn arrow shown", "cross-section detail inset")
- annotations: Other text/symbols visible (e.g., "x4", "2x", "click sound icon", "two-person icon", "measurement 120cm")
- warnings: Safety/caution icons or text (e.g., "two-person lift icon", "warning triangle", "do not overtighten symbol")
- complexity: "simple" if single straightforward action, "complex" if multiple sub-actions, exploded views, or precise spatial relationships
- confidence: 0.0 to 1.0 — your confidence in correctly interpreting this page

Also report these page-level indicators for escalation decisions:
- arrowCount: Total directional arrows visible
- hasHingeOrRotation: true if page shows hinge alignment, drawer slides, or rotation
- hasFastenerAmbiguity: true if screws/fasteners are hard to distinguish
- isPartsPage: true if this is primarily a parts legend or tools page

Return ONLY valid JSON with this exact structure (no markdown, no code fences):
{
  "steps": [
    {
      "stepNumber": 1,
      "rawDescription": "Two side panels (A) lowered onto four wooden dowels (101350) pre-inserted in base panel (B). Four downward arrows. x4 marker near dowels.",
      "partsShown": [{"partNumber": "A", "partName": "Side panel", "quantity": 2}, {"partNumber": "101350", "partName": "Wooden dowel", "quantity": 4}],
      "toolsShown": [{"toolName": "Hammer"}],
      "actions": [{"actionType": "insert", "subject": "Dowel (101350)", "target": "Base panel (B) holes", "direction": "push in"}, {"actionType": "place", "subject": "Side panel (A)", "target": "Dowels on base panel (B)", "direction": "downward"}],
      "spatialDetails": {"orientation": "Base panel flat on floor", "alignmentNotes": "Dowel holes in side panel align with dowels in base panel edge"},
      "arrows": [{"direction": "downward", "label": null, "indicatesMotion": true}],
      "fasteners": [{"type": "wooden dowel", "partId": "101350", "rotation": "none", "notes": "Push-fit"}],
      "annotations": ["x4"],
      "warnings": [],
      "complexity": "simple",
      "confidence": 0.88
    }
  ],
  "pageIndicators": {
    "arrowCount": 4,
    "hasHingeOrRotation": false,
    "hasFastenerAmbiguity": false,
    "isPartsPage": false
  }
}`;

// ─── Types for page analysis ───
// PageAnalysisResult mirrors RawPageExtraction from types.ts
// but kept as a local interface for JSON parsing validation.

type PageAnalysisResult = RawPageExtraction;

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
    // Normalize each step to ensure required fields exist with defaults
    for (const step of parsed.steps) {
      step.rawDescription = step.rawDescription ?? step.instruction ?? "";
      step.partsShown = step.partsShown ?? step.parts ?? [];
      step.toolsShown = step.toolsShown ?? step.tools ?? [];
      step.actions = step.actions ?? [];
      step.spatialDetails = step.spatialDetails ?? {};
      step.arrows = step.arrows ?? [];
      step.fasteners = step.fasteners ?? [];
      step.annotations = step.annotations ?? [];
      step.warnings = step.warnings ?? [];
      step.complexity = step.complexity ?? "simple";
      step.confidence = step.confidence ?? 0.5;
    }
    return parsed as PageAnalysisResult;
  } catch {
    return null;
  }
}

// ─── Raw Extraction → GeneratedStep Helpers ───
// These bridge raw visual data into the GeneratedStep format.
// The `instruction` field is a factual placeholder; Pass 2 (continuity refinement)
// will replace it with flowing, context-aware narrative text.

function deriveStepTitle(raw: RawStepExtraction): string {
  if (raw.stepNumber === 0) return "Parts & Tools Overview";

  // Build a title from the primary action
  if (raw.actions.length > 0) {
    const primary = raw.actions[0];
    const verb = primary.actionType.charAt(0).toUpperCase() + primary.actionType.slice(1);
    // Truncate long subjects
    const subject = primary.subject.length > 40
      ? primary.subject.slice(0, 40) + "..."
      : primary.subject;
    return `${verb} ${subject}`;
  }

  // Fallback: summarize from rawDescription
  const desc = raw.rawDescription;
  if (desc.length > 50) return desc.slice(0, 47) + "...";
  return desc || `Step ${raw.stepNumber}`;
}

function buildFactualInstruction(raw: RawStepExtraction): string {
  // Build a factual summary from raw visual data.
  // This is NOT the final user-facing instruction — Pass 2 will rewrite it.
  const parts: string[] = [];

  // Raw description first
  if (raw.rawDescription) {
    parts.push(raw.rawDescription);
  }

  // Actions
  if (raw.actions.length > 0) {
    const actionDescriptions = raw.actions.map((a) => {
      let desc = `${a.actionType} ${a.subject}`;
      if (a.target) desc += ` into/onto ${a.target}`;
      if (a.direction) desc += ` (${a.direction})`;
      return desc;
    });
    parts.push("Actions: " + actionDescriptions.join("; ") + ".");
  }

  // Fastener details
  if (raw.fasteners.length > 0) {
    const fastenerDesc = raw.fasteners.map((f) => {
      let desc = f.type;
      if (f.partId) desc += ` (${f.partId})`;
      if (f.rotation !== "none") desc += `, rotate ${f.rotation}`;
      if (f.notes) desc += ` — ${f.notes}`;
      return desc;
    });
    parts.push("Fasteners: " + fastenerDesc.join("; ") + ".");
  }

  // Spatial details
  if (raw.spatialDetails.orientation || raw.spatialDetails.alignmentNotes) {
    const spatial: string[] = [];
    if (raw.spatialDetails.orientation) spatial.push(raw.spatialDetails.orientation);
    if (raw.spatialDetails.alignmentNotes) spatial.push(raw.spatialDetails.alignmentNotes);
    parts.push("Spatial: " + spatial.join(". ") + ".");
  }

  return parts.join(" ") || `Step ${raw.stepNumber}.`;
}

function deriveCallouts(raw: RawStepExtraction): Array<{ type: "warning" | "tip" | "info"; text: string }> {
  const callouts: Array<{ type: "warning" | "tip" | "info"; text: string }> = [];

  // Convert warnings to warning callouts
  for (const warning of raw.warnings) {
    callouts.push({ type: "warning", text: warning });
  }

  // Convert fastener notes to info callouts
  for (const fastener of raw.fasteners) {
    if (fastener.notes && fastener.notes.length > 0) {
      callouts.push({ type: "info", text: `${fastener.type}: ${fastener.notes}` });
    }
  }

  return callouts;
}

function deriveScrewDirection(raw: RawStepExtraction): "clockwise" | "counter_clockwise" | "none" {
  // Check fasteners for rotation
  for (const fastener of raw.fasteners) {
    if (fastener.rotation === "clockwise" || fastener.rotation === "counter_clockwise") {
      return fastener.rotation;
    }
  }

  // Check arrows for rotation directions
  for (const arrow of raw.arrows) {
    if (arrow.direction === "clockwise") return "clockwise";
    if (arrow.direction === "counter-clockwise" || arrow.direction === "counter_clockwise") return "counter_clockwise";
  }

  return "none";
}

// ─── Text-Only Gemini API Call (for Pass 2) ───

interface TextCompletionResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

async function callGeminiText(
  prompt: string,
  options: {
    model?: string;
    apiKey?: string;
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<TextCompletionResponse> {
  const model =
    options.model ?? process.env.AI_PRIMARY_MODEL ?? "gemini-2.5-flash";
  const apiKey =
    options.apiKey ??
    process.env.AI_PRIMARY_API_KEY ??
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing Gemini API key for text completion");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxTokens ?? 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini text API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  if (!candidate?.content?.parts?.[0]?.text) {
    throw new Error("Gemini text API returned no content");
  }

  return {
    content: candidate.content.parts[0].text,
    model,
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

// ─── Continuity Refinement Pass (Pass 2) ───
// Takes the full ordered sequence of raw visual extractions and rewrites
// them into flowing, context-aware narrative instructions.

const CONTINUITY_REFINEMENT_PROMPT = `You are a technical writer creating assembly instructions for IKEA furniture. You are given the COMPLETE ordered sequence of raw visual extraction data from an assembly PDF. Your job is to write clear, flowing, human-readable instructions for each step.

RULES:
1. Write each step's instruction with AWARENESS of all prior and subsequent steps. Reference previous work: "Using the frame you assembled in Steps 1-3, now attach the shelf pins..."
2. DETECT AND MERGE steps that are clearly split across PDF pages. If two consecutive raw steps describe parts of the same single action, merge them into one step. Only merge when they are genuinely one action split across pages — do NOT merge distinct sequential actions.
3. ADD TRANSITION LANGUAGE between major assembly phases. When the assembly moves from one major section to another (e.g., from frame to shelves, from drawer to door), add a brief transition note.
4. RESOLVE cross-step references. Use phrases like "the Allen key from Step 2", "the side panels you attached earlier", "these are the same cam locks used in Step 5."
5. MAINTAIN CONSISTENT part terminology throughout. If you call something a "cam lock" in Step 3, don't call it a "round metal fastener" in Step 12. Choose the clearest name and use it consistently.
6. REITERATE safety warnings when relevant actions repeat. If Step 5 had a "two-person lift" warning and Step 18 involves a similar heavy lift, remind the user.

WRITING STYLE:
- Active voice, imperative mood: "Insert the dowels" not "The dowels should be inserted"
- Short sentences (max 20 words per sentence when possible)
- Specific part references with IDs: "wooden dowel (101350)" not just "dowel"
- Include quantities: "Insert 4 wooden dowels" not "Insert dowels"
- When relevant, include direction: "...into the pre-drilled holes on the LEFT side panel"
- One clear action per sentence. Multi-action steps get sequential sentences.
- Start each step's instruction with the primary action verb.

PRODUCT: {productName}
TOTAL RAW STEPS: {stepCount}

RAW EXTRACTION DATA (all steps, in order):
{stepsJson}

Return ONLY valid JSON (no markdown, no code fences):
{
  "refinedSteps": [
    {
      "originalStepNumbers": [1],
      "title": "Short title (3-8 words)",
      "instruction": "Full narrative instruction text. Multiple sentences are fine.",
      "transitionNote": null
    },
    {
      "originalStepNumbers": [5, 6],
      "title": "Title for merged step",
      "instruction": "Combined instruction for both original steps as one coherent action.",
      "transitionNote": "With the frame assembled, you'll now install the shelving."
    }
  ]
}

NOTES:
- originalStepNumbers: usually [N] for one step, or [N, N+1] for merged steps
- title: 3-8 words describing the main action
- instruction: the full text the user will read — this is the PRIMARY output
- transitionNote: OPTIONAL — include only at major phase boundaries (usually 2-4 per guide)
- Output one entry per FINAL step (after merging). Total may be less than input count.
- Preserve original step numbering in originalStepNumbers — the calling code renumbers.`;

interface RefinedStep {
  originalStepNumbers: number[];
  title: string;
  instruction: string;
  transitionNote?: string | null;
}

interface ContinuityRefinementResult {
  refinedSteps: RefinedStep[];
}

function parseRefinementJson(
  content: string
): ContinuityRefinementResult | null {
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
    if (!parsed.refinedSteps || !Array.isArray(parsed.refinedSteps)) {
      return null;
    }

    // Validate each refined step
    for (const step of parsed.refinedSteps) {
      if (
        !step.originalStepNumbers ||
        !Array.isArray(step.originalStepNumbers)
      ) {
        return null;
      }
      if (typeof step.instruction !== "string") return null;
      step.title = step.title ?? "";
      step.transitionNote = step.transitionNote ?? null;
    }
    return parsed as ContinuityRefinementResult;
  } catch {
    return null;
  }
}

function deduplicateParts(parts: PartReference[]): PartReference[] {
  const map = new Map<string, PartReference>();
  for (const part of parts) {
    const existing = map.get(part.partNumber);
    if (existing) {
      existing.quantity = Math.max(existing.quantity, part.quantity);
    } else {
      map.set(part.partNumber, { ...part });
    }
  }
  return Array.from(map.values());
}

function deduplicateTools(tools: ToolReference[]): ToolReference[] {
  const seen = new Set<string>();
  return tools.filter((t) => {
    if (seen.has(t.toolName)) return false;
    seen.add(t.toolName);
    return true;
  });
}

async function runContinuityRefinement(
  steps: GeneratedStep[],
  productName: string,
  costTracker: CostTracker
): Promise<ContinuityRefinementResult> {
  // Serialize raw extractions as compact JSON input for the text model
  const stepsData = steps.map((step) => ({
    stepNumber: step.stepNumber,
    rawDescription: step.rawExtraction?.rawDescription ?? step.instruction,
    partsShown: step.rawExtraction?.partsShown ?? step.parts,
    toolsShown: step.rawExtraction?.toolsShown ?? step.tools,
    actions: step.rawExtraction?.actions ?? [],
    spatialDetails: step.rawExtraction?.spatialDetails ?? {},
    arrows: step.rawExtraction?.arrows ?? [],
    fasteners: step.rawExtraction?.fasteners ?? [],
    annotations: step.rawExtraction?.annotations ?? [],
    warnings: step.rawExtraction?.warnings ?? [],
    complexity: step.complexity,
  }));

  const prompt = CONTINUITY_REFINEMENT_PROMPT.replace(
    "{productName}",
    productName
  )
    .replace("{stepCount}", String(steps.length))
    .replace("{stepsJson}", JSON.stringify(stepsData, null, 2));

  // Scale maxTokens with step count — ~200 tokens per step is generous
  const maxTokens = Math.max(4096, Math.min(steps.length * 200, 16384));

  const response = await callGeminiText(prompt, {
    maxTokens,
    temperature: 0.3,
  });

  costTracker.record(
    response.model,
    response.usage.inputTokens,
    response.usage.outputTokens,
    "continuity_refinement"
  );

  // Parse the response
  const parsed = parseRefinementJson(response.content);
  if (!parsed) {
    console.warn(
      "[continuity-refinement] Failed to parse refinement response, keeping factual instructions"
    );
    // Return original steps unchanged
    return {
      refinedSteps: steps.map((s) => ({
        originalStepNumbers: [s.stepNumber],
        title: s.title,
        instruction: s.instruction,
      })),
    };
  }

  return parsed;
}

// ─── Main Generation Function ───

export interface GenerateGuideOptions {
  /** Skip creating/updating the AIGenerationJob record (for testing) */
  skipJobRecord?: boolean;
  /** Override the PDF URL (for testing with a specific PDF) */
  pdfUrlOverride?: string;
  /** Skip illustration generation (text-only guide) */
  skipIllustrations?: boolean;
  /** Only generate illustration prompts without calling the image API */
  illustrationDryRun?: boolean;
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

    // 7. Assemble all steps from all pages (convert raw extractions to GeneratedSteps)
    const allSteps: GeneratedStep[] = [];
    const allToolNames = new Set<string>();
    const allParts = new Map<
      string,
      { partNumber: string; partName: string; quantity: number }
    >();

    for (const pageResult of pageResults) {
      for (const rawStep of pageResult.analysis.steps) {
        // Derive a title from the raw description
        const title = deriveStepTitle(rawStep);

        // Generate a factual placeholder instruction from raw visual data.
        // This will be replaced by the continuity refinement pass (Pass 2, P1.2.5).
        const instruction = buildFactualInstruction(rawStep);

        // Derive callouts from warnings and fastener notes
        const callouts = deriveCallouts(rawStep);

        // Derive screw direction from fasteners
        const screwDirection = deriveScrewDirection(rawStep);

        allSteps.push({
          stepNumber: rawStep.stepNumber,
          title,
          instruction,
          parts: rawStep.partsShown,
          tools: rawStep.toolsShown,
          callouts,
          screwDirection,
          complexity: rawStep.complexity,
          confidence: rawStep.confidence,
          sourcePdfPage: pageResult.pageNumber,
          rawExtraction: rawStep,
        });

        // Collect tools
        for (const tool of rawStep.toolsShown) {
          allToolNames.add(tool.toolName);
        }

        // Collect parts (deduplicate by partNumber, sum quantities)
        for (const part of rawStep.partsShown) {
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
    let assemblySteps = allSteps
      .filter((s) => s.stepNumber > 0)
      .sort((a, b) => a.stepNumber - b.stepNumber);

    // Renumber steps sequentially if there are gaps
    for (let i = 0; i < assemblySteps.length; i++) {
      assemblySteps[i].stepNumber = i + 1;
    }

    // 7.5. Run continuity refinement pass (Pass 2: text-only)
    // Rewrites factual placeholder instructions into flowing narrative text
    // with full-sequence context, consistent terminology, cross-step references,
    // and transition language. May merge steps split across PDF pages.
    if (assemblySteps.length > 0) {
      await rateLimiter.acquire();
      const refinementResult = await runContinuityRefinement(
        assemblySteps,
        product.product_name ?? "Product",
        costTracker
      );

      // Build lookup from original step number to the step object
      const stepByNumber = new Map<number, GeneratedStep>();
      for (const step of assemblySteps) {
        stepByNumber.set(step.stepNumber, step);
      }

      // Apply refined instructions, handling merges
      const refinedSteps: GeneratedStep[] = [];
      const processed = new Set<number>();

      for (const refined of refinementResult.refinedSteps) {
        // Skip if all original steps in this group were already processed
        if (refined.originalStepNumbers.every((n) => processed.has(n))) {
          continue;
        }
        refined.originalStepNumbers.forEach((n) => processed.add(n));

        if (refined.originalStepNumbers.length === 1) {
          // Single step — update instruction and title in place
          const origStep = stepByNumber.get(refined.originalStepNumbers[0]);
          if (origStep) {
            origStep.instruction = refined.instruction;
            if (refined.title) origStep.title = refined.title;
            if (refined.transitionNote) {
              origStep.callouts.unshift({
                type: "info",
                text: refined.transitionNote,
              });
            }
            refinedSteps.push(origStep);
          }
        } else {
          // Merged steps — combine parts, tools, callouts from all originals
          const originals = refined.originalStepNumbers
            .map((n) => stepByNumber.get(n))
            .filter((s): s is GeneratedStep => s != null);

          if (originals.length > 0) {
            const transitionCallouts: GeneratedStep["callouts"] =
              refined.transitionNote
                ? [{ type: "info", text: refined.transitionNote }]
                : [];

            const merged: GeneratedStep = {
              stepNumber: 0, // renumbered below
              title: refined.title || originals[0].title,
              instruction: refined.instruction,
              parts: deduplicateParts(originals.flatMap((s) => s.parts)),
              tools: deduplicateTools(originals.flatMap((s) => s.tools)),
              callouts: [
                ...transitionCallouts,
                ...originals.flatMap((s) => s.callouts),
              ],
              screwDirection:
                originals.find((s) => s.screwDirection !== "none")
                  ?.screwDirection ?? "none",
              complexity: originals.some((s) => s.complexity === "complex")
                ? "complex"
                : "simple",
              confidence: Math.min(...originals.map((s) => s.confidence)),
              sourcePdfPage: originals[0].sourcePdfPage,
              rawExtraction: originals[0].rawExtraction,
            };
            refinedSteps.push(merged);
          }
        }
      }

      // Also include any steps that the refinement pass missed
      for (const step of assemblySteps) {
        if (!processed.has(step.stepNumber)) {
          refinedSteps.push(step);
        }
      }

      // Renumber refined steps sequentially
      for (let i = 0; i < refinedSteps.length; i++) {
        refinedSteps[i].stepNumber = i + 1;
      }

      assemblySteps = refinedSteps;
    }

    // 8. Run quality checks (comprehensive automated validation)
    const qualityResult = runQualityChecks(assemblySteps, pdfResult.totalPages);
    const { flags: qualityFlags, overallConfidence } = qualityResult;

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

    // 9.5. Re-classify complexity for illustration routing and generate illustrations
    // The complexity field on each step was set during Pass 1 vision extraction.
    // Now refine it using the enhanced classification that considers part count,
    // spatial relationships, fastener variety, and action types — this determines
    // which illustration model (Nano Banana vs Nano Banana Pro) each step uses.
    for (const step of assemblySteps) {
      step.complexity = classifyComplexityForIllustration(step);
    }

    if (!options.skipIllustrations) {
      const illustrationResult = await generateIllustrationsForGuide(
        assemblySteps,
        product.product_name ?? "Product",
        costTracker,
        { dryRun: options.illustrationDryRun }
      );

      // Attach illustration data to steps
      for (const [stepNumber, result] of illustrationResult.illustrations) {
        const step = assemblySteps.find((s) => s.stepNumber === stepNumber);
        if (step) {
          step.illustrationPrompt = result.promptUsed;
          // illustrationUrl is populated later when the image is uploaded to storage
          // For now, the imageBuffer is available in the result for the caller to store
        }
      }

      // Log illustration failures as quality flags
      for (const failure of illustrationResult.failures) {
        qualityFlags.push({
          code: "low_confidence_step",
          message: `Illustration generation failed for step ${failure.stepNumber}: ${failure.error}`,
          severity: "warning",
          stepNumber: failure.stepNumber,
        });
      }
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
