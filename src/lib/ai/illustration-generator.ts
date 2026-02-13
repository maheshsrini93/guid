import { getRateLimiter } from "./rate-limiter";
import { CostTracker } from "./cost-tracker";
import type {
  GeneratedStep,
  StepComplexity,
} from "./types";

// ─── Types ───

export interface IllustrationResult {
  imageBuffer: Buffer;
  mimeType: "image/png" | "image/jpeg";
  modelUsed: string;
  promptUsed: string;
}

export interface IllustrationOptions {
  /** Only generate prompts, don't call the API (for testing/review) */
  dryRun?: boolean;
  /** Override model for all steps (bypass complexity routing) */
  modelOverride?: string;
  /** Max concurrent illustration requests (default: 1 — sequential for rate limits) */
  concurrency?: number;
}

export interface IllustrationBatchResult {
  /** Map of stepNumber → IllustrationResult */
  illustrations: Map<number, IllustrationResult>;
  /** Steps that failed with their error messages */
  failures: Array<{ stepNumber: number; error: string }>;
  /** Steps that were skipped (e.g., parts overview pages) */
  skipped: number[];
}

// ─── Complexity Classification ───

/**
 * Enhanced complexity classification for illustration model routing.
 * Uses part count, spatial relationships, action types, and fastener count
 * to determine whether a step needs the higher-fidelity model.
 */
export function classifyComplexityForIllustration(
  step: GeneratedStep
): StepComplexity {
  const raw = step.rawExtraction;

  // If no raw extraction data, fall back to the step's existing classification
  if (!raw) return step.complexity;

  let complexityScore = 0;

  // Part count: more parts = more complex illustration
  const partCount = raw.partsShown.reduce((sum, p) => sum + p.quantity, 0);
  if (partCount >= 6) complexityScore += 3;
  else if (partCount >= 3) complexityScore += 1;

  // Number of distinct actions
  if (raw.actions.length >= 3) complexityScore += 2;
  else if (raw.actions.length >= 2) complexityScore += 1;

  // Spatial complexity: orientation and alignment notes suggest precise positioning
  if (raw.spatialDetails.orientation && raw.spatialDetails.alignmentNotes) {
    complexityScore += 2;
  } else if (raw.spatialDetails.orientation || raw.spatialDetails.alignmentNotes) {
    complexityScore += 1;
  }

  // Fastener count and variety
  const fastenerTypes = new Set(raw.fasteners.map((f) => f.type));
  if (fastenerTypes.size >= 2) complexityScore += 2;
  else if (raw.fasteners.length >= 2) complexityScore += 1;

  // Arrow count: many arrows = exploded view or multi-direction assembly
  if (raw.arrows.length >= 4) complexityScore += 2;
  else if (raw.arrows.length >= 2) complexityScore += 1;

  // Rotation/hinge actions are inherently complex to illustrate
  const hasRotation = raw.actions.some(
    (a) =>
      a.actionType === "rotate" ||
      a.actionType === "flip" ||
      a.direction?.includes("clockwise") ||
      a.direction?.includes("rotate")
  );
  if (hasRotation) complexityScore += 2;

  // Threshold: score >= 5 → complex, otherwise simple
  return complexityScore >= 5 ? "complex" : "simple";
}

// ─── Model Selection ───

/**
 * Select the illustration model based on step complexity.
 * Simple → Nano Banana (cheaper, faster)
 * Complex → Nano Banana Pro (higher fidelity)
 */
export function selectIllustrationModel(complexity: StepComplexity): string {
  if (complexity === "complex") {
    return (
      process.env.ILLUSTRATION_MODEL_COMPLEX ?? "gemini-3-pro-image-preview"
    );
  }
  return process.env.ILLUSTRATION_MODEL_SIMPLE ?? "gemini-2.5-flash-image";
}

// ─── Prompt Building ───

/**
 * Build a detailed illustration prompt from step data.
 * The prompt describes what the illustration should show in isometric technical style.
 */
export function buildIllustrationPrompt(
  step: GeneratedStep,
  productName: string
): string {
  const raw = step.rawExtraction;

  // Style preamble shared across all illustrations
  const stylePreamble = `Create an isometric technical assembly illustration for furniture assembly instructions. Style: clean line art with subtle shading, neutral/warm color palette, white background, no text labels or annotations. The illustration should look like a professional assembly manual diagram.`;

  // Build scene description from raw extraction data
  const sceneParts: string[] = [];

  // Product context
  sceneParts.push(`Product: ${productName}, Step ${step.stepNumber}.`);

  // Main instruction / what's happening
  sceneParts.push(`Action: ${step.instruction}`);

  // Parts shown
  if (raw && raw.partsShown.length > 0) {
    const partsList = raw.partsShown
      .map((p) => `${p.partName}${p.quantity > 1 ? ` (x${p.quantity})` : ""}`)
      .join(", ");
    sceneParts.push(`Parts visible: ${partsList}.`);
  } else if (step.parts.length > 0) {
    const partsList = step.parts
      .map((p) => `${p.partName}${p.quantity > 1 ? ` (x${p.quantity})` : ""}`)
      .join(", ");
    sceneParts.push(`Parts visible: ${partsList}.`);
  }

  // Tools shown
  const tools = raw?.toolsShown ?? step.tools;
  if (tools.length > 0) {
    sceneParts.push(
      `Tools in use: ${tools.map((t) => t.toolName).join(", ")}.`
    );
  }

  // Spatial details
  if (raw?.spatialDetails.orientation) {
    sceneParts.push(`Orientation: ${raw.spatialDetails.orientation}.`);
  }
  if (raw?.spatialDetails.alignmentNotes) {
    sceneParts.push(`Alignment: ${raw.spatialDetails.alignmentNotes}.`);
  }

  // Actions depicted
  if (raw && raw.actions.length > 0) {
    const actionDescs = raw.actions.map((a) => {
      let desc = `${a.subject} being ${a.actionType}ed`;
      if (a.target) desc += ` onto/into ${a.target}`;
      if (a.direction) desc += ` (direction: ${a.direction})`;
      return desc;
    });
    sceneParts.push(`Show: ${actionDescs.join("; ")}.`);
  }

  // Arrow indicators for assembly direction
  if (raw && raw.arrows.length > 0) {
    const motionArrows = raw.arrows.filter((a) => a.indicatesMotion);
    if (motionArrows.length > 0) {
      const arrowDescs = motionArrows.map((a) => {
        let desc = `${a.direction} arrow`;
        if (a.label) desc += ` labeled "${a.label}"`;
        return desc;
      });
      sceneParts.push(
        `Include directional arrows: ${arrowDescs.join(", ")}.`
      );
    }
  }

  // Fastener details
  if (raw && raw.fasteners.length > 0) {
    const fastenerDescs = raw.fasteners.map((f) => {
      let desc = f.type;
      if (f.rotation !== "none") desc += ` with ${f.rotation} rotation`;
      return desc;
    });
    sceneParts.push(
      `Fasteners: ${fastenerDescs.join(", ")}. Show them clearly.`
    );
  }

  // Complexity-specific guidance
  if (step.complexity === "complex") {
    sceneParts.push(
      "Use an exploded/separated view to show how parts connect. Include subtle motion arrows showing assembly direction. Show fine details clearly."
    );
  } else {
    sceneParts.push(
      "Keep the illustration simple and clear. Show the main action from a clear isometric angle."
    );
  }

  return `${stylePreamble}\n\n${sceneParts.join("\n")}`;
}

// ─── Gemini Image Generation API ───

interface GeminiImageResponse {
  imageBuffer: Buffer;
  mimeType: "image/png" | "image/jpeg";
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

async function callGeminiImageGeneration(
  prompt: string,
  model: string,
  apiKey: string
): Promise<GeminiImageResponse> {
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
          responseModalities: ["IMAGE", "TEXT"],
          temperature: 0.4,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Gemini image generation error (${response.status}): ${error}`
    );
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];

  if (!candidate?.content?.parts) {
    throw new Error("Gemini image generation returned no content");
  }

  // Find the image part in the response
  const imagePart = candidate.content.parts.find(
    (part: { inlineData?: { mimeType: string; data: string } }) =>
      part.inlineData?.mimeType?.startsWith("image/")
  );

  if (!imagePart?.inlineData) {
    throw new Error(
      "Gemini image generation returned no image data. Response parts: " +
        candidate.content.parts
          .map(
            (p: { text?: string; inlineData?: { mimeType: string } }) =>
              p.text ? "text" : p.inlineData?.mimeType ?? "unknown"
          )
          .join(", ")
    );
  }

  const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
  const mimeType = imagePart.inlineData.mimeType.includes("jpeg")
    ? ("image/jpeg" as const)
    : ("image/png" as const);

  return {
    imageBuffer,
    mimeType,
    model,
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    },
  };
}

// ─── Single Step Illustration ───

/**
 * Generate an illustration for a single assembly step.
 */
export async function generateStepIllustration(
  step: GeneratedStep,
  productName: string,
  costTracker: CostTracker,
  options: IllustrationOptions = {}
): Promise<IllustrationResult> {
  // Classify complexity for model routing
  const complexity = classifyComplexityForIllustration(step);

  // Select model
  const model = options.modelOverride ?? selectIllustrationModel(complexity);

  // Build prompt
  const prompt = buildIllustrationPrompt(step, productName);

  // Store the prompt on the step for reference
  step.illustrationPrompt = prompt;

  // Dry run: return prompt without calling API
  if (options.dryRun) {
    return {
      imageBuffer: Buffer.alloc(0),
      mimeType: "image/png",
      modelUsed: model,
      promptUsed: prompt,
    };
  }

  // Get API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY for illustration generation");
  }

  // Rate limit
  const rateLimiter = getRateLimiter("gemini");
  await rateLimiter.acquire();

  // Call the API
  const result = await callGeminiImageGeneration(prompt, model, apiKey);

  // Track cost
  costTracker.record(
    model,
    result.usage.inputTokens,
    result.usage.outputTokens,
    `illustration_step_${step.stepNumber}_${complexity}`
  );

  return {
    imageBuffer: result.imageBuffer,
    mimeType: result.mimeType,
    modelUsed: model,
    promptUsed: prompt,
  };
}

// ─── Batch Illustration Generation ───

/**
 * Generate illustrations for all steps in a guide.
 * Processes steps sequentially to respect rate limits.
 * Skips step 0 (parts overview) and continues on individual failures.
 */
export async function generateIllustrationsForGuide(
  steps: GeneratedStep[],
  productName: string,
  costTracker: CostTracker,
  options: IllustrationOptions = {}
): Promise<IllustrationBatchResult> {
  const illustrations = new Map<number, IllustrationResult>();
  const failures: Array<{ stepNumber: number; error: string }> = [];
  const skipped: number[] = [];

  for (const step of steps) {
    // Skip parts overview pages (step 0)
    if (step.stepNumber === 0) {
      skipped.push(step.stepNumber);
      continue;
    }

    try {
      const result = await generateStepIllustration(
        step,
        productName,
        costTracker,
        options
      );
      illustrations.set(step.stepNumber, result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[illustration] Failed to generate illustration for step ${step.stepNumber}: ${message}`
      );
      failures.push({ stepNumber: step.stepNumber, error: message });
    }
  }

  return { illustrations, failures, skipped };
}
