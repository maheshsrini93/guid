import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import type { MatchResult, MatchCandidate, ExactMatchField } from "./types";

/**
 * Run exact matching across all retailers.
 *
 * Matches products by manufacturer SKU, UPC/EAN barcode, or article number
 * across different retailers. Exact matches get confidence = 1.0.
 *
 * Algorithm:
 * 1. Find all products that have a matchable identifier (manufacturerSku or upcEan)
 * 2. Group by identifier value across different retailers
 * 3. Assign a shared matchGroupId to each group
 */
export async function runExactMatching(): Promise<MatchResult[]> {
  const results: MatchResult[] = [];

  const skuMatches = await matchByField("manufacturerSku");
  results.push(...skuMatches);

  const upcMatches = await matchByField("upcEan");
  results.push(...upcMatches);

  return results;
}

/**
 * Match products by a specific identifier field.
 *
 * Finds groups of 2+ products sharing the same field value
 * but coming from different retailers, then links them.
 */
async function matchByField(field: ExactMatchField): Promise<MatchResult[]> {
  const dbField = fieldToColumn(field);

  // Find duplicate values across different retailers.
  // Using Prisma.raw() for the column name (safe — derived from fixed enum map)
  // and $queryRaw tagged template for parameterization.
  const col = Prisma.raw(`"${dbField}"`);
  const duplicates = await prisma.$queryRaw<
    Array<{ field_value: string; cnt: bigint }>
  >`SELECT ${col} as field_value, COUNT(DISTINCT source_retailer) as cnt
     FROM products
     WHERE ${col} IS NOT NULL
       AND ${col} != ''
       AND "matchGroupId" IS NULL
     GROUP BY ${col}
     HAVING COUNT(DISTINCT source_retailer) > 1`;

  const results: MatchResult[] = [];

  for (const { field_value } of duplicates) {
    const products = await prisma.product.findMany({
      where: {
        [field]: field_value,
        matchGroupId: null,
      },
      select: {
        id: true,
        article_number: true,
        product_name: true,
        source_retailer: true,
        retailerId: true,
      },
    });

    if (products.length < 2) continue;

    // Verify they span multiple retailers
    const retailers = new Set(products.map((p) => p.source_retailer));
    if (retailers.size < 2) continue;

    const matchGroupId = randomUUID();

    const candidates: MatchCandidate[] = products.map((p) => ({
      productId: p.id,
      articleNumber: p.article_number,
      productName: p.product_name,
      retailerSlug: p.source_retailer,
      retailerId: p.retailerId,
    }));

    // Update all matched products with the shared group ID
    await prisma.product.updateMany({
      where: {
        id: { in: products.map((p) => p.id) },
      },
      data: {
        matchGroupId,
        matchConfidence: 1.0,
      },
    });

    results.push({
      matchGroupId,
      matchType: "exact",
      confidence: 1.0,
      matchField: field,
      products: candidates,
    });
  }

  return results;
}

/**
 * Match a single product against existing products by exact identifiers.
 *
 * Used during product ingestion to immediately check for cross-retailer matches.
 */
export async function matchProductExact(
  productId: number
): Promise<MatchResult | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      article_number: true,
      product_name: true,
      source_retailer: true,
      retailerId: true,
      manufacturerSku: true,
      upcEan: true,
      matchGroupId: true,
    },
  });

  if (!product) return null;

  // Already matched
  if (product.matchGroupId) return null;

  // Try each identifier field
  for (const field of ["manufacturerSku", "upcEan"] as const) {
    const value = product[field];
    if (!value) continue;

    const matches = await prisma.product.findMany({
      where: {
        [field]: value,
        id: { not: product.id },
        source_retailer: { not: product.source_retailer },
      },
      select: {
        id: true,
        article_number: true,
        product_name: true,
        source_retailer: true,
        retailerId: true,
        matchGroupId: true,
      },
    });

    if (matches.length === 0) continue;

    // Use existing group ID if any match already belongs to a group
    const existingGroupId = matches.find((m) => m.matchGroupId)?.matchGroupId;
    const matchGroupId = existingGroupId ?? randomUUID();

    const allProductIds = [product.id, ...matches.map((m) => m.id)];

    await prisma.product.updateMany({
      where: { id: { in: allProductIds } },
      data: {
        matchGroupId,
        matchConfidence: 1.0,
      },
    });

    const candidates: MatchCandidate[] = [
      {
        productId: product.id,
        articleNumber: product.article_number,
        productName: product.product_name,
        retailerSlug: product.source_retailer,
        retailerId: product.retailerId,
      },
      ...matches.map((m) => ({
        productId: m.id,
        articleNumber: m.article_number,
        productName: m.product_name,
        retailerSlug: m.source_retailer,
        retailerId: m.retailerId,
      })),
    ];

    return {
      matchGroupId,
      matchType: "exact",
      confidence: 1.0,
      matchField: field,
      products: candidates,
    };
  }

  return null;
}

/** Map our type-safe field names to actual DB column names. */
function fieldToColumn(field: ExactMatchField): string {
  const map: Record<ExactMatchField, string> = {
    manufacturerSku: "manufacturerSku",
    upcEan: "upcEan",
    articleNumber: "article_number",
  };
  return map[field];
}
