// ─── Phase 5: Multi-Retailer Adapter Types ───

/** Metadata about a retailer — used for display and routing. */
export interface RetailerInfo {
  slug: string;
  name: string;
  baseUrl: string;
  logoUrl?: string;
}

/** A newly-detected product from a catalog scan. */
export interface NewProduct {
  articleNumber: string;
  productId?: number;
  hasAssemblyDoc: boolean;
  isNew: boolean;
}

/** Raw scraped product data from a retailer, before normalization. */
export interface ScrapedProduct {
  articleNumber: string;
  name: string;
  type?: string;
  description?: string;
  priceCurrency?: string;
  priceCurrent?: number;
  priceOriginal?: number;
  color?: string;
  designer?: string;
  assemblyRequired?: boolean;
  avgRating?: number;
  reviewCount?: number;
  categoryPath?: string;
  style?: string;
  goodToKnow?: string;
  materials?: string;
  careInstructions?: string;
  importantNotes?: string;
  productWidth?: string;
  productHeight?: string;
  productDepth?: string;
  productLength?: string;
  productWeight?: string;
  packageWidth?: string;
  packageHeight?: string;
  packageLength?: string;
  packageWeight?: string;
  highlightedReviews?: unknown;
  variants?: unknown;
  keyFacts?: unknown;
  recommendedAccessories?: unknown;
  sourceUrl?: string;
  images?: ScrapedImage[];
  documents?: ScrapedDocument[];
}

/** A document (PDF, manual, etc.) associated with a product. */
export interface ScrapedDocument {
  documentType: string;
  sourceUrl: string;
  fileHash?: string;
  pageCount?: number;
}

/** An image associated with a product. */
export interface ScrapedImage {
  url: string;
  altText?: string;
  sortOrder?: number;
}

/** Per-adapter rate limiting configuration. */
export interface RateLimitConfig {
  requestsPerMinute: number;
  delayBetweenMs: number;
  maxConcurrent: number;
}

/** Normalized product data ready for Prisma upsert. */
export interface NormalizedProduct {
  articleNumber: string;
  productName: string | null;
  productType: string | null;
  description: string | null;
  priceCurrency: string;
  priceCurrent: number | null;
  priceOriginal: number | null;
  color: string | null;
  designer: string | null;
  assemblyRequired: boolean | null;
  avgRating: number | null;
  reviewCount: number | null;
  categoryPath: string | null;
  style: string | null;
  goodToKnow: string | null;
  materials: string | null;
  careInstructions: string | null;
  importantNotes: string | null;
  productWidth: string | null;
  productHeight: string | null;
  productDepth: string | null;
  productLength: string | null;
  productWeight: string | null;
  packageWidth: string | null;
  packageHeight: string | null;
  packageLength: string | null;
  packageWeight: string | null;
  highlightedReviews: unknown;
  variants: unknown;
  keyFacts: unknown;
  recommendedAccessories: unknown;
  sourceUrl: string | null;
  sourceRetailer: string;
  manufacturerSku: string | null;
  upcEan: string | null;
}

/**
 * The contract every retailer adapter must implement.
 *
 * Each adapter encapsulates all retailer-specific scraping, parsing,
 * and normalization logic behind this uniform interface.
 */
export interface RetailerAdapter {
  /** Static info about this retailer. */
  readonly info: RetailerInfo;

  /** Detect products added to the retailer since `sinceDays` ago. */
  detectNewProducts(sinceDays: number): Promise<NewProduct[]>;

  /** Scrape a single product by article number. */
  scrapeProduct(articleNumber: string): Promise<ScrapedProduct>;

  /** Scrape all products in a category. */
  scrapeCategory(categoryPath: string): Promise<ScrapedProduct[]>;

  /** Extract documents (PDFs, manuals) for a product. */
  extractDocuments(productId: number): Promise<ScrapedDocument[]>;

  /** Extract images for a product. */
  extractImages(productId: number): Promise<ScrapedImage[]>;

  /** Return the rate limit config for this retailer. */
  getRateLimitConfig(): RateLimitConfig;

  /** Normalize raw scraped data into the canonical product shape. */
  normalizeProduct(raw: unknown): NormalizedProduct;
}
