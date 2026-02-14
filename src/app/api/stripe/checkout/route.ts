import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { STRIPE_PRICES, type BillingInterval } from "@/lib/stripe-config";

const checkoutSchema = z.object({
  // Accept either a billing interval (preferred) or a raw priceId (backward compat)
  interval: z.enum(["monthly", "annual"]).optional(),
  priceId: z.string().min(1).optional(),
}).refine((data) => data.interval || data.priceId, {
  message: "Either interval or priceId is required",
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as { id: string; email: string };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Resolve the Stripe price ID from interval (preferred) or use raw priceId
  let priceId: string;
  if (parsed.data.interval) {
    priceId = STRIPE_PRICES[parsed.data.interval as BillingInterval];
  } else {
    priceId = parsed.data.priceId!;
  }

  // Validate the price ID is one of our known prices
  const validPriceIds = Object.values(STRIPE_PRICES);
  if (!validPriceIds.includes(priceId)) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId: user.id },
    success_url: `${origin}/account/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
