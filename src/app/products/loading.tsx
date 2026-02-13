import { ProductGridSkeleton } from "@/components/product-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        {/* Desktop sidebar skeleton */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <Skeleton className="h-6 w-20 mb-4" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full mb-2" />
          ))}
          <Skeleton className="h-px w-full my-4" />
          <Skeleton className="h-6 w-24 mb-4" />
          <Skeleton className="h-8 w-full" />
        </aside>

        {/* Product grid skeleton */}
        <div className="flex-1">
          <ProductGridSkeleton count={6} />
        </div>
      </div>
    </main>
  );
}
