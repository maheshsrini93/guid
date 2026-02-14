import Image from "next/image";
import { ExternalLink, Store, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildAffiliateUrlSync } from "@/lib/affiliate";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import type { CrossRetailerMatch } from "@/components/cross-retailer-section";

interface PriceComparisonEntry {
  retailerName: string;
  retailerSlug: string;
  logoUrl: string | null;
  price: number | null;
  productUrl: string;
  articleNumber: string;
  isCurrent: boolean;
  matchConfidence: number | null;
  affiliateConfig: unknown;
}

interface PriceComparisonSectionProps {
  /** Current product data to include in the comparison */
  currentProduct: {
    article_number: string;
    price_current: number | null;
    source_retailer: string;
    source_url: string | null;
    retailer: {
      name: string;
      slug: string;
      logoUrl: string | null;
      baseUrl: string;
      affiliateConfig: unknown;
    } | null;
  };
  matches: CrossRetailerMatch[];
}

export function PriceComparisonSection({
  currentProduct,
  matches,
}: PriceComparisonSectionProps) {
  // Build unified list: current product + all matches (excluding current from matches)
  const otherRetailers = matches.filter(
    (m) => m.article_number !== currentProduct.article_number
  );

  if (otherRetailers.length === 0) return null;

  const currentRetailerName =
    currentProduct.retailer?.name ||
    currentProduct.source_retailer.charAt(0).toUpperCase() +
      currentProduct.source_retailer.slice(1);

  const entries: PriceComparisonEntry[] = [
    {
      retailerName: currentRetailerName,
      retailerSlug: currentProduct.retailer?.slug || currentProduct.source_retailer,
      logoUrl: currentProduct.retailer?.logoUrl || null,
      price: currentProduct.price_current,
      productUrl: currentProduct.source_url || currentProduct.retailer?.baseUrl || "#",
      articleNumber: currentProduct.article_number,
      isCurrent: true,
      matchConfidence: null,
      affiliateConfig: currentProduct.retailer?.affiliateConfig ?? null,
    },
    ...otherRetailers.map((m) => {
      const rawUrl = m.source_url || m.retailer?.baseUrl || "#";
      const slug = m.retailer?.slug || m.source_retailer;
      const { url: affiliateUrl } = buildAffiliateUrlSync(
        rawUrl,
        slug,
        m.retailer?.affiliateConfig
      );
      return {
        retailerName:
          m.retailer?.name ||
          m.source_retailer.charAt(0).toUpperCase() + m.source_retailer.slice(1),
        retailerSlug: slug,
        logoUrl: m.retailer?.logoUrl || null,
        price: m.price_current,
        productUrl: affiliateUrl,
        articleNumber: m.article_number,
        isCurrent: false,
        matchConfidence: m.matchConfidence,
        affiliateConfig: m.retailer?.affiliateConfig ?? null,
      };
    }),
  ];

  // Find the best (lowest) price among entries with a known price
  const pricesWithValues = entries.filter((e) => e.price != null);
  const bestPrice =
    pricesWithValues.length > 0
      ? Math.min(...pricesWithValues.map((e) => e.price!))
      : null;

  const hasFuzzyMatches = entries.some(
    (e) => e.matchConfidence != null && e.matchConfidence < 1
  );

  // Collect retailer data for affiliate disclosure
  const retailersForDisclosure = entries
    .filter((e) => !e.isCurrent && e.affiliateConfig)
    .map((e) => ({ slug: e.retailerSlug, affiliateConfig: e.affiliateConfig }));

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <Tag className="h-5 w-5 text-primary" aria-hidden="true" />
        Compare Prices
      </h2>
      <div className="overflow-hidden rounded-lg border">
        {entries.map((entry, index) => {
          const isBestPrice =
            bestPrice != null &&
            entry.price != null &&
            entry.price === bestPrice;

          return (
            <div
              key={`${entry.retailerSlug}-${entry.articleNumber}`}
              className={`flex min-h-[60px] items-center gap-3 p-3 sm:gap-4 sm:p-4 ${
                index > 0 ? "border-t" : ""
              } ${
                isBestPrice
                  ? "bg-primary/5 dark:bg-primary/10"
                  : "bg-card"
              }`}
            >
              {/* Retailer logo */}
              <div className="flex h-10 w-16 shrink-0 items-center justify-center sm:w-20">
                {entry.logoUrl ? (
                  <Image
                    src={entry.logoUrl}
                    alt={`${entry.retailerName} logo`}
                    width={80}
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

              {/* Retailer name + current indicator */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{entry.retailerName}</p>
                  {entry.isCurrent && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Viewing
                    </span>
                  )}
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {entry.articleNumber}
                </p>
              </div>

              {/* Price + best price badge */}
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <div className="text-right">
                  {entry.price != null ? (
                    <p
                      className={`font-mono text-base font-semibold ${
                        isBestPrice ? "text-green-600 dark:text-green-400" : ""
                      }`}
                    >
                      ${entry.price.toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">See price</p>
                  )}
                  {isBestPrice && pricesWithValues.length > 1 && (
                    <p className="text-xs font-medium text-green-600 dark:text-green-400">
                      Best price
                    </p>
                  )}
                </div>

                {/* Buy button (external link for other retailers, muted for current) */}
                {entry.isCurrent ? (
                  <span className="hidden sm:inline-flex h-9 items-center rounded-md bg-muted px-3 text-sm text-muted-foreground">
                    Current
                  </span>
                ) : (
                  <Button
                    variant={isBestPrice ? "default" : "outline"}
                    size="sm"
                    className="min-h-[44px] gap-1.5 sm:min-h-0"
                    asChild
                  >
                    <a
                      href={entry.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="hidden sm:inline">
                        Buy at {entry.retailerName}
                      </span>
                      <span className="sm:hidden">Buy</span>
                      <ExternalLink
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hasFuzzyMatches && (
        <p className="mt-2 text-xs text-muted-foreground">
          Some matches are based on similarity scoring. Verify exact product
          specifications before purchasing from a different retailer.
        </p>
      )}
      <AffiliateDisclosure retailers={retailersForDisclosure} />
    </div>
  );
}
