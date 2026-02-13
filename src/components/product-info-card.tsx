import Link from "next/link";
import Image from "next/image";

interface ProductInfoCardProps {
  articleNumber: string;
  productName: string;
  imageUrl?: string | null;
  price?: number | null;
  dimension?: string | null;
  dimensionLabel?: string | null;
}

export function ProductInfoCard({
  articleNumber,
  productName,
  imageUrl,
  price,
  dimension,
  dimensionLabel,
}: ProductInfoCardProps) {
  return (
    <Link
      href={`/products/${articleNumber}/details`}
      className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
    >
      {/* Product Thumbnail */}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={productName}
            fill
            sizes="48px"
            className="object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
            No img
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight line-clamp-1">
          {productName}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {articleNumber}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          {price != null && (
            <span className="font-medium text-foreground">
              ${price.toFixed(2)}
            </span>
          )}
          {dimension && dimensionLabel && (
            <span>
              {dimensionLabel}: {dimension}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <span className="shrink-0 text-sm text-muted-foreground group-hover:text-foreground transition-colors">
        View details &rarr;
      </span>
    </Link>
  );
}
