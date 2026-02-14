import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
  }
  return secret;
}

export async function POST(request: NextRequest) {
  const webhookSecret = getWebhookSecret();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }
    default:
      // Unhandled event type — acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("Checkout session missing userId metadata:", session.id);
    return;
  }

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!subscriptionId || !customerId) {
    console.error("Checkout session missing subscription/customer:", session.id);
    return;
  }

  // Fetch the full subscription with items to get the current period end
  // In Stripe API 2026-01-28, current_period_end moved from Subscription to SubscriptionItem
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data"],
  });

  const firstItem = subscription.items?.data?.[0];
  const periodEnd = firstItem?.current_period_end;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: "premium",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!user) {
    console.error("No user found for subscription:", subscription.id);
    return;
  }

  const isActive =
    subscription.status === "active" || subscription.status === "trialing";

  // In Stripe API 2026-01-28, current_period_end is on SubscriptionItem
  const firstItem = subscription.items?.data?.[0];
  const periodEnd = firstItem?.current_period_end;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: isActive ? "premium" : "free",
      subscriptionEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!user) {
    console.error("No user found for subscription:", subscription.id);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: "free",
      stripeSubscriptionId: null,
      subscriptionEndsAt: null,
    },
  });
}
