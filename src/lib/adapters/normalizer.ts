import type { ScrapedProduct, NormalizedProduct } from "./types";

/** Parse price strings like "$1,299.00" or "1299" into a number. */
export function parsePrice(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/** Normalize dimension strings to consistent format. */
export function normalizeDimension(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value).trim();
}

/** Currency conversion stub — all retailers currently USD. */
export function convertCurrency(amount: number, fromCurrency: string, _toCurrency: string = "USD"): number {
  // TODO: Integrate exchange rate API for non-USD retailers
  if (fromCurrency === "USD") return amount;
  // Placeholder rates for future retailers
  const rates: Record<string, number> = {
    EUR: 1.08,
    GBP: 1.27,
    CAD: 0.74,
  };
  return amount * (rates[fromCurrency] ?? 1);
}

/** Normalize category path across retailers. */
export function normalizeCategoryPath(categoryPath: string | null | undefined): string | null {
  if (!categoryPath) return null;
  return categoryPath
    .replace(/\s*[>\/|]\s*/g, " > ")
    .trim();
}

/** Full product normalization — maps ScrapedProduct to NormalizedProduct. */
export function normalizeProduct(raw: ScrapedProduct, retailerSlug: string): NormalizedProduct {
  return {
    articleNumber: raw.articleNumber,
    productName: raw.name ?? null,
    productType: raw.type ?? null,
    description: raw.description ?? null,
    priceCurrency: raw.priceCurrency ?? "USD",
    priceCurrent: parsePrice(raw.priceCurrent),
    priceOriginal: parsePrice(raw.priceOriginal),
    color: raw.color ?? null,
    designer: raw.designer ?? null,
    assemblyRequired: raw.assemblyRequired ?? null,
    avgRating: raw.avgRating ?? null,
    reviewCount: raw.reviewCount ?? null,
    categoryPath: normalizeCategoryPath(raw.categoryPath),
    style: raw.style ?? null,
    goodToKnow: raw.goodToKnow ?? null,
    materials: raw.materials ?? null,
    careInstructions: raw.careInstructions ?? null,
    importantNotes: raw.importantNotes ?? null,
    productWidth: normalizeDimension(raw.productWidth),
    productHeight: normalizeDimension(raw.productHeight),
    productDepth: normalizeDimension(raw.productDepth),
    productLength: normalizeDimension(raw.productLength),
    productWeight: normalizeDimension(raw.productWeight),
    packageWidth: normalizeDimension(raw.packageWidth),
    packageHeight: normalizeDimension(raw.packageHeight),
    packageLength: normalizeDimension(raw.packageLength),
    packageWeight: normalizeDimension(raw.packageWeight),
    highlightedReviews: raw.highlightedReviews ?? null,
    variants: raw.variants ?? null,
    keyFacts: raw.keyFacts ?? null,
    recommendedAccessories: raw.recommendedAccessories ?? null,
    sourceUrl: raw.sourceUrl ?? null,
    sourceRetailer: retailerSlug,
    manufacturerSku: null,
    upcEan: null,
  };
}
