import Image from "next/image";
import { ExternalLink, Store } from "lucide-react";
import { buildAffiliateUrlSync } from "@/lib/affiliate";

export interface CrossRetailerMatch {
  id: number;
  article_number: string;
  product_name: string | null;
  price_current: number | null;
  source_url: string | null;
  source_retailer: string;
  matchConfidence: number | null;
  retailer: {
    name: string;
    slug: string;
    logoUrl: string | null;
    baseUrl: string;
    affiliateConfig: unknown;
  } | null;
  images: { url: string }[];
}

interface CrossRetailerSectionProps {
  /** The article_number of the current product (excluded from display) */
  currentArticleNumber: string;
  matches: CrossRetailerMatch[];
}

export function CrossRetailerSection({
  currentArticleNumber,
  matches,
}: CrossRetailerSectionProps) {
  // Filter out the current product
  const otherRetailers = matches.filter(
    (m) => m.article_number !== currentArticleNumber
  );

  if (otherRetailers.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 font-semibold">Also Available At</h2>
      <div className="space-y-2">
        {otherRetailers.map((match) => {
          const retailerName =
            match.retailer?.name ||
            match.source_retailer.charAt(0).toUpperCase() +
              match.source_retailer.slice(1);
          const rawUrl = match.source_url || (match.retailer?.baseUrl ?? "#");
          const retailerSlug = match.retailer?.slug || match.source_retailer;
          const { url: productUrl } = buildAffiliateUrlSync(
            rawUrl,
            retailerSlug,
            match.retailer?.affiliateConfig
          );

          return (
            <a
              key={match.id}
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center gap-3 rounded-lg border bg-card p-3 transition-all duration-200 ease-out hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {/* Retailer logo or fallback */}
              <div className="flex h-10 w-16 shrink-0 items-center justify-center">
                {match.retailer?.logoUrl ? (
                  <Image
                    src={match.retailer.logoUrl}
                    alt={`${retailerName} logo`}
                    width={64}
                    height={32}
                    className="h-auto max-h-8 w-auto object-contain"
                  />
                ) : (
                  <Store
                    className="h-6 w-6 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Retailer name + product identifier */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{retailerName}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {match.article_number}
                </p>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2">
                {match.price_current != null ? (
                  <span className="font-mono text-base font-semibold">
                    ${match.price_current.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    See price
                  </span>
                )}
                <ExternalLink
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            </a>
          );
        })}
      </div>
      {otherRetailers.some((m) => m.matchConfidence != null && m.matchConfidence < 1) && (
        <p className="mt-2 text-xs text-muted-foreground">
          Cross-retailer matches are based on product identifiers. Verify
          specifications before purchasing.
        </p>
      )}
    </div>
  );
}
