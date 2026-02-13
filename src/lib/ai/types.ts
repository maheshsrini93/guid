// ─── AI Guide Generation: Structured Output Schema ───
// Contract between the AI pipeline and the database.
// Vision models produce GeneratedGuide; the pipeline validates and stores it.

/** Confidence score from 0 to 1 (0 = no confidence, 1 = fully confident) */
export type Confidence = number;

/** A single part referenced in a step */
export interface PartReference {
  partNumber: string; // e.g., "104321"
  partName: string; // e.g., "Wooden dowel"
  quantity: number;
}

/** A tool needed for a step */
export interface ToolReference {
  toolName: string; // e.g., "Phillips screwdriver"
  toolIcon?: string; // Lucide icon name (optional)
}

/** A warning or tip attached to a step */
export interface StepCallout {
  type: "warning" | "tip" | "info";
  text: string;
}

/** Screw/fastener direction indicator */
export type RotationDirection = "clockwise" | "counter_clockwise" | "none";

/** Complexity classification for illustration routing */
export type StepComplexity = "simple" | "complex";

// ─── Raw Visual Extraction Types (Pass 1 output) ───

/** An action depicted on a PDF page */
export interface VisualAction {
  actionType: string; // e.g., "insert", "attach", "rotate", "tighten", "align", "flip"
  subject: string; // what is being moved/acted on (e.g., "Side panel (A)")
  target: string; // where it goes or what it interacts with (e.g., "Pre-drilled holes in base panel (B)")
  direction?: string; // movement direction if shown (e.g., "push downward", "slide left-to-right")
}

/** Fastener detail observed on a PDF page */
export interface FastenerDetail {
  type: string; // e.g., "cam lock", "wooden dowel", "screw", "bolt", "nail"
  partId?: string; // part number if visible
  rotation: RotationDirection; // rotation shown in diagram
  notes?: string; // e.g., "quarter-turn to lock", "do not overtighten"
}

/** Arrow or direction annotation on a PDF page */
export interface ArrowAnnotation {
  direction: string; // e.g., "downward", "clockwise", "toward viewer", "left-to-right"
  label?: string; // text label near the arrow if any
  indicatesMotion: boolean; // true if arrow shows assembly motion, false if just a callout pointer
}

/** Raw visual extraction for a single step/panel from one PDF page */
export interface RawStepExtraction {
  stepNumber: number; // step number shown in diagram, 0 for parts/tools pages
  rawDescription: string; // factual observation of what is shown (not narrative prose)
  partsShown: PartReference[]; // parts visible on this page for this step
  toolsShown: ToolReference[]; // tools shown/implied
  actions: VisualAction[]; // actions depicted
  spatialDetails: {
    orientation?: string; // e.g., "Product laid on side, back panel facing up"
    alignmentNotes?: string; // e.g., "Holes in panel A align with holes in panel B edge"
  };
  arrows: ArrowAnnotation[];
  fasteners: FastenerDetail[];
  annotations: string[]; // other text/symbols visible (e.g., "x4", "click sound icon", "two-person icon")
  warnings: string[]; // safety/caution icons or text observed
  complexity: StepComplexity;
  confidence: Confidence;
}

/** Full raw extraction output for one PDF page (Pass 1 result) */
export interface RawPageExtraction {
  steps: RawStepExtraction[];
  pageIndicators: {
    arrowCount: number;
    hasHingeOrRotation: boolean;
    hasFastenerAmbiguity: boolean;
    isPartsPage: boolean;
  };
}

// ─── Generated Step (final output, populated by Pass 2) ───

/** A single generated assembly step */
export interface GeneratedStep {
  stepNumber: number;
  title: string;
  instruction: string; // narrative instruction text (populated by Pass 2, factual summary by default)
  parts: PartReference[];
  tools: ToolReference[];
  callouts: StepCallout[];
  screwDirection: RotationDirection;
  complexity: StepComplexity;
  confidence: Confidence;
  sourcePdfPage: number; // which PDF page this step came from
  rawExtraction?: RawStepExtraction; // raw visual data from Pass 1 (consumed by Pass 2)
  illustrationPrompt?: string; // prompt to generate the illustration
  illustrationUrl?: string; // populated after illustration generation
}

/** Summary of all tools needed for the full guide */
export interface ToolSummary {
  required: ToolReference[];
  optional: ToolReference[];
}

/** Summary of all parts in the guide */
export interface PartsSummary {
  parts: PartReference[];
  totalPartCount: number;
}

/** The complete output of the AI generation pipeline for one product */
export interface GeneratedGuide {
  productId: number;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedTimeMinutes: number;
  tools: ToolSummary;
  parts: PartsSummary;
  steps: GeneratedStep[];
  overallConfidence: Confidence;
  qualityFlags: QualityFlag[];
  metadata: GenerationMetadata;
}

/** Quality flags raised during automated quality checks */
export interface QualityFlag {
  code: QualityFlagCode;
  message: string;
  severity: "error" | "warning" | "info";
  stepNumber?: number; // null = guide-level flag
}

export type QualityFlagCode =
  | "step_count_mismatch" // steps don't match PDF page count
  | "missing_parts" // parts referenced but not in parts list
  | "missing_tools" // tools used but not in tool summary
  | "low_confidence_step" // individual step below threshold
  | "sequence_gap" // step numbers aren't sequential
  | "duplicate_step" // near-identical steps detected
  | "no_warnings" // safety-critical product with no warnings
  | "orientation_uncertain" // AI unsure about part orientation
  | "illustration_missing" // step has no illustration when illustrations were expected
  | "high_low_confidence_ratio" // too many low-confidence steps in the guide
  | "part_sequence_error"; // step references a part not introduced in prior steps

/** Metadata about the generation process itself */
export interface GenerationMetadata {
  primaryModel: string;
  secondaryModel?: string;
  pdfPageCount: number;
  processingTimeMs: number;
  pdfUrl: string;
  generatedAt: string; // ISO timestamp
}

/** Result from extracting a single PDF page */
export interface ExtractedPdfPage {
  pageNumber: number;
  imageBuffer: Buffer;
  width: number;
  height: number;
  mimeType: "image/png" | "image/jpeg";
}

/** Result from the full PDF extraction */
export interface PdfExtractionResult {
  pages: ExtractedPdfPage[];
  totalPages: number;
  pdfUrl: string;
}

/** Provider-agnostic vision analysis request */
export interface VisionAnalysisRequest {
  image: Buffer;
  mimeType: "image/png" | "image/jpeg";
  prompt: string;
  maxTokens?: number;
}

/** Provider-agnostic vision analysis response */
export interface VisionAnalysisResponse {
  content: string; // raw text response
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/** Supported AI providers */
export type AIProvider = "gemini" | "openai";

/** Configuration for an AI provider */
export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}
