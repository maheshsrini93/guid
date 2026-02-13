import { prisma } from "@/lib/prisma";

export interface PilotProduct {
  id: number;
  articleNumber: string;
  productName: string;
  categoryPath: string | null;
  assemblyPdfUrl: string;
  pdfPageCount: number | null;
  hasImages: boolean;
  imageCount: number;
}

export interface PilotSelection {
  products: PilotProduct[];
  selectionCriteria: string;
  selectedAt: string;
}

/**
 * Category targets for pilot product selection.
 * Each entry defines search keywords and a label.
 */
const PILOT_CATEGORIES = [
  {
    label: "Bookshelf",
    keywords: ["BILLY", "KALLAX", "bookcase", "bookshelf", "shelving unit"],
    categoryHints: ["Storage", "Shelving"],
  },
  {
    label: "Desk",
    keywords: ["MICKE", "MALM desk", "LAGKAPTEN", "BEKANT", "desk"],
    categoryHints: ["Desks", "Workspace"],
  },
  {
    label: "Bed frame",
    keywords: ["MALM bed", "HEMNES bed", "TARVA", "bed frame"],
    categoryHints: ["Beds", "Bed frames"],
  },
  {
    label: "Wardrobe",
    keywords: ["PAX", "KLEPPSTAD", "wardrobe"],
    categoryHints: ["Wardrobes", "PAX system"],
  },
  {
    label: "Storage/Dresser",
    keywords: ["HEMNES dresser", "HEMNES chest", "MALM chest", "KULLEN", "dresser", "chest of drawers"],
    categoryHints: ["Chests of drawers", "Dressers"],
  },
];

/**
 * Find a single pilot product matching the given category criteria.
 * Prefers products with assembly PDFs that have 10-25 pages.
 */
async function findPilotForCategory(category: typeof PILOT_CATEGORIES[number]): Promise<PilotProduct | null> {
  // Build OR conditions for product name matching
  const nameConditions = category.keywords.map((kw) => ({
    product_name: { contains: kw, mode: "insensitive" as const },
  }));

  // Also try category path matching
  const categoryConditions = category.categoryHints.map((hint) => ({
    category_path: { contains: hint, mode: "insensitive" as const },
  }));

  const products = await prisma.product.findMany({
    where: {
      assembly_required: true,
      documents: {
        some: {
          document_type: { contains: "assembly", mode: "insensitive" },
        },
      },
      OR: [...nameConditions, ...categoryConditions],
    },
    include: {
      documents: {
        where: {
          document_type: { contains: "assembly", mode: "insensitive" },
        },
      },
      images: {
        select: { id: true },
      },
    },
    orderBy: [
      { review_count: "desc" }, // Prefer popular products (more reviews = more useful guide)
    ],
    take: 20,
  });

  // Score and pick the best candidate
  let bestProduct: PilotProduct | null = null;
  let bestScore = -1;

  for (const product of products) {
    const assemblyDoc = product.documents[0];
    if (!assemblyDoc) continue;

    const pageCount = assemblyDoc.page_count ?? 0;
    const imageCount = product.images.length;

    // Score: prefer 10-25 pages, has images, has page count data
    let score = 0;
    if (pageCount >= 10 && pageCount <= 25) score += 10;
    else if (pageCount >= 5 && pageCount <= 40) score += 5;
    else if (pageCount > 0) score += 2;
    if (imageCount > 0) score += 3;
    if (imageCount > 3) score += 2;
    if (product.review_count && product.review_count > 10) score += 2;

    // Bonus for exact keyword match in product name
    const nameLower = (product.product_name ?? "").toLowerCase();
    for (const kw of category.keywords) {
      if (nameLower.includes(kw.toLowerCase())) {
        score += 5;
        break;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestProduct = {
        id: product.id,
        articleNumber: product.article_number,
        productName: product.product_name ?? "Unknown",
        categoryPath: product.category_path,
        assemblyPdfUrl: assemblyDoc.source_url,
        pdfPageCount: assemblyDoc.page_count,
        hasImages: imageCount > 0,
        imageCount,
      };
    }
  }

  return bestProduct;
}

/**
 * Select 5 pilot products across diverse categories for AI guide generation testing.
 */
export async function selectPilotProducts(): Promise<PilotSelection> {
  const products: PilotProduct[] = [];

  for (const category of PILOT_CATEGORIES) {
    const pilot = await findPilotForCategory(category);
    if (pilot) {
      products.push(pilot);
      console.log(`✓ ${category.label}: ${pilot.productName} (${pilot.articleNumber}) — ${pilot.pdfPageCount ?? "?"} pages, ${pilot.imageCount} images`);
    } else {
      console.warn(`✗ ${category.label}: No suitable product found`);
    }
  }

  return {
    products,
    selectionCriteria: "assembly_required=true, has assembly PDF, prefers 10-25 pages, has images, ordered by review count",
    selectedAt: new Date().toISOString(),
  };
}
