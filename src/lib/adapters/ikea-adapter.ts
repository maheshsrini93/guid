import { detectNewProducts } from "@/lib/catalog-sync";
import { normalizeProduct as sharedNormalize } from "./normalizer";
import type {
  RetailerAdapter,
  RetailerInfo,
  NewProduct,
  ScrapedProduct,
  ScrapedDocument,
  ScrapedImage,
  RateLimitConfig,
  NormalizedProduct,
} from "./types";

const IKEA_INFO: RetailerInfo = {
  slug: "ikea",
  name: "IKEA",
  baseUrl: "https://www.ikea.com",
  logoUrl: "/icons/ikea-logo.svg",
};

const IKEA_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 30,
  delayBetweenMs: 2000,
  maxConcurrent: 3,
};

/**
 * IKEA adapter — wraps the existing catalog-sync detection logic.
 *
 * Scraping is handled by the external IKEA scraper project, so
 * scrapeProduct/scrapeCategory/extractDocuments/extractImages are stubs.
 */
export class IkeaAdapter implements RetailerAdapter {
  readonly info: RetailerInfo = IKEA_INFO;

  async detectNewProducts(sinceDays: number): Promise<NewProduct[]> {
    return detectNewProducts(sinceDays);
  }

  async scrapeProduct(_articleNumber: string): Promise<ScrapedProduct> {
    throw new Error("Not implemented: IKEA uses external scraper");
  }

  async scrapeCategory(_categoryPath: string): Promise<ScrapedProduct[]> {
    throw new Error("Not implemented: IKEA uses external scraper");
  }

  async extractDocuments(_productId: number): Promise<ScrapedDocument[]> {
    throw new Error("Not implemented: IKEA uses external scraper");
  }

  async extractImages(_productId: number): Promise<ScrapedImage[]> {
    throw new Error("Not implemented: IKEA uses external scraper");
  }

  getRateLimitConfig(): RateLimitConfig {
    return IKEA_RATE_LIMIT;
  }

  normalizeProduct(raw: unknown): NormalizedProduct {
    return sharedNormalize(raw as ScrapedProduct, "ikea");
  }
}
