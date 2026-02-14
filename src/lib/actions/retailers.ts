"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as unknown as { role: string }).role;
  if (role !== "admin") throw new Error("Not authorized");
  return session.user;
}

/** Toggle a retailer's active/inactive status. */
export async function toggleRetailerActive(retailerId: string) {
  await requireAdmin();

  const retailer = await prisma.retailer.findUnique({
    where: { id: retailerId },
    select: { id: true, isActive: true },
  });

  if (!retailer) throw new Error("Retailer not found");

  await prisma.retailer.update({
    where: { id: retailerId },
    data: { isActive: !retailer.isActive },
  });

  revalidatePath("/studio/retailers");
}

/** Trigger a manual catalog sync for a retailer. */
export async function triggerRetailerSync(retailerId: string) {
  await requireAdmin();

  const retailer = await prisma.retailer.findUnique({
    where: { id: retailerId },
    select: { id: true, slug: true, isActive: true },
  });

  if (!retailer) throw new Error("Retailer not found");
  if (!retailer.isActive) throw new Error("Cannot sync an inactive retailer");

  // Update lastSyncAt timestamp
  await prisma.retailer.update({
    where: { id: retailerId },
    data: { lastSyncAt: new Date() },
  });

  // Create a sync log entry
  await prisma.catalogSyncLog.create({
    data: {
      retailer: retailer.slug,
      triggeredBy: "manual",
    },
  });

  revalidatePath("/studio/retailers");
  revalidatePath("/studio/catalog-sync");

  return { success: true, retailerSlug: retailer.slug };
}

/** Update retailer configuration (rate limits, affiliate config). */
export async function updateRetailerConfig(
  retailerId: string,
  data: {
    rateLimitConfig?: { requestsPerMinute: number; requestsPerDay: number };
    affiliateConfig?: Record<string, string>;
  }
) {
  await requireAdmin();

  const retailer = await prisma.retailer.findUnique({
    where: { id: retailerId },
    select: { id: true },
  });

  if (!retailer) throw new Error("Retailer not found");

  await prisma.retailer.update({
    where: { id: retailerId },
    data: {
      ...(data.rateLimitConfig !== undefined && {
        rateLimitConfig: data.rateLimitConfig,
      }),
      ...(data.affiliateConfig !== undefined && {
        affiliateConfig: data.affiliateConfig,
      }),
    },
  });

  revalidatePath("/studio/retailers");
}
