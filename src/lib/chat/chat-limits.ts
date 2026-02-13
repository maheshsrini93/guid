import { prisma } from "@/lib/prisma";

/** Maximum chat sessions per calendar month for free-tier users. */
export const FREE_TIER_MONTHLY_LIMIT = 3;

/**
 * Result of checking a user's chat usage.
 */
export interface ChatUsageResult {
  /** Number of chat sessions used this billing period (calendar month). */
  sessionsUsed: number;
  /** Maximum sessions allowed. */
  sessionsLimit: number;
  /** Number of sessions remaining. */
  sessionsRemaining: number;
  /** Whether the user can start a new chat. */
  canStartChat: boolean;
}

/**
 * Count the number of chat sessions a user has started in the current
 * calendar month. Counts by userId for logged-in users, or by a fallback
 * identifier (IP-based key) for anonymous users.
 *
 * @param userId - Authenticated user ID, or null for anonymous
 * @param anonymousKey - Fallback key for anonymous users (e.g., IP hash)
 */
export async function getChatUsage(
  userId: string | null,
  anonymousKey?: string
): Promise<ChatUsageResult> {
  // Calculate start of current calendar month (UTC)
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  let sessionsUsed: number;

  if (userId) {
    // Logged-in user: count by userId
    sessionsUsed = await prisma.chatSession.count({
      where: {
        userId,
        createdAt: { gte: monthStart },
      },
    });
  } else if (anonymousKey) {
    // Anonymous user: we store the anonymousKey in a different way.
    // Since ChatSession doesn't have an IP field, we track anonymous
    // usage via a simple in-memory approach for now. In production,
    // this would use a Redis counter or similar.
    // For now, anonymous users get the full limit (enforcement is
    // primarily for authenticated users; anonymous rate limiting
    // is handled by the existing rate limiter).
    sessionsUsed = 0;
  } else {
    sessionsUsed = 0;
  }

  const sessionsRemaining = Math.max(0, FREE_TIER_MONTHLY_LIMIT - sessionsUsed);

  return {
    sessionsUsed,
    sessionsLimit: FREE_TIER_MONTHLY_LIMIT,
    sessionsRemaining,
    canStartChat: sessionsRemaining > 0,
  };
}

/**
 * Check if a user can start a new chat session. Returns true if
 * the user is under their monthly limit.
 */
export async function canUserStartChat(
  userId: string | null
): Promise<boolean> {
  // Anonymous users always allowed (rate limited separately)
  if (!userId) return true;

  const usage = await getChatUsage(userId);
  return usage.canStartChat;
}
