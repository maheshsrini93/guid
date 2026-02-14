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

// ─── Amazon Adapter ───

const AMAZON_INFO: RetailerInfo = {
  slug: "amazon",
  name: "Amazon",
  baseUrl: "https://www.amazon.com",
  logoUrl: "/icons/amazon-logo.svg",
};

/**
 * Rate limit: Amazon PA-API enforces 1 request/second and requires
 * an approved Associates account for access.
 */
const AMAZON_RATE_LIMIT: RateLimitConfig = {
  requestsPerMinute: 60,
  delayBetweenMs: 1000,
  maxConcurrent: 1,
};

/** PA-API 5.0 endpoint */
const PAAPI_HOST = "webservices.amazon.com";
const PAAPI_REGION = "us-east-1";
const PAAPI_SERVICE = "ProductAdvertisingAPI";

/**
 * Amazon adapter — uses Amazon Product Advertising API 5.0 (PA-API)
 * instead of HTML scraping.
 *
 * Key Amazon-specific concerns:
 * - ASIN (Amazon Standard Identification Number) is the primary identifier.
 * - PA-API 5.0 requires signed requests (AWS Signature V4).
 * - Rate limit is strictly 1 request/second with throttle enforcement.
 * - Assembly PDFs are rare on Amazon — most products don't include them.
 * - Product data comes from API responses, not HTML parsing.
 * - Images served from images-na.ssl-images-amazon.com / m.media-amazon.com.
 */
export class AmazonAdapter implements RetailerAdapter {
  readonly info: RetailerInfo = AMAZON_INFO;

  /**
   * Detect new Amazon products by checking recently added products
   * in the database for this retailer.
   */
  async detectNewProducts(sinceDays: number): Promise<NewProduct[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - sinceDays);

    const retailer = await prisma.retailer.findUnique({
      where: { slug: "amazon" },
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
   * Get a single Amazon product by ASIN using PA-API 5.0 GetItems.
   *
   * Requires AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, and AMAZON_PARTNER_TAG
   * environment variables.
   */
  async scrapeProduct(articleNumber: string): Promise<ScrapedProduct> {
    const asin = this.normalizeAsin(articleNumber);
    const response = await this.callPaApi("GetItems", {
      ItemIds: [asin],
      Resources: [
        "ItemInfo.Title",
        "ItemInfo.Features",
        "ItemInfo.ProductInfo",
        "ItemInfo.ByLineInfo",
        "ItemInfo.Classifications",
        "ItemInfo.ContentInfo",
        "ItemInfo.ManufactureInfo",
        "ItemInfo.TechnicalInfo",
        "Offers.Listings.Price",
        "Offers.Listings.Condition",
        "Images.Primary.Large",
        "Images.Variants.Large",
        "BrowseNodeInfo.BrowseNodes",
        "BrowseNodeInfo.BrowseNodes.Ancestor",
      ],
    });

    if (!response.ItemsResult?.Items?.length) {
      throw new Error(`Amazon PA-API returned no results for ASIN ${asin}`);
    }

    return this.parseApiItem(response.ItemsResult.Items[0], asin);
  }

  /**
   * Search for products in an Amazon category/browse node using PA-API SearchItems.
   */
  async scrapeCategory(categoryPath: string): Promise<ScrapedProduct[]> {
    const response = await this.callPaApi("SearchItems", {
      Keywords: categoryPath,
      SearchIndex: "All",
      Resources: [
        "ItemInfo.Title",
        "ItemInfo.Features",
        "ItemInfo.ProductInfo",
        "ItemInfo.ByLineInfo",
        "Offers.Listings.Price",
        "Images.Primary.Large",
        "BrowseNodeInfo.BrowseNodes",
      ],
      ItemCount: 10,
    });

    if (!response.SearchResult?.Items?.length) {
      return [];
    }

    return response.SearchResult.Items.map((item: PaApiItem) =>
      this.parseApiItem(item, item.ASIN)
    );
  }

  /**
   * Extract documents for an Amazon product.
   * Assembly PDFs are rare on Amazon — most products don't include them.
   * We check the product detail page for any PDF links as a best-effort.
   */
  async extractDocuments(productId: number): Promise<ScrapedDocument[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { article_number: true },
    });
    if (!product) return [];

    // Amazon rarely provides assembly docs via API.
    // As a best-effort, we check for technical documentation resources.
    try {
      const response = await this.callPaApi("GetItems", {
        ItemIds: [product.article_number],
        Resources: ["ItemInfo.TechnicalInfo"],
      });

      const item = response.ItemsResult?.Items?.[0];
      if (!item) return [];

      // Amazon doesn't expose PDFs through PA-API;
      // documents would need to be found via product page HTML
      // which we avoid per Amazon's TOS.
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Extract product images from PA-API response.
   */
  async extractImages(productId: number): Promise<ScrapedImage[]> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { article_number: true },
    });
    if (!product) return [];

    try {
      const response = await this.callPaApi("GetItems", {
        ItemIds: [product.article_number],
        Resources: [
          "Images.Primary.Large",
          "Images.Variants.Large",
        ],
      });

      const item = response.ItemsResult?.Items?.[0];
      if (!item) return [];

      return this.parseApiImages(item);
    } catch {
      return [];
    }
  }

  getRateLimitConfig(): RateLimitConfig {
    return AMAZON_RATE_LIMIT;
  }

  normalizeProduct(raw: unknown): NormalizedProduct {
    const scraped = raw as ScrapedProduct;
    const normalized = sharedNormalize(scraped, "amazon");

    // Amazon-specific: ASIN is the manufacturer SKU
    normalized.manufacturerSku = scraped.articleNumber;

    return normalized;
  }

  // ─── PA-API Helpers ───

  /**
   * Call Amazon PA-API 5.0 with AWS Signature V4 signing.
   *
   * Requires environment variables:
   * - AMAZON_ACCESS_KEY: PA-API access key
   * - AMAZON_SECRET_KEY: PA-API secret key
   * - AMAZON_PARTNER_TAG: Associates partner tag
   */
  private async callPaApi(operation: string, payload: Record<string, unknown>): Promise<PaApiResponse> {
    const accessKey = process.env.AMAZON_ACCESS_KEY;
    const secretKey = process.env.AMAZON_SECRET_KEY;
    const partnerTag = process.env.AMAZON_PARTNER_TAG;

    if (!accessKey || !secretKey || !partnerTag) {
      throw new Error("Amazon PA-API credentials not configured. Set AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, and AMAZON_PARTNER_TAG.");
    }

    const target = `com.amazon.paapi5.v1.${PAAPI_SERVICE}v1.${operation}`;
    const body = JSON.stringify({
      ...payload,
      PartnerTag: partnerTag,
      PartnerType: "Associates",
      Marketplace: "www.amazon.com",
    });

    const url = `https://${PAAPI_HOST}/paapi5/${operation.toLowerCase()}`;

    // Build AWS Signature V4 headers
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);

    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Amz-Date": amzDate,
      "X-Amz-Target": target,
      Host: PAAPI_HOST,
    };

    // Sign the request
    const signature = await this.signRequest(
      "POST",
      `/paapi5/${operation.toLowerCase()}`,
      headers,
      body,
      dateStamp,
      amzDate,
      secretKey,
      accessKey
    );

    headers["Authorization"] = signature;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Amazon PA-API ${operation} failed: HTTP ${response.status} — ${errorBody.substring(0, 200)}`);
    }

    return response.json() as Promise<PaApiResponse>;
  }

  /**
   * AWS Signature V4 signing for PA-API requests.
   * Computes HMAC-SHA256 signatures as required by Amazon Web Services.
   */
  private async signRequest(
    method: string,
    path: string,
    headers: Record<string, string>,
    body: string,
    dateStamp: string,
    amzDate: string,
    secretKey: string,
    accessKey: string
  ): Promise<string> {
    const encoder = new TextEncoder();

    // Helper: HMAC-SHA256 — accepts ArrayBuffer or Uint8Array (BufferSource)
    const hmac = async (key: BufferSource, message: string): Promise<ArrayBuffer> => {
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
    };

    // Helper: SHA-256 hash
    const sha256 = async (message: string): Promise<string> => {
      const hash = await crypto.subtle.digest("SHA-256", encoder.encode(message));
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    };

    // Canonical request
    const signedHeaders = Object.keys(headers)
      .map((k) => k.toLowerCase())
      .sort()
      .join(";");

    const canonicalHeaders = Object.keys(headers)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
      .join("\n") + "\n";

    const payloadHash = await sha256(body);
    const canonicalRequest = [method, path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");

    // String to sign
    const credentialScope = `${dateStamp}/${PAAPI_REGION}/${PAAPI_SERVICE}/aws4_request`;
    const canonicalRequestHash = await sha256(canonicalRequest);
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, canonicalRequestHash].join("\n");

    // Signing key
    const kDate = await hmac(encoder.encode(`AWS4${secretKey}`), dateStamp);
    const kRegion = await hmac(kDate, PAAPI_REGION);
    const kService = await hmac(kRegion, PAAPI_SERVICE);
    const kSigning = await hmac(kService, "aws4_request");

    // Final signature
    const signatureBytes = await hmac(kSigning, stringToSign);
    const signatureHex = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;
  }

  /** Normalize ASIN format (10 alphanumeric characters). */
  private normalizeAsin(input: string): string {
    // ASINs are exactly 10 alphanumeric characters
    const cleaned = input.trim().toUpperCase();
    if (/^[A-Z0-9]{10}$/.test(cleaned)) {
      return cleaned;
    }
    // Try to extract ASIN from a URL
    const asinMatch = cleaned.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
    if (asinMatch) return asinMatch[1];
    return cleaned;
  }

  /** Parse a PA-API item response into a ScrapedProduct. */
  private parseApiItem(item: PaApiItem, asin: string): ScrapedProduct {
    const product: ScrapedProduct = {
      articleNumber: asin,
      name: item.ItemInfo?.Title?.DisplayValue ?? "",
      sourceUrl: item.DetailPageURL ?? `${AMAZON_INFO.baseUrl}/dp/${asin}`,
    };

    // Price
    const listing = item.Offers?.Listings?.[0];
    if (listing?.Price) {
      product.priceCurrent = listing.Price.Amount;
      product.priceCurrency = listing.Price.Currency ?? "USD";
    }

    // Savings / original price
    if (listing?.Price?.Savings) {
      product.priceOriginal = (listing.Price.Amount ?? 0) + (listing.Price.Savings.Amount ?? 0);
    }

    // Brand / manufacturer
    if (item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue) {
      product.designer = item.ItemInfo.ByLineInfo.Brand.DisplayValue;
    } else if (item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue) {
      product.designer = item.ItemInfo.ByLineInfo.Manufacturer.DisplayValue;
    }

    // Features as description
    if (item.ItemInfo?.Features?.DisplayValues) {
      product.description = item.ItemInfo.Features.DisplayValues.join("\n");
    }

    // Classifications / category
    if (item.BrowseNodeInfo?.BrowseNodes) {
      const categoryParts: string[] = [];
      const node = item.BrowseNodeInfo.BrowseNodes[0];
      if (node) {
        let current: BrowseNode | undefined = node;
        while (current) {
          if (current.DisplayName) categoryParts.unshift(current.DisplayName);
          current = current.Ancestor;
        }
      }
      if (categoryParts.length > 0) {
        product.categoryPath = categoryParts.join(" > ");
      }
    }

    // Product info / dimensions
    if (item.ItemInfo?.ProductInfo) {
      const info = item.ItemInfo.ProductInfo;
      if (info.ItemDimensions) {
        const dims = info.ItemDimensions;
        if (dims.Height) product.productHeight = `${dims.Height.DisplayValue} ${dims.Height.Unit}`;
        if (dims.Width) product.productWidth = `${dims.Width.DisplayValue} ${dims.Width.Unit}`;
        if (dims.Length) product.productLength = `${dims.Length.DisplayValue} ${dims.Length.Unit}`;
        if (dims.Weight) product.productWeight = `${dims.Weight.DisplayValue} ${dims.Weight.Unit}`;
      }
    }

    // Images
    product.images = this.parseApiImages(item);

    // Amazon products with "assembly required" in features
    if (product.description) {
      const descLower = product.description.toLowerCase();
      if (descLower.includes("assembly required")) {
        product.assemblyRequired = true;
      } else if (descLower.includes("no assembly") || descLower.includes("fully assembled")) {
        product.assemblyRequired = false;
      }
    }

    return product;
  }

  /** Extract images from PA-API item response. */
  private parseApiImages(item: PaApiItem): ScrapedImage[] {
    const images: ScrapedImage[] = [];

    if (item.Images?.Primary?.Large) {
      images.push({
        url: item.Images.Primary.Large.URL,
        altText: "Primary product image",
        sortOrder: 0,
      });
    }

    if (item.Images?.Variants) {
      for (let i = 0; i < item.Images.Variants.length; i++) {
        const variant = item.Images.Variants[i];
        if (variant.Large) {
          images.push({
            url: variant.Large.URL,
            sortOrder: i + 1,
          });
        }
      }
    }

    return images;
  }
}

// ─── PA-API Response Types ───

interface PaApiResponse {
  ItemsResult?: { Items: PaApiItem[] };
  SearchResult?: { Items: PaApiItem[] };
}

interface PaApiItem {
  ASIN: string;
  DetailPageURL?: string;
  ItemInfo?: {
    Title?: { DisplayValue: string };
    Features?: { DisplayValues: string[] };
    ByLineInfo?: {
      Brand?: { DisplayValue: string };
      Manufacturer?: { DisplayValue: string };
    };
    ProductInfo?: {
      ItemDimensions?: {
        Height?: DimensionValue;
        Width?: DimensionValue;
        Length?: DimensionValue;
        Weight?: DimensionValue;
      };
    };
    Classifications?: {
      Binding?: { DisplayValue: string };
      ProductGroup?: { DisplayValue: string };
    };
    TechnicalInfo?: Record<string, unknown>;
    ManufactureInfo?: Record<string, unknown>;
    ContentInfo?: Record<string, unknown>;
  };
  Offers?: {
    Listings?: Array<{
      Price?: {
        Amount?: number;
        Currency?: string;
        Savings?: { Amount?: number };
      };
      Condition?: { Value: string };
    }>;
  };
  Images?: {
    Primary?: { Large?: ImageData };
    Variants?: Array<{ Large?: ImageData }>;
  };
  BrowseNodeInfo?: {
    BrowseNodes?: BrowseNode[];
  };
}

interface DimensionValue {
  DisplayValue: number;
  Unit: string;
}

interface ImageData {
  URL: string;
  Width: number;
  Height: number;
}

interface BrowseNode {
  Id: string;
  DisplayName?: string;
  Ancestor?: BrowseNode;
}
