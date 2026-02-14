import { prisma } from "@/lib/prisma";
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

// ─── Target Adapter ───

const TARGET_INFO: RetailerInfo = {
  slug: "target",
  name: "Target",
  baseUrl: "https://www.target.com",
  logoUrl: "/icons/target-logo.svg",
};

const TARGET_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 20,
  delayBetweenMs: 3000,
  maxConcurrent: 2,
};

/** Target Redsky API base URL for product data. */
const REDSKY_API = "https://redsky.target.com/redsky_aggregations/v1";

/**
 * Target adapter — handles Target product data via the Redsky API
 * and page scraping for supplemental data.
 *
 * Key Target-specific concerns:
 * - TCIN (Target.com Item Number) is the primary identifier (8-digit).
 * - DPCI (Department-Class-Item) is the secondary identifier (xxx-xx-xxxx).
 * - Target's SPA renders most data client-side; we prefer the Redsky API
 *   for structured data and fall back to JSON-LD from pre-rendered HTML.
 * - Images served from target.scene7.com CDN.
 * - Assembly documents are occasionally available in product details.
 */
export class TargetAdapter implements RetailerAdapter {
  readonly info: RetailerInfo = TARGET_INFO;

  /**
   * Detect new Target products by checking recently added products
   * in the database for this retailer.
   */
  async detectNewProducts(sinceDays: number): Promise<NewProduct[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - sinceDays);

    const retailer = await prisma.retailer.findUnique({
      where: { slug: "target" },
    });
    if (!retailer) return [];

    const recentProducts = await prisma.product.findMany({
      where: {
        retailerId: retailer.id,
        first_detected_at: { gte: cutoff },
      },
      select: {
        id: true,
        article_number: true,
        documents: {
          where: { document_type: "assembly_instructions" },
          select: { id: true },
        },
      },
    });

    return recentProducts.map((p) => ({
      articleNumber: p.article_number,
      productId: p.id,
      hasAssemblyDoc: p.documents.length > 0,
      isNew: true,
    }));
  }

  /**
   * Fetch a single Target product by TCIN using the Redsky API.
   * Falls back to HTML scraping if the API is unavailable.
   */
  async scrapeProduct(articleNumber: string): Promise<ScrapedProduct> {
    const tcin = this.normalizeTcin(articleNumber);

    // Try Redsky API first
    try {
      return await this.fetchFromRedskyApi(tcin);
    } catch {
      // Fallback to HTML page scraping
      return await this.fetchFromProductPage(tcin);
    }
  }

  /**
   * Scrape products from a Target category page.
   * Target categories use numeric category IDs in their URLs.
   */
  async scrapeCategory(categoryPath: string): Promise<ScrapedProduct[]> {
    const url = `${TARGET_INFO.baseUrl}/c/${categoryPath.replace(/\s*>\s*/g, "/")}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "GuidBot/1.0 (assembly guide indexer)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Target category scrape failed for ${categoryPath}: HTTP ${response.status}`);
    }

    const html = await response.text();
    const tcins = this.extractCategoryTcins(html);

    const products: ScrapedProduct[] = [];
    for (const tcin of tcins) {
      try {
        const product = await this.scrapeProduct(tcin);
        products.push(product);
      } catch {
        // Individual product failures don't block the batch
      }
    }

    return products;
  }

  /**
   * Extract documents (assembly PDFs, manuals) for a Target product.
   */
  async extractDocuments(productId: number): Promise<ScrapedDocument[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { article_number: true, source_url: true },
    });
    if (!product) return [];

    const sourceUrl = product.source_url ?? `${TARGET_INFO.baseUrl}/p/-/A-${product.article_number}`;

    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "GuidBot/1.0 (assembly guide indexer)",
        Accept: "text/html",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    return this.parseDocumentLinks(html);
  }

  /**
   * Extract product images from Target.
   * Images are served from target.scene7.com CDN.
   */
  async extractImages(productId: number): Promise<ScrapedImage[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { article_number: true },
    });
    if (!product) return [];

    try {
      const response = await this.callRedskyApi(product.article_number);
      const item = response?.data?.product;
      if (!item) return [];

      return this.parseRedskyImages(item);
    } catch {
      return [];
    }
  }

  getRateLimitConfig(): RateLimitConfig {
    return TARGET_RATE_LIMIT;
  }

  normalizeProduct(raw: unknown): NormalizedProduct {
    const scraped = raw as ScrapedProduct;
    const normalized = sharedNormalize(scraped, "target");

    // Target-specific: TCIN as article number, extract DPCI as manufacturer SKU
    normalized.manufacturerSku = scraped.articleNumber;

    return normalized;
  }

  // ─── Redsky API Helpers ───

  /**
   * Fetch product data from Target's Redsky API.
   * This is an internal API that powers Target.com's product pages.
   */
  private async fetchFromRedskyApi(tcin: string): Promise<ScrapedProduct> {
    const response = await this.callRedskyApi(tcin);
    const item = response?.data?.product;

    if (!item) {
      throw new Error(`Target Redsky API returned no data for TCIN ${tcin}`);
    }

    return this.parseRedskyProduct(item, tcin);
  }

  /** Call the Redsky API for a specific TCIN. */
  private async callRedskyApi(tcin: string): Promise<RedskyResponse> {
    const apiKey = process.env.TARGET_API_KEY;
    if (!apiKey) {
      throw new Error("Target API key not configured. Set TARGET_API_KEY.");
    }

    const url = new URL(`${REDSKY_API}/pdp_client_v1`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("tcin", tcin);
    url.searchParams.set("pricing_store_id", "3991");
    url.searchParams.set("has_pricing_store_id", "true");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "GuidBot/1.0 (assembly guide indexer)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Target Redsky API failed for TCIN ${tcin}: HTTP ${response.status}`);
    }

    return response.json() as Promise<RedskyResponse>;
  }

  /** Parse a Redsky API product response into a ScrapedProduct. */
  private parseRedskyProduct(item: RedskyProduct, tcin: string): ScrapedProduct {
    const product: ScrapedProduct = {
      articleNumber: tcin,
      name: item.item?.product_description?.title ?? "",
      description: item.item?.product_description?.downstream_description ?? undefined,
      sourceUrl: `${TARGET_INFO.baseUrl}/p/-/A-${tcin}`,
    };

    // Price
    if (item.price?.formatted_current_price) {
      const priceStr = item.price.formatted_current_price;
      const priceMatch = priceStr.match(/\$?([\d,.]+)/);
      if (priceMatch) {
        product.priceCurrent = parseFloat(priceMatch[1].replace(/,/g, ""));
      }
      product.priceCurrency = "USD";
    }
    if (item.price?.formatted_comparison_price) {
      const origMatch = item.price.formatted_comparison_price.match(/\$?([\d,.]+)/);
      if (origMatch) {
        product.priceOriginal = parseFloat(origMatch[1].replace(/,/g, ""));
      }
    }

    // Rating
    if (item.ratings_and_reviews?.statistics) {
      const stats = item.ratings_and_reviews.statistics;
      product.avgRating = stats.rating?.average;
      product.reviewCount = stats.rating?.count;
    }

    // Brand
    if (item.item?.product_description?.bullet_descriptions) {
      for (const bullet of item.item.product_description.bullet_descriptions) {
        const brandMatch = bullet.match(/Brand:\s*([^<]+)/i);
        if (brandMatch) {
          product.designer = brandMatch[1].trim();
          break;
        }
      }
    }

    // Category / breadcrumbs from taxonomy
    if (item.item?.product_classification?.product_type_name) {
      product.categoryPath = item.item.product_classification.product_type_name;
    }

    // Dimensions from product details
    if (item.item?.enrichment?.buy_url) {
      product.sourceUrl = item.item.enrichment.buy_url;
    }

    // Bullet descriptions for specs extraction
    if (item.item?.product_description?.bullet_descriptions) {
      for (const bullet of item.item.product_description.bullet_descriptions) {
        const stripped = bullet.replace(/<[^>]+>/g, "").trim();

        const dimMatch = stripped.match(/Dimensions.*?:\s*(.+)/i);
        if (dimMatch) {
          const dims = dimMatch[1];
          const heightMatch = dims.match(/([\d.]+)\s*(?:inches|in|")\s*H/i);
          const widthMatch = dims.match(/([\d.]+)\s*(?:inches|in|")\s*W/i);
          const depthMatch = dims.match(/([\d.]+)\s*(?:inches|in|")\s*D/i);
          if (heightMatch) product.productHeight = `${heightMatch[1]} in`;
          if (widthMatch) product.productWidth = `${widthMatch[1]} in`;
          if (depthMatch) product.productDepth = `${depthMatch[1]} in`;
        }

        const weightMatch = stripped.match(/Weight:\s*([\d.]+)\s*(lbs?|pounds?|oz|kg)/i);
        if (weightMatch) {
          product.productWeight = `${weightMatch[1]} ${weightMatch[2]}`;
        }

        const materialMatch = stripped.match(/Material:\s*(.+)/i);
        if (materialMatch) {
          product.materials = materialMatch[1].trim();
        }

        if (/assembly required/i.test(stripped)) {
          product.assemblyRequired = true;
        } else if (/no assembly|fully assembled/i.test(stripped)) {
          product.assemblyRequired = false;
        }

        if (/color/i.test(stripped)) {
          const colorMatch = stripped.match(/Color:\s*(.+)/i);
          if (colorMatch) product.color = colorMatch[1].trim();
        }
      }
    }

    // Images
    product.images = this.parseRedskyImages(item);

    return product;
  }

  /** Extract images from Redsky API product data. */
  private parseRedskyImages(item: RedskyProduct): ScrapedImage[] {
    const images: ScrapedImage[] = [];

    if (item.item?.enrichment?.images) {
      const imgData = item.item.enrichment.images;

      // Primary image
      if (imgData.primary_image_url) {
        images.push({
          url: imgData.primary_image_url,
          altText: "Primary product image",
          sortOrder: 0,
        });
      }

      // Alternate images
      if (imgData.alternate_image_urls) {
        for (let i = 0; i < imgData.alternate_image_urls.length; i++) {
          images.push({
            url: imgData.alternate_image_urls[i],
            sortOrder: i + 1,
          });
        }
      }
    }

    return images;
  }

  // ─── HTML Fallback ───

  /** Fetch product data from the Target product page HTML as a fallback. */
  private async fetchFromProductPage(tcin: string): Promise<ScrapedProduct> {
    const url = `${TARGET_INFO.baseUrl}/p/-/A-${tcin}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "GuidBot/1.0 (assembly guide indexer)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Target page scrape failed for TCIN ${tcin}: HTTP ${response.status}`);
    }

    const html = await response.text();
    return this.parseProductPage(html, tcin);
  }

  /** Parse a Target product page HTML into a ScrapedProduct. */
  private parseProductPage(html: string, tcin: string): ScrapedProduct {
    const product: ScrapedProduct = {
      articleNumber: tcin,
      name: "",
      sourceUrl: `${TARGET_INFO.baseUrl}/p/-/A-${tcin}`,
    };

    // Extract JSON-LD structured data (Target embeds product data this way)
    const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const jsonLd = JSON.parse(match[1]);
        const productData = jsonLd["@type"] === "Product" ? jsonLd : null;
        if (productData) {
          product.name = productData.name ?? "";
          product.description = productData.description;

          if (productData.offers) {
            const offer = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
            product.priceCurrent = parseFloat(offer.price);
            product.priceCurrency = offer.priceCurrency ?? "USD";
          }

          if (productData.aggregateRating) {
            product.avgRating = parseFloat(productData.aggregateRating.ratingValue);
            product.reviewCount = parseInt(productData.aggregateRating.reviewCount, 10);
          }

          if (productData.brand?.name) {
            product.designer = productData.brand.name;
          }

          if (productData.image) {
            const images = Array.isArray(productData.image) ? productData.image : [productData.image];
            product.images = images.map((url: string, i: number) => ({
              url,
              sortOrder: i,
            }));
          }

          if (productData.sku) {
            product.articleNumber = String(productData.sku);
          }

          break;
        }
      } catch {
        // Non-fatal JSON parse error
      }
    }

    // Fallback: extract name from title
    if (!product.name) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        product.name = titleMatch[1].replace(/\s*:\s*Target.*$/, "").trim();
      }
    }

    // Extract category from breadcrumbs
    const breadcrumbMatch = html.match(/<nav[^>]*aria-label="[Bb]readcrumb"[^>]*>([\s\S]*?)<\/nav>/i);
    if (breadcrumbMatch) {
      const crumbs = breadcrumbMatch[1].match(/>([^<]+)</g);
      if (crumbs) {
        product.categoryPath = crumbs
          .map((c) => c.replace(/^>/, "").trim())
          .filter((c) => c && c !== "Target" && !c.includes("..."))
          .join(" > ");
      }
    }

    // Extract documents
    product.documents = this.parseDocumentLinks(html);

    return product;
  }

  // ─── Shared Helpers ───

  /** Normalize a TCIN or DPCI to standard TCIN format. */
  private normalizeTcin(input: string): string {
    const cleaned = input.trim();

    // Already a TCIN (8-digit number)
    if (/^\d{8}$/.test(cleaned)) return cleaned;

    // DPCI format: xxx-xx-xxxx — extract as-is, we'll use it in URLs
    if (/^\d{3}-\d{2}-\d{4}$/.test(cleaned)) return cleaned;

    // Extract from URL
    const tcinMatch = cleaned.match(/A-(\d{8})/);
    if (tcinMatch) return tcinMatch[1];

    return cleaned;
  }

  /** Extract TCINs from a Target category page. */
  private extractCategoryTcins(html: string): string[] {
    const tcins: string[] = [];

    // Look for TCINs in data attributes
    const tcinMatches = html.matchAll(/data-tcin="(\d{8})"/g);
    for (const match of tcinMatches) {
      tcins.push(match[1]);
    }

    // Fallback: extract from product URLs
    if (tcins.length === 0) {
      const urlMatches = html.matchAll(/\/A-(\d{8})/g);
      for (const match of urlMatches) {
        tcins.push(match[1]);
      }
    }

    return [...new Set(tcins)];
  }

  /** Parse document (PDF) links from a Target product page. */
  private parseDocumentLinks(html: string): ScrapedDocument[] {
    const docs: ScrapedDocument[] = [];
    const seen = new Set<string>();

    const pdfMatches = html.matchAll(/href="(https?:\/\/[^"]*\.pdf[^"]*)"/gi);
    for (const match of pdfMatches) {
      const url = match[1];
      if (seen.has(url)) continue;
      seen.add(url);

      const context = html.substring(Math.max(0, match.index! - 200), match.index! + 300);
      const isAssembly = /assembl|instruct|manual|setup/i.test(url) ||
        /assembl|instruct|manual|setup/i.test(context);

      docs.push({
        documentType: isAssembly ? "assembly_instructions" : "product_manual",
        sourceUrl: url,
      });
    }

    return docs;
  }
}

// ─── Redsky API Response Types ───

interface RedskyResponse {
  data?: {
    product?: RedskyProduct;
  };
}

interface RedskyProduct {
  tcin?: string;
  item?: {
    product_description?: {
      title?: string;
      downstream_description?: string;
      bullet_descriptions?: string[];
    };
    product_classification?: {
      product_type_name?: string;
    };
    enrichment?: {
      buy_url?: string;
      images?: {
        primary_image_url?: string;
        alternate_image_urls?: string[];
      };
    };
  };
  price?: {
    formatted_current_price?: string;
    formatted_comparison_price?: string;
  };
  ratings_and_reviews?: {
    statistics?: {
      rating?: {
        average?: number;
        count?: number;
      };
    };
  };
}
