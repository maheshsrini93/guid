import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/search-input";
import { ProductSortSelect } from "@/components/product-sort-select";
import { ProductFilters } from "@/components/product-filters";
import { ActiveFilters } from "@/components/active-filters";
import { MobileFilterSheet } from "@/components/mobile-filter-sheet";
import {
  type ProductFilterParams,
  buildProductWhere,
  getSortOrderBy,
} from "@/lib/product-filters";

const PAGE_SIZE = 24;

async function getTopCategories(): Promise<string[]> {
  const results = await prisma.product.groupBy({
    by: ["category_path"],
    where: { category_path: { not: null } },
    _count: { category_path: true },
    orderBy: { _count: { category_path: "desc" } },
    take: 20,
  });

  return results
    .map((r) => r.category_path)
    .filter((c): c is string => c !== null);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ProductFilterParams>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  const where = buildProductWhere(params);
  const orderBy = getSortOrderBy(params.sort);

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { images: { take: 1, orderBy: { sort_order: "asc" } } },
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    getTopCategories(),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build pagination URL preserving all current filters
  function paginationUrl(targetPage: number) {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") p.set(key, value);
    }
    p.set("page", String(targetPage));
    return `/products?${p.toString()}`;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense>
            <SearchInput />
          </Suspense>
          <Suspense>
            <ProductSortSelect />
          </Suspense>
          <Suspense>
            <MobileFilterSheet categories={categories} />
          </Suspense>
        </div>
      </div>

      {/* Active filter badges */}
      <Suspense>
        <ActiveFilters />
      </Suspense>

      <div className="mt-6 flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <Suspense>
            <ProductFilters categories={categories} />
          </Suspense>
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/products">Clear all filters</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.article_number}`}
                  className="group rounded-lg border p-4 transition-shadow hover:shadow-md"
                >
                  {product.images[0] ? (
                    <div className="relative mb-3 aspect-square w-full rounded-md bg-gray-50 overflow-hidden">
                      <Image
                        src={product.images[0].url}
                        alt={product.product_name || "Product"}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="mb-3 flex aspect-square w-full items-center justify-center rounded-md bg-gray-100 text-gray-400 text-sm">
                      No image
                    </div>
                  )}
                  <h2 className="font-medium group-hover:underline line-clamp-1">
                    {product.product_name || "Unknown"}
                  </h2>
                  {product.product_type && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {product.product_type}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    {product.price_current != null && (
                      <span className="font-semibold">
                        ${product.price_current.toFixed(2)}
                      </span>
                    )}
                    {product.assembly_required && (
                      <Badge variant="secondary">Assembly</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={paginationUrl(page - 1)}>Previous</Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={paginationUrl(page + 1)}>Next</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
