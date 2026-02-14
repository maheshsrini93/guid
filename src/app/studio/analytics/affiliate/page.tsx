import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Affiliate Analytics — Studio | Guid",
};

/**
 * /studio/analytics/affiliate — Affiliate click and conversion analytics.
 *
 * Tracks clicks per retailer, per product, and over time.
 * Uses SearchEvent records with eventType "affiliate_click".
 */
export default async function AffiliateAnalyticsPage() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch all affiliate click events
  const [allClicks, recentClicks, weekClicks] = await Promise.all([
    prisma.searchEvent.count({
      where: { eventType: "affiliate_click" },
    }),
    prisma.searchEvent.findMany({
      where: {
        eventType: "affiliate_click",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        query: true,         // retailer slug
        clickedId: true,     // product ID
        userId: true,
        sessionId: true,
        createdAt: true,
      },
    }),
    prisma.searchEvent.count({
      where: {
        eventType: "affiliate_click",
        createdAt: { gte: sevenDaysAgo },
      },
    }),
  ]);

  // ── Per-retailer breakdown ──
  const retailerCounts = new Map<string, number>();
  for (const click of recentClicks) {
    const slug = click.query ?? "unknown";
    retailerCounts.set(slug, (retailerCounts.get(slug) ?? 0) + 1);
  }

  const retailerBreakdown = Array.from(retailerCounts.entries())
    .map(([slug, count]) => ({ slug, count }))
    .sort((a, b) => b.count - a.count);

  // ── Top products by clicks ──
  const productCounts = new Map<number, number>();
  for (const click of recentClicks) {
    if (click.clickedId != null) {
      productCounts.set(
        click.clickedId,
        (productCounts.get(click.clickedId) ?? 0) + 1
      );
    }
  }

  const topProductIds = Array.from(productCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Fetch product names for top products
  const productDetails =
    topProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: topProductIds.map(([id]) => id) } },
          select: {
            id: true,
            article_number: true,
            product_name: true,
            source_retailer: true,
          },
        })
      : [];

  const productMap = new Map(productDetails.map((p) => [p.id, p]));

  // ── Daily volume (last 14 days) ──
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const dailyVolume = new Map<string, number>();
  for (let d = 0; d < 14; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    dailyVolume.set(date.toISOString().slice(0, 10), 0);
  }

  for (const click of recentClicks) {
    const day = click.createdAt.toISOString().slice(0, 10);
    if (dailyVolume.has(day)) {
      dailyVolume.set(day, dailyVolume.get(day)! + 1);
    }
  }

  const dailyData = Array.from(dailyVolume.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  const maxDaily = Math.max(1, ...dailyData.map((d) => d.count));

  // ── Unique users / sessions ──
  const uniqueUsers = new Set(
    recentClicks.filter((c) => c.userId).map((c) => c.userId)
  ).size;
  const uniqueSessions = new Set(
    recentClicks.filter((c) => c.sessionId).map((c) => c.sessionId)
  ).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Affiliate Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Click tracking per retailer, product, and time period
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Clicks</p>
          <p className="text-2xl font-bold font-mono">{allClicks}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Last 7 Days</p>
          <p className="text-2xl font-bold font-mono">{weekClicks}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Unique Users (30d)</p>
          <p className="text-2xl font-bold font-mono">{uniqueUsers}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Sessions (30d)</p>
          <p className="text-2xl font-bold font-mono">{uniqueSessions}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Per-retailer breakdown */}
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold mb-3">Clicks by Retailer</h2>
          {retailerBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No affiliate clicks recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {retailerBreakdown.map(({ slug, count }) => (
                <div key={slug} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">
                    {slug}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-primary/20 w-32">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${Math.round((count / recentClicks.length) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-mono text-muted-foreground w-10 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products by clicks */}
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold mb-3">Top Products</h2>
          {topProductIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No product-level click data yet.
            </p>
          ) : (
            <div className="space-y-2">
              {topProductIds.map(([productId, count], i) => {
                const product = productMap.get(productId);
                return (
                  <div
                    key={productId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground font-mono w-5">
                        {i + 1}.
                      </span>
                      <span className="text-sm truncate">
                        {product?.product_name ?? `Product #${productId}`}
                      </span>
                      {product && (
                        <span className="text-xs text-muted-foreground font-mono">
                          {product.source_retailer}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-mono text-muted-foreground shrink-0">
                      {count} clicks
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Daily volume chart (last 14 days) */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-lg font-semibold mb-3">
          Daily Click Volume (14 days)
        </h2>
        <div className="flex items-end gap-1 h-32">
          {dailyData.map(({ date, count }) => (
            <div
              key={date}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <div
                className="w-full rounded-t bg-primary/80 min-h-[2px]"
                style={{
                  height: `${Math.round((count / maxDaily) * 100)}%`,
                }}
                title={`${date}: ${count} clicks`}
              />
              <span className="text-[10px] text-muted-foreground -rotate-45 origin-top-left">
                {date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
