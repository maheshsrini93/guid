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

/** A single generated assembly step */
export interface GeneratedStep {
  stepNumber: number;
  title: string;
  instruction: string;
  parts: PartReference[];
  tools: ToolReference[];
  callouts: StepCallout[];
  screwDirection: RotationDirection;
  complexity: StepComplexity;
  confidence: Confidence;
  sourcePdfPage: number; // which PDF page this step came from
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
  | "orientation_uncertain"; // AI unsure about part orientation

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
