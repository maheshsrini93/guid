import { getAdapter } from "./registry";
import { parsePrice, mapCategory, normalizeDimension } from "./normalizer";
import type {
  RetailerAdapter,
  ScrapedProduct,
  NormalizedProduct,
} from "./types";

// ─── Adapter Validation Pipeline (P5.1.9) ───

/** Result of validating a single scraped product. */
export interface ProductValidationResult {
  articleNumber: string;
  productName: string | null;
  errors: string[];
  warnings: string[];
  imageResults: ImageCheckResult[];
  priceValid: boolean;
  categoryMapped: boolean;
  normalizedSuccessfully: boolean;
}

/** Result of an image URL check. */
export interface ImageCheckResult {
  url: string;
  reachable: boolean;
  statusCode: number | null;
  contentType: string | null;
}

/** Summary report for a full adapter validation run. */
export interface AdapterValidationReport {
  retailerSlug: string;
  retailerName: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  totalProducts: number;
  validProducts: number;
  productsWithErrors: number;
  productsWithWarnings: number;
  imageChecksPassed: number;
  imageChecksFailed: number;
  priceParseSuccessRate: number;
  categoryMapRate: number;
  normalizationSuccessRate: number;
  errors: string[];
  productResults: ProductValidationResult[];
}

/** Configuration for a validation run. */
export interface ValidationConfig {
  /** Number of products to validate (default: 10). */
  sampleSize?: number;
  /** Whether to check that image URLs are reachable (default: true). */
  checkImages?: boolean;
  /** Timeout for image HEAD requests in ms (default: 5000). */
  imageTimeoutMs?: number;
  /** Category paths to test scraping (optional). */
  testCategories?: string[];
  /** Specific article numbers to test (optional). */
  testArticleNumbers?: string[];
}

const DEFAULT_CONFIG: Required<ValidationConfig> = {
  sampleSize: 10,
  checkImages: true,
  imageTimeoutMs: 5000,
  testCategories: [],
  testArticleNumbers: [],
};

/**
 * Run the full adapter validation pipeline for a retailer.
 *
 * Steps:
 * 1. Instantiate the adapter via the registry.
 * 2. Scrape test products (from provided article numbers or category).
 * 3. For each product, validate:
 *    - Required fields present (name, articleNumber)
 *    - Price parses correctly
 *    - Category maps to unified taxonomy
 *    - Images are reachable (HEAD request)
 *    - Normalization produces valid output
 * 4. Return a summary report.
 */
export async function validateAdapter(
  retailerSlug: string,
  config?: ValidationConfig
): Promise<AdapterValidationReport> {
  const opts = { ...DEFAULT_CONFIG, ...config };
  const startedAt = new Date();

  let adapter: RetailerAdapter;
  try {
    adapter = getAdapter(retailerSlug);
  } catch (err) {
    return createErrorReport(retailerSlug, `Adapter not found: ${err instanceof Error ? err.message : String(err)}`, startedAt);
  }

  const report: AdapterValidationReport = {
    retailerSlug,
    retailerName: adapter.info.name,
    startedAt: startedAt.toISOString(),
    completedAt: "",
    durationMs: 0,
    totalProducts: 0,
    validProducts: 0,
    productsWithErrors: 0,
    productsWithWarnings: 0,
    imageChecksPassed: 0,
    imageChecksFailed: 0,
    priceParseSuccessRate: 0,
    categoryMapRate: 0,
    normalizationSuccessRate: 0,
    errors: [],
    productResults: [],
  };

  // Step 1: Collect test products
  const products: ScrapedProduct[] = [];

  // Try specific article numbers first
  for (const articleNumber of opts.testArticleNumbers.slice(0, opts.sampleSize)) {
    try {
      const product = await adapter.scrapeProduct(articleNumber);
      products.push(product);
    } catch (err) {
      report.errors.push(`Failed to scrape article ${articleNumber}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // If we need more products, try categories
  if (products.length < opts.sampleSize && opts.testCategories.length > 0) {
    for (const category of opts.testCategories) {
      if (products.length >= opts.sampleSize) break;
      try {
        const categoryProducts = await adapter.scrapeCategory(category);
        const remaining = opts.sampleSize - products.length;
        products.push(...categoryProducts.slice(0, remaining));
      } catch (err) {
        report.errors.push(`Failed to scrape category ${category}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  report.totalProducts = products.length;

  if (products.length === 0) {
    report.errors.push("No products were scraped — validation cannot proceed. Provide testArticleNumbers or testCategories.");
    return finalizeReport(report, startedAt);
  }

  // Step 2: Validate each product
  let priceValidCount = 0;
  let categoryMappedCount = 0;
  let normalizationSuccessCount = 0;

  for (const product of products) {
    const result = await validateProduct(product, adapter, retailerSlug, opts);
    report.productResults.push(result);

    if (result.errors.length === 0) {
      report.validProducts++;
    } else {
      report.productsWithErrors++;
    }

    if (result.warnings.length > 0) {
      report.productsWithWarnings++;
    }

    if (result.priceValid) priceValidCount++;
    if (result.categoryMapped) categoryMappedCount++;
    if (result.normalizedSuccessfully) normalizationSuccessCount++;

    for (const img of result.imageResults) {
      if (img.reachable) {
        report.imageChecksPassed++;
      } else {
        report.imageChecksFailed++;
      }
    }
  }

  // Step 3: Compute summary rates
  report.priceParseSuccessRate = products.length > 0
    ? Math.round((priceValidCount / products.length) * 100)
    : 0;
  report.categoryMapRate = products.length > 0
    ? Math.round((categoryMappedCount / products.length) * 100)
    : 0;
  report.normalizationSuccessRate = products.length > 0
    ? Math.round((normalizationSuccessCount / products.length) * 100)
    : 0;

  // Step 4: Validate rate limit config
  const rateLimit = adapter.getRateLimitConfig();
  if (rateLimit.requestsPerMinute <= 0) {
    report.errors.push("Rate limit config: requestsPerMinute must be positive");
  }
  if (rateLimit.delayBetweenMs < 0) {
    report.errors.push("Rate limit config: delayBetweenMs must be non-negative");
  }
  if (rateLimit.maxConcurrent <= 0) {
    report.errors.push("Rate limit config: maxConcurrent must be positive");
  }

  // Step 5: Validate adapter info
  const info = adapter.info;
  if (!info.slug) report.errors.push("Adapter info: slug is empty");
  if (!info.name) report.errors.push("Adapter info: name is empty");
  if (!info.baseUrl) report.errors.push("Adapter info: baseUrl is empty");
  if (info.baseUrl && !info.baseUrl.startsWith("https://")) {
    report.errors.push("Adapter info: baseUrl should use HTTPS");
  }

  return finalizeReport(report, startedAt);
}

/** Validate a single scraped product. */
async function validateProduct(
  product: ScrapedProduct,
  adapter: RetailerAdapter,
  retailerSlug: string,
  opts: Required<ValidationConfig>
): Promise<ProductValidationResult> {
  const result: ProductValidationResult = {
    articleNumber: product.articleNumber,
    productName: product.name ?? null,
    errors: [],
    warnings: [],
    imageResults: [],
    priceValid: false,
    categoryMapped: false,
    normalizedSuccessfully: false,
  };

  // Validate required fields
  if (!product.articleNumber) {
    result.errors.push("Missing articleNumber");
  }
  if (!product.name) {
    result.warnings.push("Missing product name");
  }

  // Validate price
  if (product.priceCurrent != null) {
    const parsed = parsePrice(product.priceCurrent);
    if (parsed != null && parsed > 0) {
      result.priceValid = true;
    } else {
      result.errors.push(`Price parse failed: "${product.priceCurrent}" -> ${parsed}`);
    }
  } else {
    result.warnings.push("No price available");
  }

  // Validate category mapping
  if (product.categoryPath) {
    const mapped = mapCategory(product.categoryPath, retailerSlug);
    if (mapped) {
      result.categoryMapped = true;
      // Check if it mapped to a unified category vs just normalized the raw path
      if (!mapped.includes(" > ") || mapped !== product.categoryPath) {
        // Successfully mapped to unified category
      } else {
        result.warnings.push(`Category not mapped to unified taxonomy: "${product.categoryPath}" -> "${mapped}"`);
      }
    }
  } else {
    result.warnings.push("No category path available");
  }

  // Validate images
  if (opts.checkImages && product.images && product.images.length > 0) {
    // Check up to 3 images per product to avoid excessive requests
    const imagesToCheck = product.images.slice(0, 3);
    for (const img of imagesToCheck) {
      const imageResult = await checkImageUrl(img.url, opts.imageTimeoutMs);
      result.imageResults.push(imageResult);
      if (!imageResult.reachable) {
        result.warnings.push(`Image unreachable: ${img.url} (${imageResult.statusCode ?? "timeout"})`);
      }
    }
  } else if (!product.images || product.images.length === 0) {
    result.warnings.push("No images found");
  }

  // Validate dimensions
  if (product.productWidth || product.productHeight || product.productDepth) {
    const width = normalizeDimension(product.productWidth);
    const height = normalizeDimension(product.productHeight);
    const depth = normalizeDimension(product.productDepth);
    if (!width && !height && !depth) {
      result.warnings.push("Dimensions present but all normalize to null");
    }
  }

  // Validate normalization
  try {
    const normalized: NormalizedProduct = adapter.normalizeProduct(product);
    if (normalized.articleNumber && normalized.sourceRetailer === retailerSlug) {
      result.normalizedSuccessfully = true;
    } else {
      result.errors.push("Normalization produced invalid output (missing articleNumber or wrong retailer)");
    }
  } catch (err) {
    result.errors.push(`Normalization threw: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}

/** Check if an image URL is reachable via HEAD request. */
async function checkImageUrl(url: string, timeoutMs: number): Promise<ImageCheckResult> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "GuidBot/1.0 (image validation)",
      },
    });

    return {
      url,
      reachable: response.ok,
      statusCode: response.status,
      contentType: response.headers.get("content-type"),
    };
  } catch {
    return {
      url,
      reachable: false,
      statusCode: null,
      contentType: null,
    };
  }
}

/** Create a minimal error report when the adapter can't even be loaded. */
function createErrorReport(
  retailerSlug: string,
  error: string,
  startedAt: Date
): AdapterValidationReport {
  return {
    retailerSlug,
    retailerName: retailerSlug,
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    totalProducts: 0,
    validProducts: 0,
    productsWithErrors: 0,
    productsWithWarnings: 0,
    imageChecksPassed: 0,
    imageChecksFailed: 0,
    priceParseSuccessRate: 0,
    categoryMapRate: 0,
    normalizationSuccessRate: 0,
    errors: [error],
    productResults: [],
  };
}

/** Finalize the report with timing data. */
function finalizeReport(
  report: AdapterValidationReport,
  startedAt: Date
): AdapterValidationReport {
  const completedAt = new Date();
  report.completedAt = completedAt.toISOString();
  report.durationMs = completedAt.getTime() - startedAt.getTime();
  return report;
}
