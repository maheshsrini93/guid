/**
 * Cost estimation and tracking for AI API usage.
 * Tracks per-call and cumulative costs for generation jobs.
 */

/** Cost per 1M tokens (input and output) for each model */
export interface ModelPricing {
  inputPer1M: number;   // USD per 1M input tokens
  outputPer1M: number;  // USD per 1M output tokens
}

/**
 * Known model pricing as of 2025.
 * Update these when pricing changes.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Gemini models
  "gemini-2.0-flash": { inputPer1M: 0.10, outputPer1M: 0.40 },
  "gemini-2.0-flash-lite": { inputPer1M: 0.075, outputPer1M: 0.30 },
  "gemini-2.5-flash": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10.00 },
  // Nano Banana (illustration generation — priced per image, not per token)
  "gemini-2.5-flash-image": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "gemini-3-pro-image-preview": { inputPer1M: 1.25, outputPer1M: 10.00 },

  // OpenAI models
  "gpt-4o": { inputPer1M: 2.50, outputPer1M: 10.00 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.60 },
  "gpt-4.1": { inputPer1M: 2.00, outputPer1M: 8.00 },
  "gpt-4.1-mini": { inputPer1M: 0.40, outputPer1M: 1.60 },
  "gpt-4.1-nano": { inputPer1M: 0.10, outputPer1M: 0.40 },
};

/** A single API call cost record */
export interface CostEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  timestamp: number;
  label?: string; // e.g., "vision_analysis", "illustration"
}

/**
 * Calculate the cost of a single API call.
 * Returns 0 if the model is unknown (logs a warning).
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    console.warn(`[cost-tracker] Unknown model pricing: ${model}. Cost set to $0.`);
    return 0;
  }
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}

/**
 * Tracks cumulative costs for a generation job or session.
 * Create one per AI generation job to monitor spend.
 */
export class CostTracker {
  private entries: CostEntry[] = [];
  readonly jobId?: string;

  constructor(jobId?: string) {
    this.jobId = jobId;
  }

  /**
   * Record a completed API call with its token usage.
   */
  record(
    model: string,
    inputTokens: number,
    outputTokens: number,
    label?: string
  ): CostEntry {
    const costUsd = calculateCost(model, inputTokens, outputTokens);
    const entry: CostEntry = {
      model,
      inputTokens,
      outputTokens,
      costUsd,
      timestamp: Date.now(),
      label,
    };
    this.entries.push(entry);
    return entry;
  }

  /** Total cost of all recorded calls in USD */
  get totalCostUsd(): number {
    return this.entries.reduce((sum, e) => sum + e.costUsd, 0);
  }

  /** Total input tokens across all calls */
  get totalInputTokens(): number {
    return this.entries.reduce((sum, e) => sum + e.inputTokens, 0);
  }

  /** Total output tokens across all calls */
  get totalOutputTokens(): number {
    return this.entries.reduce((sum, e) => sum + e.outputTokens, 0);
  }

  /** Number of API calls recorded */
  get callCount(): number {
    return this.entries.length;
  }

  /** Get all entries */
  get allEntries(): readonly CostEntry[] {
    return this.entries;
  }

  /** Get a summary suitable for storing in the AIGenerationJob record */
  summary(): {
    totalCostUsd: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    callCount: number;
    breakdown: Array<{ model: string; calls: number; costUsd: number }>;
  } {
    const byModel = new Map<string, { calls: number; costUsd: number }>();
    for (const entry of this.entries) {
      const existing = byModel.get(entry.model) ?? { calls: 0, costUsd: 0 };
      existing.calls++;
      existing.costUsd += entry.costUsd;
      byModel.set(entry.model, existing);
    }

    return {
      totalCostUsd: this.totalCostUsd,
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      callCount: this.callCount,
      breakdown: Array.from(byModel.entries()).map(([model, data]) => ({
        model,
        ...data,
      })),
    };
  }

  /** Reset all tracked entries */
  reset(): void {
    this.entries = [];
  }
}
