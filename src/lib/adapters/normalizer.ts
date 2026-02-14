import type { ScrapedProduct, NormalizedProduct } from "./types";

// ─── Price Parsing ───

/** Parse price strings like "$1,299.00" or "1299" into a number. */
export function parsePrice(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ─── Dimension Normalization ───

/** Normalize dimension strings to consistent format. */
export function normalizeDimension(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value).trim();
}

// ─── Currency Conversion (P5.3.2) ───

/** Cached exchange rates with timestamp for daily refresh. */
interface CachedRates {
  rates: Record<string, number>;
  fetchedAt: number;
}

/** Module-level cache for exchange rates (refreshed daily). */
let cachedRates: CachedRates | null = null;

/** Promise-level lock to prevent concurrent API calls during cache miss. */
let fetchingPromise: Promise<Record<string, number>> | null = null;

/** One day in milliseconds. */
const RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Fallback static rates used when the API is unreachable. */
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  SEK: 0.095,
  NOK: 0.093,
  DKK: 0.145,
  PLN: 0.25,
  CHF: 1.13,
  AUD: 0.65,
  JPY: 0.0067,
  CNY: 0.14,
  KRW: 0.00074,
  MXN: 0.058,
};

/**
 * Fetch current exchange rates from a free API.
 * Uses exchangerate-api.com (free tier, 1500 reqs/month).
 * Falls back to static rates if the API is unreachable.
 */
async function fetchExchangeRates(): Promise<Record<string, number>> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  // If no API key configured, use fallback rates
  if (!apiKey) {
    return FALLBACK_RATES;
  }

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      return FALLBACK_RATES;
    }

    const data = await response.json() as { result: string; conversion_rates?: Record<string, number> };

    if (data.result === "success" && data.conversion_rates) {
      // API returns rates FROM USD, we need rates TO USD
      // So 1 EUR = X USD means rate = 1 / (USD-to-EUR rate)
      const toUsd: Record<string, number> = { USD: 1 };
      for (const [currency, rate] of Object.entries(data.conversion_rates)) {
        if (typeof rate === "number" && rate > 0) {
          toUsd[currency] = 1 / rate;
        }
      }
      return toUsd;
    }
  } catch {
    // Network error, timeout, etc. — use fallback
  }

  return FALLBACK_RATES;
}

/**
 * Get exchange rates, using cache if available and fresh.
 * Rates are refreshed daily (24h TTL).
 */
async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();

  if (cachedRates && now - cachedRates.fetchedAt < RATE_CACHE_TTL_MS) {
    return cachedRates.rates;
  }

  // Promise-level lock: if a fetch is already in-flight, wait for it
  if (fetchingPromise) {
    return fetchingPromise;
  }

  fetchingPromise = fetchExchangeRates();
  try {
    const rates = await fetchingPromise;
    cachedRates = { rates, fetchedAt: now };
    return rates;
  } finally {
    fetchingPromise = null;
  }
}

/**
 * Convert an amount from one currency to USD.
 *
 * Uses cached exchange rates (refreshed daily from API).
 * All prices in the database are stored in USD.
 * The original price and currency are preserved in the ScrapedProduct.
 */
export async function convertCurrencyAsync(
  amount: number,
  fromCurrency: string,
  toCurrency: string = "USD"
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  const rates = await getExchangeRates();

  // Convert to USD first, then to target if needed
  const toUsdRate = rates[fromCurrency] ?? 1;
  const amountInUsd = amount * toUsdRate;

  if (toCurrency === "USD") return Math.round(amountInUsd * 100) / 100;

  // Convert from USD to target currency
  const fromUsdRate = rates[toCurrency];
  if (!fromUsdRate || fromUsdRate === 0) return amountInUsd;

  return Math.round((amountInUsd / fromUsdRate) * 100) / 100;
}

/**
 * Synchronous currency conversion using cached/fallback rates.
 * Prefer convertCurrencyAsync when possible for fresh rates.
 */
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string = "USD"): number {
  if (fromCurrency === toCurrency) return amount;

  // Use cached rates if available, otherwise fallback
  const rates = cachedRates?.rates ?? FALLBACK_RATES;
  const toUsdRate = rates[fromCurrency] ?? 1;
  const amountInUsd = amount * toUsdRate;

  if (toCurrency === "USD") return Math.round(amountInUsd * 100) / 100;

  const fromUsdRate = rates[toCurrency];
  if (!fromUsdRate || fromUsdRate === 0) return amountInUsd;

  return Math.round((amountInUsd / fromUsdRate) * 100) / 100;
}

// ─── Category Mapping (P5.3.3) ───

/**
 * Unified category taxonomy for Guid.
 *
 * Each retailer has its own category names (e.g., IKEA uses "Living room > Sofas",
 * Wayfair uses "Furniture > Living Room Furniture > Sofas & Couches"). This mapping
 * normalizes retailer-specific paths to Guid's unified categories.
 */
const CATEGORY_MAPPINGS: Record<string, Record<string, string>> = {
  ikea: {
    "living room": "Living Room",
    "bedroom": "Bedroom",
    "kitchen": "Kitchen & Dining",
    "dining": "Kitchen & Dining",
    "bathroom": "Bathroom",
    "home office": "Home Office",
    "outdoor": "Outdoor",
    "kids": "Kids & Baby",
    "baby": "Kids & Baby",
    "storage": "Storage & Organization",
    "decoration": "Home Decor",
    "lighting": "Lighting",
    "textiles": "Textiles",
    "sofas": "Sofas & Sectionals",
    "beds": "Beds & Mattresses",
    "wardrobes": "Wardrobes & Closets",
    "desks": "Desks",
    "shelving": "Shelving & Bookcases",
    "tables": "Tables",
    "chairs": "Chairs",
    "cabinets": "Cabinets",
    "dressers": "Dressers & Chests",
  },
  wayfair: {
    "furniture": "Furniture",
    "living room furniture": "Living Room",
    "bedroom furniture": "Bedroom",
    "kitchen & dining furniture": "Kitchen & Dining",
    "dining room furniture": "Kitchen & Dining",
    "bathroom furniture": "Bathroom",
    "office furniture": "Home Office",
    "outdoor furniture": "Outdoor",
    "kids furniture": "Kids & Baby",
    "baby & kids": "Kids & Baby",
    "storage & organization": "Storage & Organization",
    "home decor": "Home Decor",
    "lighting": "Lighting",
    "rugs": "Textiles",
    "bedding": "Textiles",
    "sofas": "Sofas & Sectionals",
    "sectionals": "Sofas & Sectionals",
    "beds": "Beds & Mattresses",
    "dressers": "Dressers & Chests",
    "desks": "Desks",
    "bookcases": "Shelving & Bookcases",
    "tv stands": "Media & Entertainment",
    "coffee tables": "Tables",
    "dining tables": "Tables",
    "accent chairs": "Chairs",
    "bar stools": "Chairs",
  },
  homedepot: {
    "furniture": "Furniture",
    "living room furniture": "Living Room",
    "bedroom furniture": "Bedroom",
    "kitchen": "Kitchen & Dining",
    "bath": "Bathroom",
    "home office furniture": "Home Office",
    "outdoor living": "Outdoor",
    "patio furniture": "Outdoor",
    "storage & organization": "Storage & Organization",
    "home decor": "Home Decor",
    "lighting": "Lighting",
    "flooring": "Flooring",
    "cabinets": "Cabinets",
    "shelving": "Shelving & Bookcases",
    "desks": "Desks",
    "workbenches": "Garage & Workshop",
    "tool storage": "Garage & Workshop",
    "garage storage": "Garage & Workshop",
  },
  amazon: {
    "furniture": "Furniture",
    "living room furniture": "Living Room",
    "bedroom furniture": "Bedroom",
    "kitchen & dining room furniture": "Kitchen & Dining",
    "bathroom furniture": "Bathroom",
    "home office furniture": "Home Office",
    "patio furniture": "Outdoor",
    "kids' furniture": "Kids & Baby",
    "storage & organization": "Storage & Organization",
    "home décor": "Home Decor",
    "lighting & ceiling fans": "Lighting",
    "sofas & couches": "Sofas & Sectionals",
    "beds, frames & bases": "Beds & Mattresses",
    "dressers": "Dressers & Chests",
    "desks": "Desks",
    "bookcases": "Shelving & Bookcases",
    "tv stands & entertainment centers": "Media & Entertainment",
    "tables": "Tables",
    "chairs": "Chairs",
  },
  target: {
    "furniture": "Furniture",
    "living room furniture": "Living Room",
    "bedroom furniture": "Bedroom",
    "kitchen & dining furniture": "Kitchen & Dining",
    "bathroom furniture": "Bathroom",
    "home office furniture": "Home Office",
    "outdoor furniture": "Outdoor",
    "patio": "Outdoor",
    "kids' furniture": "Kids & Baby",
    "nursery furniture": "Kids & Baby",
    "storage & organization": "Storage & Organization",
    "home decor": "Home Decor",
    "lighting": "Lighting",
    "sofas & couches": "Sofas & Sectionals",
    "beds & headboards": "Beds & Mattresses",
    "dressers & chests": "Dressers & Chests",
    "desks": "Desks",
    "bookcases & bookshelves": "Shelving & Bookcases",
    "tv stands & entertainment centers": "Media & Entertainment",
    "accent tables": "Tables",
    "dining tables": "Tables",
    "chairs": "Chairs",
  },
};

/**
 * Map a retailer-specific category path to Guid's unified category.
 *
 * Walks the category path segments from most specific to least specific,
 * matching against the retailer's mapping table. Returns the first match found.
 *
 * @param categoryPath - The raw category path from the retailer (e.g., "Furniture > Living Room > Sofas")
 * @param retailerSlug - The retailer slug (e.g., "ikea", "wayfair")
 * @returns The unified Guid category, or the normalized path if no mapping found
 */
export function mapCategory(categoryPath: string | null | undefined, retailerSlug: string): string | null {
  if (!categoryPath) return null;

  const mapping = CATEGORY_MAPPINGS[retailerSlug];
  if (!mapping) return normalizeCategoryPath(categoryPath);

  // Split the path and check segments from most specific to broadest
  const segments = categoryPath
    .split(/\s*[>\/|]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Try matching from the most specific (last) segment backwards
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i].toLowerCase();
    if (mapping[segment]) {
      return mapping[segment];
    }
  }

  // Try compound segments (e.g., "living room furniture")
  for (let i = segments.length - 1; i >= 0; i--) {
    for (let j = i; j >= 0; j--) {
      const compound = segments.slice(j, i + 1).join(" ").toLowerCase();
      if (mapping[compound]) {
        return mapping[compound];
      }
    }
  }

  // No mapping found — return normalized raw path
  return normalizeCategoryPath(categoryPath);
}

// ─── Category Path Normalization ───

/** Normalize category path across retailers — unifies delimiters to " > ". */
export function normalizeCategoryPath(categoryPath: string | null | undefined): string | null {
  if (!categoryPath) return null;
  return categoryPath
    .replace(/\s*[>\/|]\s*/g, " > ")
    .trim();
}

// ─── Full Product Normalization ───

/** Full product normalization — maps ScrapedProduct to NormalizedProduct. */
export function normalizeProduct(raw: ScrapedProduct, retailerSlug: string): NormalizedProduct {
  // Convert price to USD if in a different currency
  let priceCurrent = parsePrice(raw.priceCurrent);
  let priceOriginal = parsePrice(raw.priceOriginal);
  const sourceCurrency = raw.priceCurrency ?? "USD";

  if (sourceCurrency !== "USD") {
    if (priceCurrent != null) {
      priceCurrent = convertCurrency(priceCurrent, sourceCurrency, "USD");
    }
    if (priceOriginal != null) {
      priceOriginal = convertCurrency(priceOriginal, sourceCurrency, "USD");
    }
  }

  return {
    articleNumber: raw.articleNumber,
    productName: raw.name ?? null,
    productType: raw.type ?? null,
    description: raw.description ?? null,
    priceCurrency: "USD", // All prices stored in USD
    priceCurrent,
    priceOriginal,
    color: raw.color ?? null,
    designer: raw.designer ?? null,
    assemblyRequired: raw.assemblyRequired ?? null,
    avgRating: raw.avgRating ?? null,
    reviewCount: raw.reviewCount ?? null,
    categoryPath: mapCategory(raw.categoryPath, retailerSlug),
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
