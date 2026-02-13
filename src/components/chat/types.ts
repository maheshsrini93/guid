export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  imageUrl?: string | null;
  createdAt: Date;
}

export interface ChatSessionData {
  id: string;
  productId?: number | null;
  status: "active" | "resolved" | "abandoned";
  resolution?: string | null;
  createdAt: Date;
}

// --- Diagnostic intake types ---

export type IntakePhase =
  | "product"
  | "category"
  | "timing"
  | "photo"
  | "complete";

export interface IntakeOption {
  label: string;
  value: string;
  icon?: string;
}

export const PROBLEM_CATEGORIES: IntakeOption[] = [
  { label: "Wobbling / unstable", value: "wobbling" },
  { label: "Missing part", value: "missing_part" },
  { label: "Something broke", value: "broke" },
  { label: "Won't close / open", value: "wont_move" },
  { label: "Other", value: "other" },
];

export const TIMING_OPTIONS: IntakeOption[] = [
  { label: "Just happened", value: "just_happened" },
  { label: "Gradual over time", value: "gradual" },
  { label: "After a move", value: "after_move" },
  { label: "Not sure", value: "unknown" },
];

export interface DiagnosticAnswers {
  productQuery?: string;
  category?: string;
  timing?: string;
  imageUrl?: string | null;
}

// --- Chat panel state ---

export interface ChatPanelState {
  messages: ChatMessage[];
  sessionId: string | null;
  isStreaming: boolean;
  intakePhase: IntakePhase;
  intakeAnswers: DiagnosticAnswers;
  attachedImage: File | null;
  attachedImagePreview: string | null;
}

// --- Product context for pre-loaded chat ---

export interface ChatProductContext {
  productId: number;
  articleNumber: string;
  productName: string;
  imageUrl?: string | null;
}
