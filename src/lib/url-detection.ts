/**
 * Multi-retailer URL detection engine.
 * Detects product URLs from IKEA, Amazon, Wayfair, Home Depot, and Target,
 * extracting the retailer-specific product identifier from each.
 */

export interface DetectedUrl {
  retailer: string;       // retailer slug: "ikea", "amazon", "wayfair", "homedepot", "target"
  productId: string;      // extracted ID: article number, ASIN, SKU, product ID, DPCI
  originalUrl: string;
  confidence: number;     // 0-1
}

interface RetailerPattern {
  slug: string;
  /** Test whether the input looks like it could be a URL for this retailer */
  hostMatch: RegExp;
  /** Extract the product identifier from the URL. Returns null if no match. */
  extract: (url: string) => { productId: string; confidence: number } | null;
}

// ─── IKEA ───
// Patterns:
//   ikea.com/us/en/p/kallax-shelf-unit-white-70275814/
//   ikea.com/us/en/p/S70275814/
//   ikea.com/*/p/*-{8digits}/
//   ikea.com/*/p/S{8digits}/
//   Article numbers may appear as 702.758.14 (dotted) or 70275814 (raw)
function extractIkea(url: string): { productId: string; confidence: number } | null {
  // Match 8-digit article number at end of path segment (with or without S prefix)
  const pathMatch = url.match(/ikea\.com\/[^?#]*\/p\/(?:[^/]*[-/])?S?(\d{8})\/?(?:[?#]|$)/i);
  if (pathMatch) {
    const raw = pathMatch[1];
    const formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    return { productId: formatted, confidence: 1.0 };
  }

  // Match dotted format: 702.758.14
  const dottedMatch = url.match(/ikea\.com\/[^?#]*\/p\/[^/]*?(\d{3}\.\d{3}\.\d{2})/i);
  if (dottedMatch) {
    return { productId: dottedMatch[1], confidence: 1.0 };
  }

  return null;
}

// ─── Amazon ───
// Patterns:
//   amazon.com/dp/{ASIN}
//   amazon.com/gp/product/{ASIN}
//   amazon.com/{product-name}/dp/{ASIN}
//   amazon.com/gp/aw/d/{ASIN}  (mobile)
// ASIN: 10 chars, alphanumeric, usually starts with B0
function extractAmazon(url: string): { productId: string; confidence: number } | null {
  const match = url.match(/amazon\.com(?:\.[a-z]{2,3})?\/(?:.*\/)?(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  if (match) {
    return { productId: match[1].toUpperCase(), confidence: 1.0 };
  }
  return null;
}

// ─── Wayfair ───
// Pattern:
//   wayfair.com/furniture/pdp/product-name-{SKU}.html
//   wayfair.com/*/pdp/*-{SKU}.html
// SKU is typically alphanumeric like W003456789
function extractWayfair(url: string): { productId: string; confidence: number } | null {
  const match = url.match(/wayfair\.com\/[^?#]*\/pdp\/[^?#]*?-([A-Z0-9]+)\.html/i);
  if (match) {
    return { productId: match[1].toUpperCase(), confidence: 1.0 };
  }
  return null;
}

// ─── Home Depot ───
// Pattern:
//   homedepot.com/p/product-name/123456789
//   homedepot.com/p/{slug}/{productId}
// Product ID is a numeric string, typically 9 digits
function extractHomeDepot(url: string): { productId: string; confidence: number } | null {
  const match = url.match(/homedepot\.com\/p\/[^/]+\/(\d{6,12})(?:[?#]|$)/i);
  if (match) {
    return { productId: match[1], confidence: 1.0 };
  }
  return null;
}

// ─── Target ───
// Pattern:
//   target.com/p/product-name/-/A-12345678
//   target.com/p/{slug}/-/A-{DPCI}
// DPCI is numeric, typically 8 digits
function extractTarget(url: string): { productId: string; confidence: number } | null {
  const match = url.match(/target\.com\/p\/[^?#]*\/-\/A-(\d{6,10})(?:[?#]|$)/i);
  if (match) {
    return { productId: match[1], confidence: 1.0 };
  }
  return null;
}

const RETAILER_PATTERNS: RetailerPattern[] = [
  {
    slug: "ikea",
    hostMatch: /ikea\.com/i,
    extract: extractIkea,
  },
  {
    slug: "amazon",
    hostMatch: /amazon\.com/i,
    extract: extractAmazon,
  },
  {
    slug: "wayfair",
    hostMatch: /wayfair\.com/i,
    extract: extractWayfair,
  },
  {
    slug: "homedepot",
    hostMatch: /homedepot\.com/i,
    extract: extractHomeDepot,
  },
  {
    slug: "target",
    hostMatch: /target\.com/i,
    extract: extractTarget,
  },
];

/**
 * Detect whether the input is a retailer product URL and extract the product ID.
 * Returns null if the input doesn't match any known retailer pattern.
 *
 * Supports http/https and www/non-www variants for all retailers.
 */
export function detectRetailerUrl(input: string): DetectedUrl | null {
  const trimmed = input.trim();

  // Quick check: must look like a URL (contains a dot and a retailer domain)
  if (!trimmed.includes(".")) return null;

  // Normalize: ensure we have a protocol for consistent parsing
  const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;

  for (const pattern of RETAILER_PATTERNS) {
    if (!pattern.hostMatch.test(normalized)) continue;

    const result = pattern.extract(normalized);
    if (result) {
      return {
        retailer: pattern.slug,
        productId: result.productId,
        originalUrl: trimmed,
        confidence: result.confidence,
      };
    }
  }

  return null;
}

/**
 * Check whether the input looks like it might be a URL (for early detection in UI).
 * Cheaper than running full detection — just checks for a known retailer domain.
 */
export function looksLikeRetailerUrl(input: string): boolean {
  const trimmed = input.trim();
  return RETAILER_PATTERNS.some((p) => p.hostMatch.test(trimmed));
}
