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

// ─── Wayfair Adapter ───

const WAYFAIR_INFO: RetailerInfo = {
  slug: "wayfair",
  name: "Wayfair",
  baseUrl: "https://www.wayfair.com",
  logoUrl: "/icons/wayfair-logo.svg",
};

const WAYFAIR_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 20,
  delayBetweenMs: 3000,
  maxConcurrent: 2,
};

/**
 * Wayfair adapter — handles Wayfair product scraping and normalization.
 *
 * Key Wayfair-specific concerns:
 * - Variant explosion: many color/size variants map to the same assembly.
 *   We normalize to one product per unique assembly (by SKU prefix).
 * - Multi-seller listings: brand must be extracted from product attributes,
 *   not the seller name.
 * - Wayfair uses SKU numbers (e.g., "W001234567") as primary identifiers.
 * - Images served from secure.img1-fg.wfcdn.com and similar CDNs.
 * - Assembly documents sometimes linked in "Product Information" section.
 */
export class WayfairAdapter implements RetailerAdapter {
  readonly info: RetailerInfo = WAYFAIR_INFO;

  /**
   * Detect new Wayfair products by comparing the retailer catalog
   * against existing products in the database for this retailer.
   */
  async detectNewProducts(sinceDays: number): Promise<NewProduct[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - sinceDays);

    // Find Wayfair products added since cutoff
    const retailer = await prisma.retailer.findUnique({
      where: { slug: "wayfair" },
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
   * Scrape a single Wayfair product by its SKU number.
   *
   * Wayfair product pages contain structured data in JSON-LD and
   * product details in specific DOM selectors. Variants (color/size)
   * are collapsed to the base SKU for assembly purposes.
   */
  async scrapeProduct(articleNumber: string): Promise<ScrapedProduct> {
    const url = `${WAYFAIR_INFO.baseUrl}/keyword.html?keyword=${encodeURIComponent(articleNumber)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "GuidBot/1.0 (assembly guide indexer)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Wayfair scrape failed for ${articleNumber}: HTTP ${response.status}`);
    }

    const html = await response.text();
    return this.parseProductPage(html, articleNumber);
  }

  /**
   * Scrape all products in a Wayfair category.
   * Wayfair categories use browse paths like "Furniture/Living-Room-Furniture/Sofas".
   */
  async scrapeCategory(categoryPath: string): Promise<ScrapedProduct[]> {
    const url = `${WAYFAIR_INFO.baseUrl}/sb0/${categoryPath.replace(/\s*>\s*/g, "/")}.html`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "GuidBot/1.0 (assembly guide indexer)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Wayfair category scrape failed for ${categoryPath}: HTTP ${response.status}`);
    }

    const html = await response.text();
    const skus = this.extractCategorySkus(html);

    const products: ScrapedProduct[] = [];
    for (const sku of skus) {
      try {
        const product = await this.scrapeProduct(sku);
        products.push(product);
      } catch {
        // Individual product failures don't block the batch
      }
    }

    return products;
  }

  /**
   * Extract assembly documents (PDFs, manuals) for a Wayfair product.
   * Wayfair sometimes has assembly PDFs in the "Product Information" section.
   */
  async extractDocuments(productId: number): Promise<ScrapedDocument[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { article_number: true, source_url: true },
    });
    if (!product) return [];

    const sourceUrl = product.source_url ?? `${WAYFAIR_INFO.baseUrl}/keyword.html?keyword=${product.article_number}`;

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
   * Extract product images from a Wayfair product page.
   * Images are served from wfcdn.com CDN with multiple size variants.
   */
  async extractImages(productId: number): Promise<ScrapedImage[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { article_number: true, source_url: true },
    });
    if (!product) return [];

    const sourceUrl = product.source_url ?? `${WAYFAIR_INFO.baseUrl}/keyword.html?keyword=${product.article_number}`;

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
    return WAYFAIR_RATE_LIMIT;
  }

  normalizeProduct(raw: unknown): NormalizedProduct {
    const scraped = raw as ScrapedProduct;
    const normalized = sharedNormalize(scraped, "wayfair");

    // Wayfair-specific: extract manufacturer SKU from article number prefix
    // Wayfair SKUs like "W001234567" — strip the variant suffix for assembly grouping
    if (scraped.articleNumber) {
      const baseSkuMatch = scraped.articleNumber.match(/^([A-Z]+\d{6,})/);
      normalized.manufacturerSku = baseSkuMatch ? baseSkuMatch[1] : scraped.articleNumber;
    }

    return normalized;
  }

  // ─── Private Parsing Helpers ───

  /** Parse a Wayfair product page HTML into a ScrapedProduct. */
  private parseProductPage(html: string, articleNumber: string): ScrapedProduct {
    const product: ScrapedProduct = {
      articleNumber,
      name: "",
      sourceUrl: `${WAYFAIR_INFO.baseUrl}/keyword.html?keyword=${articleNumber}`,
    };

    // Extract JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd["@type"] === "Product" || jsonLd.name) {
          product.name = jsonLd.name ?? "";
          product.description = jsonLd.description;
          if (jsonLd.offers) {
            const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
            product.priceCurrent = parseFloat(offer.price);
            product.priceCurrency = offer.priceCurrency ?? "USD";
          }
          if (jsonLd.aggregateRating) {
            product.avgRating = parseFloat(jsonLd.aggregateRating.ratingValue);
            product.reviewCount = parseInt(jsonLd.aggregateRating.reviewCount, 10);
          }
          if (jsonLd.brand?.name) {
            product.designer = jsonLd.brand.name;
          }
          if (jsonLd.image) {
            const images = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
            product.images = images.map((url: string, i: number) => ({
              url,
              sortOrder: i,
            }));
          }
        }
      } catch {
        // JSON-LD parsing failure is non-fatal
      }
    }

    // Extract product name from title tag as fallback
    if (!product.name) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        product.name = titleMatch[1].replace(/\s*\|\s*Wayfair.*$/, "").trim();
      }
    }

    // Extract category from breadcrumbs
    const breadcrumbMatch = html.match(/data-hb-id="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/i);
    if (breadcrumbMatch) {
      const crumbs = breadcrumbMatch[1].match(/>([^<]+)</g);
      if (crumbs) {
        product.categoryPath = crumbs.map((c) => c.replace(/^>/, "").trim()).filter(Boolean).join(" > ");
      }
    }

    // Check for assembly required flag
    if (html.includes("Assembly Required") || html.includes("assembly required")) {
      product.assemblyRequired = true;
    } else if (html.includes("No Assembly Required") || html.includes("no assembly required")) {
      product.assemblyRequired = false;
    }

    // Extract dimensions from specs section
    const specsSection = html.match(/(?:Overall|Product)\s*Dimensions[^:]*:\s*([^<]+)/i);
    if (specsSection) {
      const dims = specsSection[1].trim();
      // Wayfair format: "25'' H x 40'' W x 20'' D"
      const heightMatch = dims.match(/([\d.]+)'*'\s*H/i);
      const widthMatch = dims.match(/([\d.]+)'*'\s*W/i);
      const depthMatch = dims.match(/([\d.]+)'*'\s*D/i);
      if (heightMatch) product.productHeight = `${heightMatch[1]} in`;
      if (widthMatch) product.productWidth = `${widthMatch[1]} in`;
      if (depthMatch) product.productDepth = `${depthMatch[1]} in`;
    }

    // Extract weight
    const weightMatch = html.match(/(?:Overall\s+)?(?:Product\s+)?Weight[^:]*:\s*([\d.]+)\s*(lbs?|kg)/i);
    if (weightMatch) {
      product.productWeight = `${weightMatch[1]} ${weightMatch[2]}`;
    }

    // Extract materials
    const materialsMatch = html.match(/(?:Frame\s+)?Material[^:]*:\s*([^<]+)/i);
    if (materialsMatch) {
      product.materials = materialsMatch[1].trim();
    }

    // Extract color from page
    const colorMatch = html.match(/(?:Color|Finish)[^:]*:\s*([^<]+)/i);
    if (colorMatch) {
      product.color = colorMatch[1].trim();
    }

    // Extract documents
    product.documents = this.parseDocumentLinks(html);

    return product;
  }

  /** Extract SKU identifiers from a Wayfair category page. */
  private extractCategorySkus(html: string): string[] {
    const skus: string[] = [];
    // Wayfair product cards contain SKU in data attributes or links
    const skuMatches = html.matchAll(/data-sku="([^"]+)"/g);
    for (const match of skuMatches) {
      skus.push(match[1]);
    }

    // Fallback: extract from product URLs
    if (skus.length === 0) {
      const urlMatches = html.matchAll(/href="[^"]*\.html\?piid=(\d+)"/g);
      for (const match of urlMatches) {
        skus.push(match[1]);
      }
    }

    return [...new Set(skus)]; // Deduplicate
  }

  /** Parse document (PDF) links from a Wayfair product page. */
  private parseDocumentLinks(html: string): ScrapedDocument[] {
    const docs: ScrapedDocument[] = [];

    // Look for PDF links in the product information section
    const pdfMatches = html.matchAll(/href="(https?:\/\/[^"]*\.pdf[^"]*)"/gi);
    for (const match of pdfMatches) {
      const url = match[1];
      const isAssembly = /assembl|instruct|manual|setup/i.test(url) || /assembl|instruct|manual|setup/i.test(html.substring(Math.max(0, match.index! - 100), match.index! + 200));
      docs.push({
        documentType: isAssembly ? "assembly_instructions" : "product_manual",
        sourceUrl: url,
      });
    }

    return docs;
  }

  /** Parse image URLs from a Wayfair product page. */
  private parseImageUrls(html: string): ScrapedImage[] {
    const images: ScrapedImage[] = [];
    const seen = new Set<string>();

    // Extract from JSON-LD first (highest quality URLs)
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        const jsonImages = Array.isArray(jsonLd.image) ? jsonLd.image : jsonLd.image ? [jsonLd.image] : [];
        for (let i = 0; i < jsonImages.length; i++) {
          const url = jsonImages[i];
          // Validate HTTPS scheme — consistent with wfcdn regex fallback
          if (typeof url === "string" && url.startsWith("https://") && !seen.has(url)) {
            seen.add(url);
            images.push({ url, sortOrder: i });
          }
        }
      } catch {
        // Non-fatal
      }
    }

    // Fallback: look for wfcdn.com image URLs
    const imgMatches = html.matchAll(/src="(https:\/\/[^"]*\.wfcdn\.com[^"]*\.(?:jpg|png|webp)[^"]*)"/gi);
    for (const match of imgMatches) {
      const url = match[1];
      if (!seen.has(url)) {
        seen.add(url);
        images.push({ url, sortOrder: images.length });
      }
    }

    return images;
  }
}
