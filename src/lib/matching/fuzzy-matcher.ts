import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import type {
  MatchResult,
  MatchCandidate,
  FuzzyMatchCandidate,
} from "./types";

/** Auto-match threshold — products above this score are linked automatically. */
const AUTO_MATCH_THRESHOLD = 0.85;

/** Review threshold — products between this and auto are flagged for admin. */
const REVIEW_THRESHOLD = 0.7;

/** Weight of name similarity vs dimension similarity in the overall score. */
const NAME_WEIGHT = 0.7;
const DIMENSION_WEIGHT = 0.3;

/** Maximum products to compare per batch (prevents O(n^2) explosion). */
const MAX_BATCH_SIZE = 500;

/**
 * Run fuzzy matching on all unmatched products.
 *
 * Compares product names and dimensions across retailers using
 * Jaro-Winkler similarity. Products above AUTO_MATCH_THRESHOLD are
 * linked automatically; those between REVIEW and AUTO thresholds
 * are flagged for admin review (lower matchConfidence).
 *
 * Returns both auto-matches and review candidates.
 */
export async function runFuzzyMatching(): Promise<{
  autoMatches: MatchResult[];
  reviewCandidates: FuzzyMatchCandidate[];
}> {
  const autoMatches: MatchResult[] = [];
  const reviewCandidates: FuzzyMatchCandidate[] = [];

  // Get distinct retailers that have unmatched products
  const retailers = await prisma.product.groupBy({
    by: ["source_retailer"],
    where: { matchGroupId: null },
    _count: true,
  });

  if (retailers.length < 2) {
    return { autoMatches, reviewCandidates };
  }

  const retailerSlugs = retailers.map((r) => r.source_retailer);

  // Compare each pair of retailers
  for (let i = 0; i < retailerSlugs.length; i++) {
    for (let j = i + 1; j < retailerSlugs.length; j++) {
      const { auto, review } = await compareRetailerPair(
        retailerSlugs[i],
        retailerSlugs[j]
      );
      autoMatches.push(...auto);
      reviewCandidates.push(...review);
    }
  }

  return { autoMatches, reviewCandidates };
}

/**
 * Compare all unmatched products between two retailers.
 */
async function compareRetailerPair(
  retailerA: string,
  retailerB: string
): Promise<{ auto: MatchResult[]; review: FuzzyMatchCandidate[] }> {
  const auto: MatchResult[] = [];
  const review: FuzzyMatchCandidate[] = [];

  const productsA = await getUnmatchedProducts(retailerA);
  const productsB = await getUnmatchedProducts(retailerB);

  if (productsA.length === 0 || productsB.length === 0) {
    return { auto, review };
  }

  // Limit comparison set to prevent excessive computation
  const batchA = productsA.slice(0, MAX_BATCH_SIZE);
  const batchB = productsB.slice(0, MAX_BATCH_SIZE);

  // Track products already matched in this run to avoid duplicates
  const matchedIds = new Set<number>();

  for (const a of batchA) {
    if (matchedIds.has(a.id)) continue;

    let bestMatch: {
      product: (typeof batchB)[0];
      nameScore: number;
      dimScore: number;
      overall: number;
    } | null = null;

    for (const b of batchB) {
      if (matchedIds.has(b.id)) continue;

      const nameScore = computeNameSimilarity(a.product_name, b.product_name);
      if (nameScore < REVIEW_THRESHOLD * 0.8) continue; // Early exit for obviously different names

      const dimScore = computeDimensionSimilarity(a, b);
      const overall = nameScore * NAME_WEIGHT + dimScore * DIMENSION_WEIGHT;

      if (overall >= REVIEW_THRESHOLD) {
        if (!bestMatch || overall > bestMatch.overall) {
          bestMatch = { product: b, nameScore, dimScore, overall };
        }
      }
    }

    if (!bestMatch) continue;

    const candidateA = toCandidate(a);
    const candidateB = toCandidate(bestMatch.product);

    if (bestMatch.overall >= AUTO_MATCH_THRESHOLD) {
      // Auto-match: link products
      const matchGroupId = randomUUID();

      await prisma.product.updateMany({
        where: { id: { in: [a.id, bestMatch.product.id] } },
        data: {
          matchGroupId,
          matchConfidence: bestMatch.overall,
        },
      });

      matchedIds.add(a.id);
      matchedIds.add(bestMatch.product.id);

      auto.push({
        matchGroupId,
        matchType: "fuzzy",
        confidence: bestMatch.overall,
        matchField: "name+dimensions",
        products: [candidateA, candidateB],
      });
    } else {
      // Review candidate: flag for admin
      review.push({
        productA: candidateA,
        productB: candidateB,
        nameScore: bestMatch.nameScore,
        dimensionScore: bestMatch.dimScore,
        overallScore: bestMatch.overall,
      });
    }
  }

  return { auto, review };
}

/**
 * Fuzzy-match a single product against all products from other retailers.
 *
 * Used during product ingestion when exact matching fails.
 */
export async function matchProductFuzzy(
  productId: number
): Promise<{
  match: MatchResult | null;
  reviewCandidates: FuzzyMatchCandidate[];
}> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      article_number: true,
      product_name: true,
      source_retailer: true,
      retailerId: true,
      matchGroupId: true,
      product_width: true,
      product_height: true,
      product_depth: true,
      product_length: true,
      product_weight: true,
    },
  });

  if (!product || product.matchGroupId) {
    return { match: null, reviewCandidates: [] };
  }

  const candidates = await prisma.product.findMany({
    where: {
      source_retailer: { not: product.source_retailer },
      matchGroupId: null,
      product_name: { not: null },
    },
    select: {
      id: true,
      article_number: true,
      product_name: true,
      source_retailer: true,
      retailerId: true,
      product_width: true,
      product_height: true,
      product_depth: true,
      product_length: true,
      product_weight: true,
    },
    take: MAX_BATCH_SIZE,
  });

  let bestAuto: {
    candidate: (typeof candidates)[0];
    overall: number;
    nameScore: number;
    dimScore: number;
  } | null = null;

  const reviewCandidates: FuzzyMatchCandidate[] = [];

  for (const c of candidates) {
    const nameScore = computeNameSimilarity(product.product_name, c.product_name);
    if (nameScore < REVIEW_THRESHOLD * 0.8) continue;

    const dimScore = computeDimensionSimilarity(product, c);
    const overall = nameScore * NAME_WEIGHT + dimScore * DIMENSION_WEIGHT;

    if (overall >= AUTO_MATCH_THRESHOLD) {
      if (!bestAuto || overall > bestAuto.overall) {
        bestAuto = { candidate: c, overall, nameScore, dimScore };
      }
    } else if (overall >= REVIEW_THRESHOLD) {
      reviewCandidates.push({
        productA: toCandidate(product),
        productB: toCandidate(c),
        nameScore,
        dimensionScore: dimScore,
        overallScore: overall,
      });
    }
  }

  if (bestAuto) {
    const matchGroupId = randomUUID();

    await prisma.product.updateMany({
      where: { id: { in: [product.id, bestAuto.candidate.id] } },
      data: {
        matchGroupId,
        matchConfidence: bestAuto.overall,
      },
    });

    return {
      match: {
        matchGroupId,
        matchType: "fuzzy",
        confidence: bestAuto.overall,
        matchField: "name+dimensions",
        products: [toCandidate(product), toCandidate(bestAuto.candidate)],
      },
      reviewCandidates,
    };
  }

  return { match: null, reviewCandidates };
}

// ─── String Similarity ───

/**
 * Compute name similarity using Jaro-Winkler distance.
 *
 * Jaro-Winkler is well-suited for product names because it gives
 * higher scores to strings that share a common prefix (e.g., brand names).
 * Names are lowercased and stripped of common noise words before comparison.
 */
export function computeNameSimilarity(
  nameA: string | null,
  nameB: string | null
): number {
  if (!nameA || !nameB) return 0;

  const a = normalizeName(nameA);
  const b = normalizeName(nameB);

  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  return jaroWinkler(a, b);
}

/** Jaro similarity between two strings. */
function jaro(s1: string, s2: string): number {
  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;

  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchDistance < 0) return 0;

  const s1Matches = new Array<boolean>(len1).fill(false);
  const s2Matches = new Array<boolean>(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
  );
}

/** Jaro-Winkler similarity — boosts Jaro score for common prefixes. */
function jaroWinkler(s1: string, s2: string): number {
  const jaroScore = jaro(s1, s2);

  // Common prefix length (up to 4 chars)
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  // Winkler scaling factor (standard 0.1)
  return jaroScore + prefix * 0.1 * (1 - jaroScore);
}

// ─── Dimension Similarity ───

/**
 * Compare product dimensions.
 *
 * Extracts numeric values from dimension strings and computes
 * how close two products' dimensions are as a ratio.
 */
export function computeDimensionSimilarity(
  a: { product_width: string | null; product_height: string | null; product_depth: string | null; product_length: string | null; product_weight: string | null },
  b: { product_width: string | null; product_height: string | null; product_depth: string | null; product_length: string | null; product_weight: string | null }
): number {
  const fields = [
    "product_width",
    "product_height",
    "product_depth",
    "product_length",
    "product_weight",
  ] as const;

  let totalScore = 0;
  let comparisons = 0;

  for (const field of fields) {
    const valA = extractNumeric(a[field]);
    const valB = extractNumeric(b[field]);

    if (valA === null || valB === null) continue;
    if (valA === 0 && valB === 0) {
      totalScore += 1;
      comparisons++;
      continue;
    }

    const max = Math.max(valA, valB);
    if (max === 0) continue;

    // Ratio similarity: 1 when identical, 0 when completely different
    const ratio = Math.min(valA, valB) / max;
    totalScore += ratio;
    comparisons++;
  }

  // If no dimensions to compare, return neutral score
  if (comparisons === 0) return 0.5;

  return totalScore / comparisons;
}

// ─── Helpers ───

/** Normalize a product name for comparison. */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .replace(/\s+/g, " ")     // Collapse whitespace
    .trim();
}

/** Extract the first numeric value from a dimension string like "120 cm" or "47 1/4". */
function extractNumeric(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/[\d]+(?:\.[\d]+)?/);
  return match ? parseFloat(match[0]) : null;
}

/** Fetch unmatched products for a retailer. */
async function getUnmatchedProducts(retailerSlug: string) {
  return prisma.product.findMany({
    where: {
      source_retailer: retailerSlug,
      matchGroupId: null,
      product_name: { not: null },
    },
    select: {
      id: true,
      article_number: true,
      product_name: true,
      source_retailer: true,
      retailerId: true,
      product_width: true,
      product_height: true,
      product_depth: true,
      product_length: true,
      product_weight: true,
    },
    take: MAX_BATCH_SIZE,
  });
}

/** Convert a DB product row to a MatchCandidate. */
function toCandidate(p: {
  id: number;
  article_number: string;
  product_name: string | null;
  source_retailer: string;
  retailerId: string | null;
}): MatchCandidate {
  return {
    productId: p.id,
    articleNumber: p.article_number,
    productName: p.product_name,
    retailerSlug: p.source_retailer,
    retailerId: p.retailerId,
  };
}
