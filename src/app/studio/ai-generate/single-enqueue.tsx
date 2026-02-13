"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { enqueueProductAction } from "@/lib/actions/queue-actions";

/**
 * Search for a product by name or article number, then enqueue for AI generation.
 */
export function SingleEnqueueSearch() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{
      id: number;
      product_name: string | null;
      article_number: string;
      guide_status: string;
      hasAssemblyDoc: boolean;
    }>
  >([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setError(null);
    setSuccess(null);
    setSearched(false);

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/queue/product-search?q=${encodeURIComponent(query.trim())}`
        );
        if (!res.ok) {
          setError("Search failed");
          return;
        }
        const data = await res.json();
        setResults(data.products || []);
        setSearched(true);
      } catch {
        setError("Search failed");
      }
    });
  }

  function handleEnqueue(productId: number, productName: string | null) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const res = await enqueueProductAction(productId, {
        priority: "normal",
        triggeredBy: "manual",
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSuccess(`Queued: ${productName || `Product #${productId}`}`);
      // Remove the product from results
      setResults((prev) => prev.filter((p) => p.id !== productId));
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h3 className="text-sm font-semibold">Generate for Single Product</h3>
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          placeholder="Search by product name or article number..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={isPending || !query.trim()} className="cursor-pointer">
          {isPending ? "Searching..." : "Search"}
        </Button>
      </form>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/10 dark:bg-green-500/20 border border-green-500/30 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      {searched && results.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No products found matching &ldquo;{query}&rdquo;
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {results.map((product) => {
            const canEnqueue =
              product.hasAssemblyDoc &&
              (product.guide_status === "none" || product.guide_status === null);
            return (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">
                    {product.product_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {product.article_number}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!product.hasAssemblyDoc && (
                    <Badge variant="outline" className="text-[10px]">
                      No PDF
                    </Badge>
                  )}
                  {product.guide_status && product.guide_status !== "none" && (
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {product.guide_status}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs cursor-pointer"
                    disabled={!canEnqueue || isPending}
                    onClick={() => handleEnqueue(product.id, product.product_name)}
                  >
                    {canEnqueue ? "Generate" : "N/A"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
