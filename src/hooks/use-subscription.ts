"use client";

import { useSession } from "next-auth/react";
import type { SubscriptionTier } from "@/lib/stripe-config";

interface UseSubscriptionResult {
  tier: SubscriptionTier;
  isPremium: boolean;
  isLoading: boolean;
  subscriptionEndsAt: string | null;
}

/**
 * Client-side hook to read subscription tier from the NextAuth session.
 * Use for UI gating only — server-side checks are authoritative.
 */
export function useSubscription(): UseSubscriptionResult {
  const { data: session, status } = useSession();

  const user = session?.user as unknown as {
    subscriptionTier?: string;
    subscriptionEndsAt?: string;
  } | undefined;

  const tier = (user?.subscriptionTier as SubscriptionTier) ?? "free";
  const subscriptionEndsAt = user?.subscriptionEndsAt ?? null;
  const isExpired = subscriptionEndsAt ? new Date(subscriptionEndsAt) < new Date() : false;

  return {
    tier,
    isPremium: tier === "premium" && !isExpired,
    isLoading: status === "loading",
    subscriptionEndsAt,
  };
}
