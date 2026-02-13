import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 50;

export default async function StudioProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const filter = params.filter || "all";

  const baseWhere = query
    ? {
        OR: [
          { product_name: { contains: query, mode: "insensitive" as const } },
          { article_number: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  // Apply filter for assembly docs
  const where =
    filter === "assembly"
      ? { ...baseWhere, documents: { some: { document_type: "assembly" } } }
      : filter === "no-assembly"
        ? { ...baseWhere, documents: { none: { document_type: "assembly" } } }
        : baseWhere;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        article_number: true,
        product_name: true,
        product_type: true,
        price_current: true,
        documents: { where: { document_type: "assembly" }, select: { id: true } },
        _count: { select: { images: true, documents: true } },
      },
      orderBy: { article_number: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string>) {
    const p = { ...(query && { q: query }), ...(filter !== "all" && { filter }), page: String(page), ...overrides };
    return `/studio/products?${new URLSearchParams(p)}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Catalog</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} products
          </p>
        </div>
        <form className="flex gap-2">
          <Input
            name="q"
            placeholder="Search..."
            defaultValue={query}
            className="w-64"
          />
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        </form>
      </div>

      <div className="mb-4 flex gap-2">
        {[
          { key: "all", label: "All" },
          { key: "assembly", label: "Has Assembly PDF" },
          { key: "no-assembly", label: "No Assembly PDF" },
        ].map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={buildUrl({ filter: f.key, page: "1" })}>{f.label}</Link>
          </Button>
        ))}
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium">Article #</th>
              <th className="px-4 py-3 font-medium">Product Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium text-right">Price</th>
              <th className="px-4 py-3 font-medium text-center">Images</th>
              <th className="px-4 py-3 font-medium text-center">Assembly</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/products/${product.article_number}`}
                    className="font-mono text-blue-600 hover:underline"
                  >
                    {product.article_number}
                  </Link>
                </td>
                <td className="px-4 py-3 max-w-xs truncate">
                  {product.product_name || "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                  {product.product_type || "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  {product.price_current != null
                    ? `$${product.price_current.toFixed(2)}`
                    : "-"}
                </td>
                <td className="px-4 py-3 text-center">
                  {product._count.images}
                </td>
                <td className="px-4 py-3 text-center">
                  {product.documents.length > 0 ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      PDF
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={buildUrl({ page: String(page - 1) })}>Previous</Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={buildUrl({ page: String(page + 1) })}>Next</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
