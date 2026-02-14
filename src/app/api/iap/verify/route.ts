import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";

const verifySchema = z.object({
  platform: z.enum(["apple", "google"]),
  receipt: z.string().min(1),
  productId: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await verifyMobileToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { platform, receipt, productId } = parsed.data;

  // Production guard: real receipt verification is not yet implemented.
  // Block in production to prevent free premium access via fake receipts.
  if (process.env.NODE_ENV === "production" && !process.env.IAP_VERIFICATION_ENABLED) {
    console.warn(
      `[IAP Verify] Blocked in production — real receipt verification not configured. platform=${platform} userId=${user.userId}`
    );
    return NextResponse.json(
      { error: "In-app purchase verification is not yet available" },
      { status: 503 }
    );
  }

  // TODO: Implement real receipt verification:
  // - Apple: Use App Store Server API v2 (https://developer.apple.com/documentation/appstoreserverapi)
  // - Google: Use Google Play Developer API (androidpublisher.purchases.subscriptions.get)
  // For development, log the receipt and grant premium access.

  console.log(
    `[IAP Verify] DEV MODE — platform=${platform} productId=${productId} userId=${user.userId} receiptLen=${receipt.length}`
  );

  const isAnnual = productId === "guid_premium_annual";

  // Grant premium subscription (development only)
  await prisma.user.update({
    where: { id: user.userId },
    data: {
      subscriptionTier: "premium",
      subscriptionSource: platform,
      subscriptionEndsAt: isAnnual
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({
    success: true,
    subscriptionTier: "premium",
    subscriptionSource: platform,
  });
}
