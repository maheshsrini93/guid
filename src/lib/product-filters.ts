import { Prisma } from "@prisma/client";

export interface ProductFilterParams {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  assembly?: string; // "true" | "false"
  hasAssemblyDocs?: string; // "true"
  new?: string; // "true"
  sort?: string;
  page?: string;
}

/**
 * Build a Prisma WHERE clause from URL search params.
 *
 * Optimization strategy:
 * 1. Equality/boolean filters first (most selective, use indexes)
 * 2. Range filters next (price, rating — use indexes)
 * 3. Relation subqueries (hasAssemblyDocs — EXISTS subquery)
 * 4. Text search last (ILIKE is the most expensive)
 *
 * For text search: detect numeric-only queries and short-circuit
 * to an exact article_number match instead of running 4 ILIKE scans.
 */
export function buildProductWhere(
  params: ProductFilterParams
): Prisma.ProductWhereInput {
  const conditions: Prisma.ProductWhereInput[] = [];

  // 1. Boolean/equality filters (most selective, indexed)
  if (params.new === "true") {
    conditions.push({ is_new: true });
  }

  if (params.assembly === "true") {
    conditions.push({ assembly_required: true });
  } else if (params.assembly === "false") {
    conditions.push({
      OR: [{ assembly_required: false }, { assembly_required: null }],
    });
  }

  if (params.category) {
    conditions.push({
      category_path: { contains: params.category, mode: "insensitive" },
    });
  }

  // 2. Range filters — combine min/max into a single price_current condition
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : NaN;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : NaN;
  if (!isNaN(minPrice) || !isNaN(maxPrice)) {
    const priceFilter: Prisma.FloatNullableFilter = {};
    if (!isNaN(minPrice)) priceFilter.gte = minPrice;
    if (!isNaN(maxPrice)) priceFilter.lte = maxPrice;
    conditions.push({ price_current: priceFilter });
  }

  if (params.minRating) {
    const rating = parseFloat(params.minRating);
    if (!isNaN(rating)) {
      conditions.push({ avg_rating: { gte: rating } });
    }
  }

  // 3. Relation subquery (EXISTS — more expensive than column filters)
  if (params.hasAssemblyDocs === "true") {
    conditions.push({
      documents: { some: { document_type: "assembly" } },
    });
  }

  // 4. Text search last (ILIKE is the most expensive operation)
  if (params.q) {
    const query = params.q.trim();
    // Detect article-number-like input (digits, dots, dashes only)
    // e.g., "702.758.14" or "70275814" — use exact match on indexed column
    const isArticleNumber = /^[\d.\-]+$/.test(query);

    if (isArticleNumber) {
      // Normalized search: strip dots/dashes for flexible matching
      const normalized = query.replace(/[.\-]/g, "");
      conditions.push({
        OR: [
          { article_number: { contains: query, mode: "insensitive" } },
          // Also match without separators in case user omits them
          ...(normalized !== query
            ? [
                {
                  article_number: {
                    contains: normalized,
                    mode: "insensitive" as const,
                  },
                },
              ]
            : []),
        ],
      });
    } else {
      conditions.push({
        OR: [
          { product_name: { contains: query, mode: "insensitive" } },
          { article_number: { contains: query, mode: "insensitive" } },
          { product_type: { contains: query, mode: "insensitive" } },
          { category_path: { contains: query, mode: "insensitive" } },
        ],
      });
    }
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

export type SortOption = {
  label: string;
  value: string;
  orderBy: Prisma.ProductOrderByWithRelationInput;
};

export const SORT_OPTIONS: SortOption[] = [
  { label: "Name (A-Z)", value: "name_asc", orderBy: { product_name: "asc" } },
  {
    label: "Name (Z-A)",
    value: "name_desc",
    orderBy: { product_name: "desc" },
  },
  {
    label: "Price (Low to High)",
    value: "price_asc",
    orderBy: { price_current: "asc" },
  },
  {
    label: "Price (High to Low)",
    value: "price_desc",
    orderBy: { price_current: "desc" },
  },
  {
    label: "Rating (High to Low)",
    value: "rating_desc",
    orderBy: { avg_rating: "desc" },
  },
  {
    label: "Newest",
    value: "newest",
    orderBy: { scraped_at: "desc" },
  },
];

export function getSortOrderBy(
  sortValue?: string
): Prisma.ProductOrderByWithRelationInput {
  const option = SORT_OPTIONS.find((o) => o.value === sortValue);
  return option?.orderBy ?? { product_name: "asc" };
}
