/**
 * Simple in-memory sliding window rate limiter for API routes.
 * For production at scale, replace with @upstash/ratelimit + Redis.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check and consume a rate limit token for the given identifier.
 * Returns whether the request should be allowed.
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  cleanup(config.windowMs);

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  const remaining = Math.max(0, config.limit - entry.timestamps.length);
  const oldestInWindow = entry.timestamps[0] ?? now;
  const reset = oldestInWindow + config.windowMs;

  if (entry.timestamps.length >= config.limit) {
    return { success: false, limit: config.limit, remaining: 0, reset };
  }

  entry.timestamps.push(now);
  return {
    success: true,
    limit: config.limit,
    remaining: remaining - 1,
    reset,
  };
}

/** Pre-configured rate limit configs for different route types */
export const RATE_LIMITS = {
  /** Auth endpoints: 10 requests per minute per IP */
  auth: { limit: 10, windowMs: 60 * 1000 },
  /** Registration: 3 requests per minute per IP */
  register: { limit: 3, windowMs: 60 * 1000 },
  /** General API: 60 requests per minute per IP */
  api: { limit: 60, windowMs: 60 * 1000 },
  /** AI generation: 5 requests per minute per user */
  aiGeneration: { limit: 5, windowMs: 60 * 1000 },
  /** Chat messages: 20 requests per minute per user/IP */
  chat: { limit: 20, windowMs: 60 * 1000 },
} as const;

/**
 * Extract client IP from request headers.
 * Works with Vercel, Cloudflare, and direct connections.
 */
export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers);
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
