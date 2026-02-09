import { Prisma } from "@prisma/client";

export interface ProductFilterParams {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  assembly?: string; // "true" | "false"
  hasAssemblyDocs?: string; // "true"
  sort?: string;
  page?: string;
}

export function buildProductWhere(
  params: ProductFilterParams
): Prisma.ProductWhereInput {
  const conditions: Prisma.ProductWhereInput[] = [];

  if (params.q) {
    conditions.push({
      OR: [
        { product_name: { contains: params.q, mode: "insensitive" } },
        { article_number: { contains: params.q, mode: "insensitive" } },
        { product_type: { contains: params.q, mode: "insensitive" } },
        { category_path: { contains: params.q, mode: "insensitive" } },
      ],
    });
  }

  if (params.category) {
    conditions.push({
      category_path: { contains: params.category, mode: "insensitive" },
    });
  }

  if (params.minPrice) {
    const min = parseFloat(params.minPrice);
    if (!isNaN(min)) {
      conditions.push({ price_current: { gte: min } });
    }
  }

  if (params.maxPrice) {
    const max = parseFloat(params.maxPrice);
    if (!isNaN(max)) {
      conditions.push({ price_current: { lte: max } });
    }
  }

  if (params.minRating) {
    const rating = parseFloat(params.minRating);
    if (!isNaN(rating)) {
      conditions.push({ avg_rating: { gte: rating } });
    }
  }

  if (params.assembly === "true") {
    conditions.push({ assembly_required: true });
  } else if (params.assembly === "false") {
    conditions.push({
      OR: [{ assembly_required: false }, { assembly_required: null }],
    });
  }

  if (params.hasAssemblyDocs === "true") {
    conditions.push({
      documents: { some: { document_type: "assembly" } },
    });
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
