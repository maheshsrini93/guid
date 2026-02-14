import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { MatchActions } from "./match-actions";

export const metadata = {
  title: "Product Matching — Studio | Guid",
};

interface MatchingPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function MatchingPage({
  searchParams,
}: MatchingPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const limit = 20;

  // Fetch stats in parallel
  const [
    totalMatched,
    totalUnmatched,
    matchGroups,
    totalGroupCount,
  ] = await Promise.all([
    prisma.product.count({ where: { matchGroupId: { not: null } } }),
    prisma.product.count({ where: { matchGroupId: null } }),
    prisma.product.groupBy({
      by: ["matchGroupId"],
      where: { matchGroupId: { not: null } },
      _count: true,
      _avg: { matchConfidence: true },
      orderBy: { matchGroupId: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product
      .groupBy({
        by: ["matchGroupId"],
        where: { matchGroupId: { not: null } },
      })
      .then((g) => g.length),
  ]);

  // Fetch product details for each group
  const groupDetails = await Promise.all(
    matchGroups.map(async (g) => {
      const products = await prisma.product.findMany({
        where: { matchGroupId: g.matchGroupId },
        select: {
          id: true,
          article_number: true,
          product_name: true,
          source_retailer: true,
          price_current: true,
          price_currency: true,
          matchConfidence: true,
          images: { take: 1, select: { url: true } },
        },
        orderBy: { source_retailer: "asc" },
      });

      return {
        matchGroupId: g.matchGroupId!,
        productCount: g._count,
        avgConfidence: g._avg.matchConfidence,
        products,
      };
    })
  );

  const totalPages = Math.ceil(totalGroupCount / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Matching</h1>
          <p className="text-muted-foreground text-sm">
            Cross-retailer product deduplication and linking
          </p>
        </div>
        <MatchActions mode="run-pipeline" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Match Groups</p>
          <p className="text-2xl font-bold font-mono">{totalGroupCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Matched Products</p>
          <p className="text-2xl font-bold font-mono">{totalMatched}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Unmatched Products</p>
          <p className="text-2xl font-bold font-mono">{totalUnmatched}</p>
        </div>
      </div>

      {/* Match groups list */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Match Groups</h2>

        {groupDetails.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No match groups yet. Run the matching pipeline to find
              cross-retailer product matches.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupDetails.map((group) => (
              <div
                key={group.matchGroupId}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-muted-foreground font-mono">
                      {group.matchGroupId.slice(0, 8)}...
                    </code>
                    <Badge
                      variant="outline"
                      className="bg-primary/10 dark:bg-primary/20 text-primary border-primary/30 dark:border-primary/50"
                    >
                      {group.productCount} products
                    </Badge>
                    {group.avgConfidence !== null && (
                      <Badge
                        variant="outline"
                        className={
                          group.avgConfidence >= 0.85
                            ? "bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30 dark:border-green-500/50"
                            : "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/50"
                        }
                      >
                        {(group.avgConfidence * 100).toFixed(0)}% confidence
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 rounded-md border p-3 bg-background"
                    >
                      {product.images[0] ? (
                        <img
                          src={product.images[0].url}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {product.product_name ?? "Unnamed product"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">
                            {product.article_number}
                          </span>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {product.source_retailer}
                          </Badge>
                          {product.price_current !== null && (
                            <span className="font-mono">
                              ${product.price_current.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <MatchActions
                        mode="unlink"
                        productId={product.id}
                        productName={product.product_name ?? product.article_number}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {page > 1 && (
              <Link
                href={`/studio/matching?page=${page - 1}`}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent cursor-pointer"
              >
                Previous
              </Link>
            )}
            <span className="rounded-md px-3 py-1.5 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/studio/matching?page=${page + 1}`}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent cursor-pointer"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
