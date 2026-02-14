// Stripe price IDs — configured in Stripe Dashboard, referenced via env vars.
// Test mode and production mode have different IDs.
export const STRIPE_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  annual: process.env.STRIPE_PRICE_ANNUAL!,
} as const;

export type BillingInterval = "monthly" | "annual";

export type SubscriptionTier = "free" | "premium";

export interface PlanDefinition {
  tier: SubscriptionTier;
  name: string;
  description: string;
  priceDisplay: Record<BillingInterval, string>;
  features: string[];
}

export const PLANS: Record<SubscriptionTier, PlanDefinition> = {
  free: {
    tier: "free",
    name: "Free",
    description: "Everything you need to get started",
    priceDisplay: {
      monthly: "$0",
      annual: "$0",
    },
    features: [
      "Step-by-step assembly guides",
      "Community access",
      "3 AI troubleshooting chats/month",
      "Basic search and browsing",
    ],
  },
  premium: {
    tier: "premium",
    name: "Premium",
    description: "For power users who want it all",
    priceDisplay: {
      monthly: "$9.99/mo",
      annual: "$99/yr",
    },
    features: [
      "Everything in Free",
      "Unlimited AI troubleshooting chats",
      "Photo diagnosis for issues",
      "Video guides from creators",
      "Offline guide access",
      "Ad-free experience",
      "Priority AI responses",
    ],
  },
};

/** Map a Stripe Price ID back to its billing interval */
export function intervalForPriceId(priceId: string): BillingInterval | null {
  if (priceId === STRIPE_PRICES.monthly) return "monthly";
  if (priceId === STRIPE_PRICES.annual) return "annual";
  return null;
}
