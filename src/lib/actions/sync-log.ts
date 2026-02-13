"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as unknown as { role: string }).role;
  if (role !== "admin") throw new Error("Not authorized");
  return session.user;
}

/**
 * Get the last N sync results for the dashboard.
 */
export async function getRecentSyncLogs(limit = 10) {
  await requireAdmin();

  const logs = await prisma.catalogSyncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return logs;
}

/**
 * Get sync summary stats for the dashboard.
 */
export async function getSyncSummary() {
  await requireAdmin();

  const [lastSync, totalProducts, guideCoverage, newThisMonth] =
    await Promise.all([
      prisma.catalogSyncLog.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, newProducts: true, errors: true },
      }),
      prisma.product.count(),
      prisma.product.count({
        where: { guide_status: "published" },
      }),
      prisma.product.count({
        where: { is_new: true },
      }),
    ]);

  return {
    lastSyncDate: lastSync?.createdAt ?? null,
    lastSyncNewProducts: lastSync?.newProducts ?? 0,
    lastSyncErrors: lastSync?.errors ?? 0,
    totalProducts,
    publishedGuides: guideCoverage,
    guideCoveragePercent:
      totalProducts > 0
        ? Math.round((guideCoverage / totalProducts) * 100 * 10) / 10
        : 0,
    newProductsThisMonth: newThisMonth,
  };
}
