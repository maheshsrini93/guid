"use client";

import { useSession } from "next-auth/react";
import type { SubscriptionTier } from "@/lib/stripe-config";

interface UseSubscriptionResult {
  tier: SubscriptionTier;
  isPremium: boolean;
  isLoading: boolean;
}

/**
 * Client-side hook to read subscription tier from the NextAuth session.
 * Use for UI gating only — server-side checks are authoritative.
 */
export function useSubscription(): UseSubscriptionResult {
  const { data: session, status } = useSession();

  const tier =
    ((session?.user as unknown as { subscriptionTier?: string })
      ?.subscriptionTier as SubscriptionTier) ?? "free";

  return {
    tier,
    isPremium: tier === "premium",
    isLoading: status === "loading",
  };
}
