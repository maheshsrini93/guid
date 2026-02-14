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

// ─── Home Depot Adapter ───

const HOMEDEPOT_INFO: RetailerInfo = {
  slug: "homedepot",
  name: "Home Depot",
  baseUrl: "https://www.homedepot.com",
  logoUrl: "/icons/homedepot-logo.svg",
};

const HOMEDEPOT_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 15,
  delayBetweenMs: 4000,
  maxConcurrent: 2,
};

/**
 * Home Depot adapter — handles Home Depot product scraping and normalization.
 *
 * Key Home Depot-specific concerns:
 * - Multi-tab product pages: main details, specifications, and documents
 *   are in separate tabs loaded via AJAX or embedded in the page.
 * - Internet Number (e.g., "320765432") is the primary product identifier.
 * - Model Number and Store SKU are secondary identifiers.
 * - Assembly docs are often in the "Manuals & Documents" tab.
 * - Images served from images.thdstatic.com CDN.
 * - Specifications are in a structured key-value table.
 */
export class HomeDepotAdapter implements RetailerAdapter {
  readonly info: RetailerInfo = HOMEDEPOT_INFO;

  /**
   * Detect new Home Depot products by checking recently added products
   * in the database for this retailer.
   */
  async detectNewProducts(sinceDays: number): Promise<NewProduct[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - sinceDays);

    const retailer = await prisma.retailer.findUnique({
      where: { slug: "homedepot" },
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
   * Scrape a single Home Depot product by its Internet Number.
   *
   * Home Depot product pages have a multi-tab layout with product details,
   * specifications, and documents in separate sections. The page contains
   * structured data in JSON-LD and detailed specs in a dedicated table.
   */
  async scrapeProduct(articleNumber: string): Promise<ScrapedProduct> {
    const url = `${HOMEDEPOT_INFO.baseUrl}/p/${articleNumber}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "GuidBot/1.0 (assembly guide indexer)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Home Depot scrape failed for ${articleNumber}: HTTP ${response.status}`);
    }

    const html = await response.text();
    return this.parseProductPage(html, articleNumber);
  }

  /**
   * Scrape all products in a Home Depot category.
   * Home Depot categories use N-codes (e.g., "N-5yc1vZc7ot").
   */
  async scrapeCategory(categoryPath: string): Promise<ScrapedProduct[]> {
    const url = `${HOMEDEPOT_INFO.baseUrl}/b/${categoryPath.replace(/\s*>\s*/g, "/")}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "GuidBot/1.0 (assembly guide indexer)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Home Depot category scrape failed for ${categoryPath}: HTTP ${response.status}`);
    }

    const html = await response.text();
    const productIds = this.extractCategoryProductIds(html);

    const products: ScrapedProduct[] = [];
    for (const id of productIds) {
      try {
        const product = await this.scrapeProduct(id);
        products.push(product);
      } catch {
        // Individual product failures don't block the batch
      }
    }

    return products;
  }

  /**
   * Extract documents (assembly PDFs, manuals) for a Home Depot product.
   * Home Depot typically has a "Manuals & Documents" tab with PDF links.
   */
  async extractDocuments(productId: number): Promise<ScrapedDocument[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { article_number: true, source_url: true },
    });
    if (!product) return [];

    const sourceUrl = product.source_url ?? `${HOMEDEPOT_INFO.baseUrl}/p/${product.article_number}`;

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
   * Extract product images from a Home Depot product page.
   * Images are served from images.thdstatic.com CDN.
   */
  async extractImages(productId: number): Promise<ScrapedImage[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { article_number: true, source_url: true },
    });
    if (!product) return [];

    const sourceUrl = product.source_url ?? `${HOMEDEPOT_INFO.baseUrl}/p/${product.article_number}`;

    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "GuidBot/1.0 (assembly guide indexer)",
        Accept: "text/html",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    return this.parseImageUrls(html);
  }

  getRateLimitConfig(): RateLimitConfig {
    return HOMEDEPOT_RATE_LIMIT;
  }

  normalizeProduct(raw: unknown): NormalizedProduct {
    const scraped = raw as ScrapedProduct;
    const normalized = sharedNormalize(scraped, "homedepot");

    // Home Depot-specific: extract model number as manufacturer SKU
    // Internet Number is stored as articleNumber; model number is the true manufacturer ID
    if (scraped.articleNumber) {
      normalized.manufacturerSku = scraped.articleNumber;
    }

    return normalized;
  }

  // ─── Private Parsing Helpers ───

  /** Parse a Home Depot product page HTML into a ScrapedProduct. */
  private parseProductPage(html: string, articleNumber: string): ScrapedProduct {
    const product: ScrapedProduct = {
      articleNumber,
      name: "",
      sourceUrl: `${HOMEDEPOT_INFO.baseUrl}/p/${articleNumber}`,
    };

    // Extract JSON-LD structured data
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
          if (productData.sku) {
            product.articleNumber = String(productData.sku);
          }
          if (productData.image) {
            const images = Array.isArray(productData.image) ? productData.image : [productData.image];
            product.images = images.map((url: string, i: number) => ({
              url,
              sortOrder: i,
            }));
          }
          break; // Found product data
        }
      } catch {
        // Non-fatal JSON parse error
      }
    }

    // Fallback: extract name from title
    if (!product.name) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        product.name = titleMatch[1].replace(/\s*-\s*The Home Depot.*$/, "").trim();
      }
    }

    // Extract category from breadcrumbs
    const breadcrumbMatch = html.match(/<nav[^>]*aria-label="[Bb]readcrumb"[^>]*>([\s\S]*?)<\/nav>/i);
    if (breadcrumbMatch) {
      const crumbs = breadcrumbMatch[1].match(/>([^<]+)</g);
      if (crumbs) {
        product.categoryPath = crumbs
          .map((c) => c.replace(/^>/, "").trim())
          .filter((c) => c && c !== "Home" && !c.includes("..."))
          .join(" > ");
      }
    }

    // Extract specifications from specs section
    this.parseSpecifications(html, product);

    // Extract documents
    product.documents = this.parseDocumentLinks(html);

    // Check assembly requirement
    if (html.includes("Assembly Required") || (html.includes(">Yes<") && html.includes("Assembly"))) {
      product.assemblyRequired = true;
    } else if (html.includes("No Assembly") || html.includes("Pre-Assembled")) {
      product.assemblyRequired = false;
    }

    return product;
  }

  /** Parse the specifications tab content into product fields. */
  private parseSpecifications(html: string, product: ScrapedProduct): void {
    // Home Depot specs are in key-value pairs, often in a table or div grid
    const specPatterns: Array<{ pattern: RegExp; field: keyof ScrapedProduct }> = [
      { pattern: /Product\s+Width[^:]*:\s*([^<]+)/i, field: "productWidth" },
      { pattern: /Product\s+Height[^:]*:\s*([^<]+)/i, field: "productHeight" },
      { pattern: /Product\s+Depth[^:]*:\s*([^<]+)/i, field: "productDepth" },
      { pattern: /Product\s+Length[^:]*:\s*([^<]+)/i, field: "productLength" },
      { pattern: /(?:Product\s+)?Weight\s*\(lbs?\.\)[^:]*:\s*([^<]+)/i, field: "productWeight" },
      { pattern: /(?:Package\s+)?Width[^:]*:\s*([^<]+)/i, field: "packageWidth" },
      { pattern: /(?:Package\s+)?Height[^:]*:\s*([^<]+)/i, field: "packageHeight" },
      { pattern: /(?:Package\s+)?Length[^:]*:\s*([^<]+)/i, field: "packageLength" },
      { pattern: /(?:Package\s+)?Weight[^:]*:\s*([^<]+)/i, field: "packageWeight" },
      { pattern: /(?:Primary\s+)?Material[^:]*:\s*([^<]+)/i, field: "materials" },
      { pattern: /Color(?:\s+Family)?[^:]*:\s*([^<]+)/i, field: "color" },
      { pattern: /Style[^:]*:\s*([^<]+)/i, field: "style" },
    ];

    for (const { pattern, field } of specPatterns) {
      const match = html.match(pattern);
      if (match && !product[field]) {
        (product[field] as string) = match[1].trim();
      }
    }
  }

  /** Extract product IDs from a Home Depot category page. */
  private extractCategoryProductIds(html: string): string[] {
    const ids: string[] = [];

    // Home Depot product cards contain data-itemid or similar attributes
    const idMatches = html.matchAll(/data-itemid="(\d+)"/g);
    for (const match of idMatches) {
      ids.push(match[1]);
    }

    // Fallback: extract from product URLs
    if (ids.length === 0) {
      const urlMatches = html.matchAll(/\/p\/[^/]+\/(\d{9})/g);
      for (const match of urlMatches) {
        ids.push(match[1]);
      }
    }

    return [...new Set(ids)];
  }

  /** Parse document (PDF) links from a Home Depot product page. */
  private parseDocumentLinks(html: string): ScrapedDocument[] {
    const docs: ScrapedDocument[] = [];
    const seen = new Set<string>();

    // Home Depot PDFs are typically in the "Manuals & Documents" section
    const pdfMatches = html.matchAll(/href="(https?:\/\/[^"]*\.pdf[^"]*)"/gi);
    for (const match of pdfMatches) {
      const url = match[1];
      if (seen.has(url)) continue;
      seen.add(url);

      const context = html.substring(Math.max(0, match.index! - 200), match.index! + 300);
      const isAssembly = /assembl|instruct|installation|setup/i.test(url) ||
        /assembl|instruct|installation|setup/i.test(context);
      const isWarranty = /warrant/i.test(url) || /warrant/i.test(context);
      const isSpec = /spec(?:ification)?/i.test(url) || /spec(?:ification)?/i.test(context);

      let docType = "product_manual";
      if (isAssembly) docType = "assembly_instructions";
      else if (isWarranty) docType = "warranty";
      else if (isSpec) docType = "specification_sheet";

      docs.push({
        documentType: docType,
        sourceUrl: url,
      });
    }

    return docs;
  }

  /** Parse image URLs from a Home Depot product page. */
  private parseImageUrls(html: string): ScrapedImage[] {
    const images: ScrapedImage[] = [];
    const seen = new Set<string>();

    // JSON-LD images first
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd["@type"] === "Product" && jsonLd.image) {
          const jsonImages = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
          for (let i = 0; i < jsonImages.length; i++) {
            const url = jsonImages[i];
            if (!seen.has(url)) {
              seen.add(url);
              images.push({ url, sortOrder: i });
            }
          }
        }
      } catch {
        // Non-fatal
      }
    }

    // Fallback: thdstatic.com CDN images
    const imgMatches = html.matchAll(/src="(https:\/\/images\.thdstatic\.com[^"]*\.(?:jpg|png|webp)[^"]*)"/gi);
    for (const match of imgMatches) {
      const url = match[1];
      if (!seen.has(url) && !url.includes("icon") && !url.includes("logo")) {
        seen.add(url);
        images.push({ url, sortOrder: images.length });
      }
    }

    return images;
  }
}
