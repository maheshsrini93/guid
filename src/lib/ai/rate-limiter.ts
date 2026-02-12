/**
 * Token-bucket rate limiter for AI API providers.
 * Prevents exceeding per-minute request quotas for Gemini and OpenAI.
 */

export interface RateLimitConfig {
  /** Maximum requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds (default: 60_000 = 1 minute) */
  windowMs: number;
}

/** Default rate limits per provider (conservative — can be overridden) */
export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  gemini: { maxRequests: 15, windowMs: 60_000 },   // Free tier: 15 RPM
  openai: { maxRequests: 30, windowMs: 60_000 },    // Tier 1: varies, 30 is safe
};

/**
 * Sliding-window rate limiter.
 * Tracks request timestamps and blocks/delays when the limit is reached.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /** Remove expired timestamps outside the current window */
  private prune(): void {
    const cutoff = Date.now() - this.config.windowMs;
    this.timestamps = this.timestamps.filter((t) => t > cutoff);
  }

  /** Check how many requests are available right now */
  available(): number {
    this.prune();
    return Math.max(0, this.config.maxRequests - this.timestamps.length);
  }

  /** Check if a request can be made right now without waiting */
  canProceed(): boolean {
    return this.available() > 0;
  }

  /**
   * How long (ms) until the next request slot opens.
   * Returns 0 if a slot is available now.
   */
  waitTime(): number {
    this.prune();
    if (this.timestamps.length < this.config.maxRequests) {
      return 0;
    }
    // Oldest timestamp in the window — wait until it expires
    const oldest = this.timestamps[0];
    return Math.max(0, oldest + this.config.windowMs - Date.now());
  }

  /**
   * Record a request. Call this after successfully making an API call.
   */
  record(): void {
    this.timestamps.push(Date.now());
  }

  /**
   * Wait until a request slot is available, then record it.
   * Use this before making an API call to ensure rate compliance.
   */
  async acquire(): Promise<void> {
    const wait = this.waitTime();
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    this.record();
  }

  /** Reset the limiter (e.g., after a long pause) */
  reset(): void {
    this.timestamps = [];
  }
}

/**
 * Registry of rate limiters keyed by provider name.
 * Ensures a single limiter instance per provider across the app.
 */
const limiters = new Map<string, RateLimiter>();

/**
 * Get or create a rate limiter for a given provider.
 * Uses default limits unless overridden.
 */
export function getRateLimiter(
  provider: string,
  config?: RateLimitConfig
): RateLimiter {
  const existing = limiters.get(provider);
  if (existing) return existing;

  const limiterConfig =
    config ?? DEFAULT_RATE_LIMITS[provider] ?? { maxRequests: 10, windowMs: 60_000 };
  const limiter = new RateLimiter(limiterConfig);
  limiters.set(provider, limiter);
  return limiter;
}
