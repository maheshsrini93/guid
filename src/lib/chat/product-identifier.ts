import { prisma } from "@/lib/prisma";

/**
 * Result of attempting to identify a product from user text.
 */
export interface ProductIdentification {
  /** Whether a product was confidently identified */
  identified: boolean;
  /** The matched product, if found */
  product: {
    id: number;
    articleNumber: string;
    productName: string | null;
    productType: string | null;
  } | null;
  /** How the product was identified */
  method: "article_number" | "exact_name" | "fuzzy_name" | "url" | null;
  /** Possible matches if no single confident match (for confirmation) */
  candidates: {
    id: number;
    articleNumber: string;
    productName: string | null;
    productType: string | null;
  }[];
}

// IKEA article number patterns: "702.758.14", "70275814", "S70275814"
const ARTICLE_NUMBER_REGEX = /(\d{3}\.\d{3}\.\d{2})|(\d{8})|S(\d{8})/;

// URL pattern to extract article number from IKEA URLs
const IKEA_URL_REGEX = /ikea\.com.*?(?:(\d{3}\.\d{3}\.\d{2})|\/(\d{8})\/?|S(\d{8}))/i;

/**
 * Extract product name/article number from user's message text
 * and match against the database.
 *
 * Strategies (in order of confidence):
 * 1. Article number extraction (exact match)
 * 2. URL extraction (IKEA product URL)
 * 3. Exact product name match
 * 4. Fuzzy product name search (returns candidates for confirmation)
 */
export async function identifyProduct(
  userMessage: string
): Promise<ProductIdentification> {
  const text = userMessage.trim();

  // Strategy 1: Article number extraction
  const articleMatch = text.match(ARTICLE_NUMBER_REGEX);
  if (articleMatch) {
    const rawNumber = articleMatch[1] || articleMatch[2] || articleMatch[3];
    // Normalize to xxx.xxx.xx format
    const formatted =
      rawNumber && rawNumber.length === 8 && !rawNumber.includes(".")
        ? `${rawNumber.slice(0, 3)}.${rawNumber.slice(3, 6)}.${rawNumber.slice(6)}`
        : rawNumber;

    if (formatted) {
      const product = await prisma.product.findFirst({
        where: { article_number: formatted },
        select: {
          id: true,
          article_number: true,
          product_name: true,
          product_type: true,
        },
      });

      if (product) {
        return {
          identified: true,
          product: {
            id: product.id,
            articleNumber: product.article_number,
            productName: product.product_name,
            productType: product.product_type,
          },
          method: "article_number",
          candidates: [],
        };
      }
    }
  }

  // Strategy 2: URL extraction
  const urlMatch = text.match(IKEA_URL_REGEX);
  if (urlMatch) {
    const rawNumber = urlMatch[1] || urlMatch[2] || urlMatch[3];
    const formatted =
      rawNumber && rawNumber.length === 8 && !rawNumber.includes(".")
        ? `${rawNumber.slice(0, 3)}.${rawNumber.slice(3, 6)}.${rawNumber.slice(6)}`
        : rawNumber;

    if (formatted) {
      const product = await prisma.product.findFirst({
        where: { article_number: formatted },
        select: {
          id: true,
          article_number: true,
          product_name: true,
          product_type: true,
        },
      });

      if (product) {
        return {
          identified: true,
          product: {
            id: product.id,
            articleNumber: product.article_number,
            productName: product.product_name,
            productType: product.product_type,
          },
          method: "url",
          candidates: [],
        };
      }
    }
  }

  // Strategy 3: Extract potential product names from message
  // IKEA product names are typically uppercase single words (KALLAX, MALM, BILLY, etc.)
  const uppercaseWords = text.match(/\b[A-Z\u00C0-\u00D6]{3,}\b/g);

  if (uppercaseWords && uppercaseWords.length > 0) {
    for (const word of uppercaseWords) {
      const exactMatch = await prisma.product.findFirst({
        where: { product_name: { equals: word, mode: "insensitive" } },
        select: {
          id: true,
          article_number: true,
          product_name: true,
          product_type: true,
        },
      });

      if (exactMatch) {
        return {
          identified: true,
          product: {
            id: exactMatch.id,
            articleNumber: exactMatch.article_number,
            productName: exactMatch.product_name,
            productType: exactMatch.product_type,
          },
          method: "exact_name",
          candidates: [],
        };
      }
    }
  }

  // Strategy 4: Fuzzy search — look for product names in the message
  // Extract meaningful words (3+ characters, not common words)
  const commonWords = new Set([
    "the", "and", "for", "with", "from", "that", "this", "have", "has",
    "not", "but", "are", "was", "were", "been", "being", "can", "could",
    "would", "should", "may", "might", "will", "shall", "must", "need",
    "help", "problem", "issue", "broken", "fix", "how", "what", "why",
    "when", "where", "which", "who", "about", "into", "out", "over",
    "assembly", "assemble", "build", "furniture", "product", "ikea",
    "guide", "step", "part", "screw", "instructions", "manual",
  ]);

  const searchTerms = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !commonWords.has(w));

  if (searchTerms.length > 0) {
    // Search using the first few meaningful words
    const searchQuery = searchTerms.slice(0, 3).join(" ");

    const candidates = await prisma.product.findMany({
      where: {
        OR: [
          { product_name: { contains: searchQuery, mode: "insensitive" } },
          ...searchTerms.slice(0, 3).map((term) => ({
            product_name: { contains: term, mode: "insensitive" as const },
          })),
        ],
      },
      select: {
        id: true,
        article_number: true,
        product_name: true,
        product_type: true,
      },
      take: 5,
      orderBy: { avg_rating: "desc" },
    });

    if (candidates.length === 1) {
      return {
        identified: true,
        product: {
          id: candidates[0].id,
          articleNumber: candidates[0].article_number,
          productName: candidates[0].product_name,
          productType: candidates[0].product_type,
        },
        method: "fuzzy_name",
        candidates: [],
      };
    }

    if (candidates.length > 1) {
      return {
        identified: false,
        product: null,
        method: null,
        candidates: candidates.map((c) => ({
          id: c.id,
          articleNumber: c.article_number,
          productName: c.product_name,
          productType: c.product_type,
        })),
      };
    }
  }

  // No match found
  return {
    identified: false,
    product: null,
    method: null,
    candidates: [],
  };
}
