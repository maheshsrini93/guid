import { prisma } from "@/lib/prisma";
import type { SubscriptionTier } from "@/lib/stripe-config";

interface SubscriptionInfo {
  tier: SubscriptionTier;
  subscriptionEndsAt: Date | null;
  isActive: boolean;
}

/** Fetch a user's subscription tier and expiry from the database. */
export async function getUserSubscription(
  userId: string
): Promise<SubscriptionInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, subscriptionEndsAt: true },
  });

  if (!user) {
    return { tier: "free", subscriptionEndsAt: null, isActive: false };
  }

  const tier = user.subscriptionTier as SubscriptionTier;
  const isActive =
    tier === "premium" &&
    user.subscriptionEndsAt !== null &&
    user.subscriptionEndsAt > new Date();

  return {
    tier: isActive ? "premium" : "free",
    subscriptionEndsAt: user.subscriptionEndsAt,
    isActive,
  };
}

/** Returns true if the user has an active premium subscription. */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const { isActive } = await getUserSubscription(userId);
  return isActive;
}

/** Throws an error if the user does not have an active premium subscription. */
export async function requirePremium(userId: string): Promise<void> {
  const isPremium = await isPremiumUser(userId);
  if (!isPremium) {
    throw new Error("Premium subscription required");
  }
}
