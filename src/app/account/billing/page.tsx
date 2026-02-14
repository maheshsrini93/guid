import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserSubscription } from "@/lib/subscription";
import { PLANS } from "@/lib/stripe-config";
import { BillingContent } from "./billing-content";

export const metadata: Metadata = {
  title: "Billing",
  description: "Manage your Guid subscription and billing details.",
  robots: { index: false },
};

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/account/billing");
  }

  const userId = (session.user as unknown as { id: string }).id;
  const subscription = await getUserSubscription(userId);
  const plan = PLANS[subscription.tier];

  return (
    <BillingContent
      planName={plan.name}
      planDescription={plan.description}
      features={plan.features}
      isActive={subscription.isActive}
      renewsAt={subscription.subscriptionEndsAt?.toISOString() ?? null}
    />
  );
}
