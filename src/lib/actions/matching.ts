"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runExactMatching, matchProductExact } from "@/lib/matching/exact-matcher";
import { runFuzzyMatching, matchProductFuzzy } from "@/lib/matching/fuzzy-matcher";
import type { MatchRunSummary, FuzzyMatchCandidate } from "@/lib/matching/types";

/**
 * Run the full cross-retailer matching pipeline.
 *
 * 1. Exact matching (SKU, UPC/EAN) — confidence 1.0
 * 2. Fuzzy matching (name + dimensions) — variable confidence
 *
 * Admin-only action, callable from Studio matching dashboard.
 */
export async function runMatchingPipeline(): Promise<
  | { success: true; summary: MatchRunSummary; reviewCandidates: FuzzyMatchCandidate[] }
  | { error: string }
> {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as unknown as { role: string }).role !== "admin"
  ) {
    return { error: "Unauthorized" };
  }

  const start = Date.now();

  const unmatchedCount = await prisma.product.count({
    where: { matchGroupId: null },
  });

  // Phase 1: Exact matching
  const exactResults = await runExactMatching();

  // Phase 2: Fuzzy matching (on remaining unmatched)
  const { autoMatches, reviewCandidates } = await runFuzzyMatching();

  const summary: MatchRunSummary = {
    exactMatches: exactResults.length,
    fuzzyAutoMatches: autoMatches.length,
    fuzzyReviewMatches: reviewCandidates.length,
    totalProductsProcessed: unmatchedCount,
    durationMs: Date.now() - start,
  };

  return { success: true, summary, reviewCandidates };
}

/**
 * Confirm a fuzzy match flagged for admin review.
 *
 * Links two products with a shared matchGroupId.
 */
export async function confirmFuzzyMatch(
  productIdA: number,
  productIdB: number,
  confidence: number
): Promise<{ success: true; matchGroupId: string } | { error: string }> {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as unknown as { role: string }).role !== "admin"
  ) {
    return { error: "Unauthorized" };
  }

  // Check if either product already has a match group
  const [productA, productB] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productIdA },
      select: { id: true, matchGroupId: true },
    }),
    prisma.product.findUnique({
      where: { id: productIdB },
      select: { id: true, matchGroupId: true },
    }),
  ]);

  if (!productA || !productB) {
    return { error: "One or both products not found" };
  }

  // Guard: don't silently merge two different match groups
  if (
    productA.matchGroupId &&
    productB.matchGroupId &&
    productA.matchGroupId !== productB.matchGroupId
  ) {
    return {
      error:
        "Cannot link: products belong to different match groups. Unlink one first.",
    };
  }

  // Use existing group or create new one
  const { randomUUID } = await import("crypto");
  const matchGroupId =
    productA.matchGroupId ?? productB.matchGroupId ?? randomUUID();

  await prisma.product.updateMany({
    where: { id: { in: [productIdA, productIdB] } },
    data: { matchGroupId, matchConfidence: confidence },
  });

  return { success: true, matchGroupId };
}

/**
 * Reject a fuzzy match — no link is created.
 *
 * No DB changes needed since unconfirmed fuzzy matches aren't persisted.
 * This action exists for future audit trail if we add a match review log.
 */
export async function rejectFuzzyMatch(
  _productIdA: number,
  _productIdB: number
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as unknown as { role: string }).role !== "admin"
  ) {
    return { error: "Unauthorized" };
  }

  // Future: log rejection for audit trail
  return { success: true };
}

/**
 * Manually link two products across retailers.
 *
 * Admin action for cases where automated matching fails.
 */
export async function manuallyLinkProducts(
  productIdA: number,
  productIdB: number
): Promise<{ success: true; matchGroupId: string } | { error: string }> {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as unknown as { role: string }).role !== "admin"
  ) {
    return { error: "Unauthorized" };
  }

  const [productA, productB] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productIdA },
      select: { id: true, source_retailer: true, matchGroupId: true },
    }),
    prisma.product.findUnique({
      where: { id: productIdB },
      select: { id: true, source_retailer: true, matchGroupId: true },
    }),
  ]);

  if (!productA || !productB) {
    return { error: "One or both products not found" };
  }

  if (productA.source_retailer === productB.source_retailer) {
    return { error: "Cannot link products from the same retailer" };
  }

  // Guard: don't silently merge two different match groups
  if (
    productA.matchGroupId &&
    productB.matchGroupId &&
    productA.matchGroupId !== productB.matchGroupId
  ) {
    return {
      error:
        "Cannot link: products belong to different match groups. Unlink one first.",
    };
  }

  const { randomUUID } = await import("crypto");
  const matchGroupId =
    productA.matchGroupId ?? productB.matchGroupId ?? randomUUID();

  await prisma.product.updateMany({
    where: { id: { in: [productIdA, productIdB] } },
    data: { matchGroupId, matchConfidence: 1.0 },
  });

  return { success: true, matchGroupId };
}

/**
 * Unlink a product from its match group.
 */
export async function unlinkProduct(
  productId: number
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as unknown as { role: string }).role !== "admin"
  ) {
    return { error: "Unauthorized" };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { matchGroupId: null, matchConfidence: null },
  });

  return { success: true };
}

/**
 * Get all match groups with their products for the admin dashboard.
 */
export async function getMatchGroups(options?: {
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as unknown as { role: string }).role !== "admin"
  ) {
    return { error: "Unauthorized" };
  }

  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;

  // Get distinct matchGroupIds with pagination
  const groups = await prisma.product.groupBy({
    by: ["matchGroupId"],
    where: { matchGroupId: { not: null } },
    _count: true,
    _avg: { matchConfidence: true },
    orderBy: { matchGroupId: "asc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const totalGroups = await prisma.product.groupBy({
    by: ["matchGroupId"],
    where: { matchGroupId: { not: null } },
  });

  // Fetch full product details for each group
  const groupDetails = await Promise.all(
    groups.map(async (g) => {
      const products = await prisma.product.findMany({
        where: { matchGroupId: g.matchGroupId },
        select: {
          id: true,
          article_number: true,
          product_name: true,
          source_retailer: true,
          price_current: true,
          matchConfidence: true,
          images: { take: 1, select: { url: true } },
        },
      });

      return {
        matchGroupId: g.matchGroupId!,
        productCount: g._count,
        avgConfidence: g._avg.matchConfidence,
        products,
      };
    })
  );

  return {
    success: true as const,
    groups: groupDetails,
    totalGroups: totalGroups.length,
    page,
    limit,
  };
}

/**
 * Match a single product against the catalog (exact then fuzzy).
 *
 * Called during product ingestion to check for cross-retailer matches.
 */
export async function matchSingleProduct(
  productId: number
): Promise<{ success: true; matched: boolean } | { error: string }> {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as unknown as { role: string }).role !== "admin"
  ) {
    return { error: "Unauthorized" };
  }

  // Try exact first
  const exactResult = await matchProductExact(productId);
  if (exactResult) {
    return { success: true, matched: true };
  }

  // Fall back to fuzzy
  const { match } = await matchProductFuzzy(productId);
  return { success: true, matched: !!match };
}
