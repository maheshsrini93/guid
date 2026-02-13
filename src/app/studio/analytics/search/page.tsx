import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * /studio/analytics/search — Search analytics dashboard.
 *
 * Visualizes search behavior: popular queries, zero-result gaps,
 * click-through rates, daily volume, and discovery method breakdown.
 */
export default async function SearchAnalyticsPage() {
  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [allEvents, recentEvents, totalEventsCount] = await Promise.all([
    prisma.searchEvent.findMany({
      select: {
        eventType: true,
        query: true,
        method: true,
        resultCount: true,
        clickedId: true,
        createdAt: true,
      },
    }),
    prisma.searchEvent.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: {
        eventType: true,
        query: true,
        createdAt: true,
      },
    }),
    prisma.searchEvent.count(),
  ]);

  // ── Summary stats ──
  const searchQueries = allEvents.filter(
    (e) => e.eventType === "search_query"
  );
  const totalSearches = searchQueries.length;

  const uniqueQueries = new Set(
    searchQueries
      .filter((e) => e.query)
      .map((e) => e.query!.toLowerCase().trim())
  ).size;

  const totalClicks = allEvents.filter(
    (e) =>
      e.eventType === "search_autocomplete" ||
      (e.eventType === "search_query" && e.clickedId != null)
  ).length;
  const clickThroughRate =
    totalSearches > 0
      ? Math.round((totalClicks / totalSearches) * 100)
      : 0;

  const zeroResultEvents = allEvents.filter(
    (e) =>
      e.eventType === "search_zero_results" ||
      (e.eventType === "search_query" && e.resultCount === 0)
  );
  const zeroResultRate =
    totalSearches > 0
      ? Math.round((zeroResultEvents.length / totalSearches) * 100)
      : 0;

  // ── Top 20 queries ──
  const queryMap = new Map<
    string,
    { count: number; totalResults: number; clicks: number }
  >();
  for (const e of searchQueries) {
    if (!e.query) continue;
    const key = e.query.toLowerCase().trim();
    const entry = queryMap.get(key) || { count: 0, totalResults: 0, clicks: 0 };
    entry.count++;
    entry.totalResults += e.resultCount ?? 0;
    if (e.clickedId != null) entry.clicks++;
    queryMap.set(key, entry);
  }
  for (const e of allEvents) {
    if (e.eventType === "search_autocomplete" && e.query) {
      const key = e.query.toLowerCase().trim();
      const entry = queryMap.get(key);
      if (entry) entry.clicks++;
    }
  }

  const topQueries = [...queryMap.entries()]
    .map(([query, stats]) => ({
      query,
      count: stats.count,
      avgResults:
        stats.count > 0
          ? Math.round(stats.totalResults / stats.count)
          : 0,
      ctr:
        stats.count > 0
          ? Math.round((stats.clicks / stats.count) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // ── Zero-result queries (top 10) ──
  const zeroResultMap = new Map<
    string,
    { count: number; lastSearched: Date }
  >();
  for (const e of zeroResultEvents) {
    if (!e.query) continue;
    const key = e.query.toLowerCase().trim();
    const entry = zeroResultMap.get(key) || {
      count: 0,
      lastSearched: e.createdAt,
    };
    entry.count++;
    if (e.createdAt > entry.lastSearched) {
      entry.lastSearched = e.createdAt;
    }
    zeroResultMap.set(key, entry);
  }

  const zeroResultQueries = [...zeroResultMap.entries()]
    .map(([query, stats]) => ({
      query,
      count: stats.count,
      lastSearched: stats.lastSearched,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── Daily volume (last 14 days) ──
  const dailyVolume: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const count = recentEvents.filter(
      (e) =>
        e.eventType === "search_query" &&
        e.createdAt >= dayStart &&
        e.createdAt <= dayEnd
    ).length;

    dailyVolume.push({ date: dayStr, count });
  }
  const maxDailyCount = Math.max(1, ...dailyVolume.map((d) => d.count));

  // ── Discovery method breakdown ──
  const methodMap = new Map<string, number>();
  for (const e of allEvents) {
    if (e.method) {
      methodMap.set(e.method, (methodMap.get(e.method) || 0) + 1);
    }
  }
  const discoveryMethods = [...methodMap.entries()]
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);
  const totalMethodEvents = discoveryMethods.reduce(
    (sum, m) => sum + m.count,
    0
  );

  const methodLabels: Record<string, string> = {
    text: "Text Search",
    article_number: "Article Number",
    url: "URL Paste",
    recent: "Recent Searches",
    barcode: "Barcode Scan",
  };

  const isEmpty = totalEventsCount === 0;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Search Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Search behavior insights and content gap analysis
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/studio">Back to Studio</Link>
        </Button>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            No search events recorded yet. Events will appear here as users
            search the product catalog.
          </p>
        </div>
      ) : (
        <>
          {/* ── Summary Row ── */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Total Searches"
              value={totalSearches.toLocaleString()}
              sub={`${totalEventsCount.toLocaleString()} total events`}
            />
            <MetricCard
              label="Unique Queries"
              value={uniqueQueries.toLocaleString()}
            />
            <MetricCard
              label="Click-Through Rate"
              value={`${clickThroughRate}%`}
              sub={`${totalClicks.toLocaleString()} clicks`}
              valueColor={
                clickThroughRate >= 50
                  ? "text-green-600 dark:text-green-400"
                  : clickThroughRate >= 20
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-destructive"
              }
            />
            <MetricCard
              label="Zero-Result Rate"
              value={`${zeroResultRate}%`}
              sub={`${zeroResultEvents.length.toLocaleString()} searches`}
              valueColor={
                zeroResultRate <= 5
                  ? "text-green-600 dark:text-green-400"
                  : zeroResultRate <= 15
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-destructive"
              }
            />
          </div>

          <Separator className="mb-6" />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ── Popular Queries ── */}
            <div className="rounded-lg border p-4">
              <h2 className="text-sm font-semibold mb-3">Popular Queries</h2>
              {topQueries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No search queries recorded yet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 text-xs text-muted-foreground font-medium">
                          Query
                        </th>
                        <th className="pb-2 text-xs text-muted-foreground font-medium text-right">
                          Count
                        </th>
                        <th className="pb-2 text-xs text-muted-foreground font-medium text-right">
                          Avg Results
                        </th>
                        <th className="pb-2 text-xs text-muted-foreground font-medium text-right">
                          CTR
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topQueries.map((q, i) => (
                        <tr
                          key={q.query}
                          className={
                            i % 2 === 0 ? "bg-muted/50" : ""
                          }
                        >
                          <td className="py-1.5 px-1 truncate max-w-[200px]">
                            {q.query}
                          </td>
                          <td className="py-1.5 px-1 text-right font-mono">
                            {q.count}
                          </td>
                          <td className="py-1.5 px-1 text-right font-mono">
                            {q.avgResults}
                          </td>
                          <td className="py-1.5 px-1 text-right font-mono">
                            {q.ctr}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Zero-Result Queries ── */}
            <div className="rounded-lg border p-4">
              <h2 className="text-sm font-semibold mb-3">
                Zero-Result Queries
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Content gaps — queries where users found nothing
              </p>
              {zeroResultQueries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No zero-result queries recorded
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 text-xs text-muted-foreground font-medium">
                          Query
                        </th>
                        <th className="pb-2 text-xs text-muted-foreground font-medium text-right">
                          Count
                        </th>
                        <th className="pb-2 text-xs text-muted-foreground font-medium text-right">
                          Last Searched
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {zeroResultQueries.map((q, i) => (
                        <tr
                          key={q.query}
                          className={
                            i % 2 === 0 ? "bg-muted/50" : ""
                          }
                        >
                          <td className="py-1.5 px-1 truncate max-w-[200px]">
                            {q.query}
                          </td>
                          <td className="py-1.5 px-1 text-right font-mono text-destructive">
                            {q.count}
                          </td>
                          <td className="py-1.5 px-1 text-right text-xs text-muted-foreground">
                            {q.lastSearched.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Daily Volume ── */}
            <div className="rounded-lg border p-4">
              <h2 className="text-sm font-semibold mb-3">
                Daily Search Volume (14 days)
              </h2>
              <div className="flex items-end gap-1 h-28">
                {dailyVolume.map((day) => {
                  const heightPct =
                    day.count > 0 ? (day.count / maxDailyCount) * 100 : 0;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-0.5"
                      title={`${day.date}: ${day.count} searches`}
                    >
                      <div className="w-full relative" style={{ height: "100%" }}>
                        <div className="absolute bottom-0 w-full">
                          <div
                            className="w-full bg-primary rounded-t-sm"
                            style={{
                              height: `${(heightPct / 100) * 112}px`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-[7px] text-muted-foreground leading-none">
                        {day.date.split(" ")[1]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{dailyVolume[0]?.date}</span>
                <span>{dailyVolume[dailyVolume.length - 1]?.date}</span>
              </div>
            </div>

            {/* ── Discovery Methods ── */}
            <div className="rounded-lg border p-4">
              <h2 className="text-sm font-semibold mb-3">
                Discovery Methods
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                How users find products
              </p>
              {discoveryMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No discovery data yet
                </p>
              ) : (
                <div className="space-y-3">
                  {discoveryMethods.map((m) => {
                    const pct =
                      totalMethodEvents > 0
                        ? (m.count / totalMethodEvents) * 100
                        : 0;
                    return (
                      <div key={m.method} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs">
                            {methodLabels[m.method] ?? m.method}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {m.count.toLocaleString()}
                            </span>
                            <span className="font-mono text-xs font-medium">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-xl font-bold font-mono ${valueColor || ""}`}>
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      )}
    </div>
  );
}
