import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";

const restoreSchema = z.object({
  platform: z.enum(["apple", "google"]),
  receipts: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request) {
  const user = await verifyMobileToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = restoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { platform, receipts } = parsed.data;

  // TODO: Implement real receipt verification for each receipt:
  // - Apple: Validate each receipt with App Store Server API
  // - Google: Check each receipt with Google Play Developer API
  // For now, check if user already has an active subscription.

  console.log(
    `[IAP Restore] platform=${platform} userId=${user.userId} receiptsCount=${receipts.length}`
  );

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: {
      subscriptionTier: true,
      subscriptionSource: true,
      subscriptionEndsAt: true,
    },
  });

  const isActive =
    dbUser?.subscriptionTier === "premium" &&
    dbUser.subscriptionEndsAt &&
    dbUser.subscriptionEndsAt > new Date();

  return NextResponse.json({
    restored: isActive ?? false,
    subscriptionTier: isActive ? "premium" : "free",
  });
}
