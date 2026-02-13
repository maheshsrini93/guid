import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * /studio/ai-generate/monitoring — Monitoring dashboard for AI generation jobs.
 *
 * Shows comprehensive stats: completion rates, processing times, model usage,
 * throughput trends, queue health, and cost estimates.
 */
export default async function MonitoringPage() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now);
  monthStart.setDate(monthStart.getDate() - 30);

  const [
    // ── Totals by status ──
    statusCounts,

    // ── Time-scoped completions ──
    completedToday,
    completedThisWeek,
    failedToday,
    failedThisWeek,

    // ── Confidence stats ──
    confidenceStats,

    // ── Processing time data ──
    recentProcessedJobs,

    // ── Model usage ──
    modelUsage,

    // ── Daily throughput (last 30 days) ──
    last30DaysJobs,

    // ── Queue health ──
    queuedJobs,
    processingJobs,

    // ── Trigger breakdown ──
    triggerCounts,

    // ── Auto-publish vs review ──
    autoPublishedCount,
    reviewedCount,

    // ── Total products with guides ──
    publishedGuideCount,
    totalProductCount,
  ] = await Promise.all([
    prisma.aIGenerationJob.groupBy({
      by: ["status"],
      _count: { id: true },
    }),

    prisma.aIGenerationJob.count({
      where: {
        status: { in: ["approved", "review"] },
        completedAt: { gte: todayStart },
      },
    }),
    prisma.aIGenerationJob.count({
      where: {
        status: { in: ["approved", "review"] },
        completedAt: { gte: weekStart },
      },
    }),
    prisma.aIGenerationJob.count({
      where: {
        status: "failed",
        completedAt: { gte: todayStart },
      },
    }),
    prisma.aIGenerationJob.count({
      where: {
        status: "failed",
        completedAt: { gte: weekStart },
      },
    }),

    prisma.aIGenerationJob.aggregate({
      where: { confidenceScore: { not: null } },
      _avg: { confidenceScore: true },
      _min: { confidenceScore: true },
      _max: { confidenceScore: true },
      _count: { confidenceScore: true },
    }),

    // Jobs with both startedAt and completedAt for processing time
    prisma.aIGenerationJob.findMany({
      where: {
        startedAt: { not: null },
        completedAt: { not: null },
        status: { in: ["approved", "review"] },
      },
      select: { startedAt: true, completedAt: true, createdAt: true },
      orderBy: { completedAt: "desc" },
      take: 200,
    }),

    prisma.aIGenerationJob.groupBy({
      by: ["modelPrimary"],
      where: { modelPrimary: { not: null } },
      _count: { id: true },
      _avg: { confidenceScore: true },
    }),

    prisma.aIGenerationJob.findMany({
      where: {
        completedAt: { gte: monthStart },
      },
      select: { completedAt: true, status: true },
    }),

    prisma.aIGenerationJob.findMany({
      where: { status: "queued" },
      select: { createdAt: true, priority: true },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),

    prisma.aIGenerationJob.count({
      where: { status: "processing" },
    }),

    prisma.aIGenerationJob.groupBy({
      by: ["triggeredBy"],
      _count: { id: true },
    }),

    prisma.aIGenerationJob.count({
      where: {
        status: "approved",
        autoPublished: true,
      },
    }),

    prisma.aIGenerationJob.count({
      where: {
        status: { in: ["approved", "review"] },
        autoPublished: false,
      },
    }),

    prisma.product.count({
      where: { guide_status: "published" },
    }),

    prisma.product.count(),
  ]);

  // ── Derived Metrics ──

  const statusMap: Record<string, number> = {};
  let totalJobs = 0;
  for (const row of statusCounts) {
    statusMap[row.status] = row._count.id;
    totalJobs += row._count.id;
  }

  const totalCompleted = (statusMap["approved"] || 0) + (statusMap["review"] || 0);
  const totalFailed = statusMap["failed"] || 0;
  const terminalCount = totalCompleted + totalFailed;
  const overallSuccessRate = terminalCount > 0 ? totalCompleted / terminalCount : null;
  const weeklyFailureRate =
    completedThisWeek + failedThisWeek > 0
      ? failedThisWeek / (completedThisWeek + failedThisWeek)
      : null;

  // Processing time percentiles
  const processingTimesMs = recentProcessedJobs
    .filter((j) => j.startedAt && j.completedAt)
    .map((j) => j.completedAt!.getTime() - j.startedAt!.getTime())
    .sort((a, b) => a - b);

  const avgProcessingMs =
    processingTimesMs.length > 0
      ? processingTimesMs.reduce((a, b) => a + b, 0) / processingTimesMs.length
      : null;
  const p50ProcessingMs =
    processingTimesMs.length > 0
      ? processingTimesMs[Math.floor(processingTimesMs.length * 0.5)]
      : null;
  const p95ProcessingMs =
    processingTimesMs.length > 0
      ? processingTimesMs[Math.floor(processingTimesMs.length * 0.95)]
      : null;

  // Queue wait time estimate
  const avgProcessingMinutes = avgProcessingMs ? avgProcessingMs / 60000 : null;
  const estimatedQueueMinutes =
    avgProcessingMinutes && queuedJobs.length > 0
      ? (queuedJobs.length / Math.max(1, 2)) * avgProcessingMinutes // Assume max 2 concurrent
      : null;

  // Daily throughput (last 14 days for display)
  const dailyData: { date: string; completed: number; failed: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const dayJobs = last30DaysJobs.filter((j) => {
      if (!j.completedAt) return false;
      const t = j.completedAt.getTime();
      return t >= dayStart.getTime() && t <= dayEnd.getTime();
    });

    dailyData.push({
      date: dayStr,
      completed: dayJobs.filter((j) => j.status !== "failed").length,
      failed: dayJobs.filter((j) => j.status === "failed").length,
    });
  }

  const maxDailyTotal = Math.max(1, ...dailyData.map((d) => d.completed + d.failed));

  // Trigger breakdown
  const triggers: Record<string, number> = {};
  for (const row of triggerCounts) {
    triggers[row.triggeredBy] = row._count.id;
  }

  // Cost estimates (rough: Gemini Flash ~$0.01/page, Pro ~$0.05/page, avg ~15 pages/guide)
  const COST_PER_GUIDE_ESTIMATE = 0.15; // $0.15 average
  const estimatedTotalCost = totalCompleted * COST_PER_GUIDE_ESTIMATE;
  const estimatedWeeklyCost = completedThisWeek * COST_PER_GUIDE_ESTIMATE;

  function formatMs(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  function confidenceColor(score: number): string {
    if (score >= 0.9) return "text-green-600 dark:text-green-400";
    if (score >= 0.7) return "text-amber-600 dark:text-amber-400";
    return "text-destructive";
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Generation Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Real-time stats and health metrics for AI guide generation
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/studio/ai-generate">Back to Queue</Link>
        </Button>
      </div>

      {/* ── Key Metrics ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard
          label="Completed Today"
          value={String(completedToday)}
          sub={`${failedToday} failed`}
        />
        <MetricCard
          label="Completed This Week"
          value={String(completedThisWeek)}
          sub={`${failedThisWeek} failed`}
        />
        <MetricCard
          label="Total Completed"
          value={String(totalCompleted)}
          sub={`of ${totalJobs} jobs`}
        />
        <MetricCard
          label="Success Rate"
          value={overallSuccessRate != null ? `${(overallSuccessRate * 100).toFixed(0)}%` : "-"}
          sub={weeklyFailureRate != null ? `${(weeklyFailureRate * 100).toFixed(0)}% fail rate (7d)` : ""}
          valueColor={
            overallSuccessRate != null
              ? overallSuccessRate >= 0.9
                ? "text-green-600 dark:text-green-400"
                : overallSuccessRate >= 0.7
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-destructive"
              : undefined
          }
        />
        <MetricCard
          label="Avg Confidence"
          value={
            confidenceStats._avg.confidenceScore != null
              ? `${(confidenceStats._avg.confidenceScore * 100).toFixed(0)}%`
              : "-"
          }
          sub={
            confidenceStats._min.confidenceScore != null
              ? `${(confidenceStats._min.confidenceScore * 100).toFixed(0)}% - ${(confidenceStats._max.confidenceScore! * 100).toFixed(0)}% range`
              : ""
          }
          valueColor={
            confidenceStats._avg.confidenceScore != null
              ? confidenceColor(confidenceStats._avg.confidenceScore)
              : undefined
          }
        />
        <MetricCard
          label="Guide Coverage"
          value={totalProductCount > 0 ? `${((publishedGuideCount / totalProductCount) * 100).toFixed(1)}%` : "-"}
          sub={`${publishedGuideCount} of ${totalProductCount} products`}
        />
      </div>

      <Separator className="mb-6" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Processing Performance ── */}
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold mb-3">Processing Performance</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Time</p>
                <p className="font-mono text-lg font-bold">
                  {avgProcessingMs != null ? formatMs(avgProcessingMs) : "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">P50</p>
                <p className="font-mono text-lg font-bold">
                  {p50ProcessingMs != null ? formatMs(p50ProcessingMs) : "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">P95</p>
                <p className="font-mono text-lg font-bold">
                  {p95ProcessingMs != null ? formatMs(p95ProcessingMs) : "-"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on {processingTimesMs.length} recent jobs with timing data
            </p>
          </div>
        </div>

        {/* ── Queue Health ── */}
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold mb-3">Queue Health</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Queued</p>
                <p className="font-mono text-lg font-bold">{queuedJobs.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Processing</p>
                <p className="font-mono text-lg font-bold">{processingJobs}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Wait</p>
                <p className="font-mono text-lg font-bold">
                  {estimatedQueueMinutes != null
                    ? estimatedQueueMinutes < 1
                      ? "<1m"
                      : estimatedQueueMinutes < 60
                        ? `${Math.round(estimatedQueueMinutes)}m`
                        : `${(estimatedQueueMinutes / 60).toFixed(1)}h`
                    : "-"}
                </p>
              </div>
            </div>
            {queuedJobs.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Queue by Priority
                </p>
                <div className="flex gap-3">
                  {(["high", "normal", "low"] as const).map((p) => {
                    const count = queuedJobs.filter((j) => j.priority === p).length;
                    return (
                      <div key={p} className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            p === "high"
                              ? "border-destructive/40 text-destructive"
                              : p === "low"
                                ? "border-muted-foreground/30 text-muted-foreground"
                                : ""
                          }`}
                        >
                          {p}
                        </Badge>
                        <span className="font-mono text-xs">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {queuedJobs.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Oldest queued: {queuedJobs[0].createdAt.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* ── 14-Day Throughput ── */}
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold mb-3">14-Day Throughput</h2>
          <div className="flex items-end gap-1 h-28">
            {dailyData.map((day) => {
              const total = day.completed + day.failed;
              const heightPct = total > 0 ? (total / maxDailyTotal) * 100 : 0;
              const failedPct = total > 0 ? (day.failed / total) * 100 : 0;
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-0.5"
                  title={`${day.date}: ${day.completed} completed, ${day.failed} failed`}
                >
                  <div className="w-full relative" style={{ height: "100%" }}>
                    <div className="absolute bottom-0 w-full flex flex-col">
                      {day.failed > 0 && (
                        <div
                          className="w-full bg-red-400 dark:bg-red-500 rounded-t-sm"
                          style={{ height: `${(failedPct / 100) * (heightPct / 100) * 112}px` }}
                        />
                      )}
                      {day.completed > 0 && (
                        <div
                          className="w-full bg-primary rounded-t-sm"
                          style={{
                            height: `${((100 - failedPct) / 100) * (heightPct / 100) * 112}px`,
                          }}
                        />
                      )}
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
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-primary" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-red-400 dark:bg-red-500" />
              <span>Failed</span>
            </div>
          </div>
        </div>

        {/* ── Model Usage ── */}
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold mb-3">Model Usage</h2>
          {modelUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground">No model data yet</p>
          ) : (
            <div className="space-y-2">
              {modelUsage
                .sort((a, b) => b._count.id - a._count.id)
                .map((model) => {
                  const pct = totalJobs > 0 ? (model._count.id / totalJobs) * 100 : 0;
                  return (
                    <div key={model.modelPrimary} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono truncate max-w-[200px]">
                          {model.modelPrimary}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {model._count.id} jobs
                          </span>
                          {model._avg.confidenceScore != null && (
                            <span
                              className={`font-mono text-xs font-medium ${confidenceColor(
                                model._avg.confidenceScore
                              )}`}
                            >
                              {(model._avg.confidenceScore * 100).toFixed(0)}% avg
                            </span>
                          )}
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

        {/* ── Auto-publish vs Review ── */}
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold mb-3">Publishing Pipeline</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Auto-Published
                </p>
                <p className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                  {autoPublishedCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Sent to Review
                </p>
                <p className="font-mono text-lg font-bold text-amber-600 dark:text-amber-400">
                  {reviewedCount}
                </p>
              </div>
            </div>
            {autoPublishedCount + reviewedCount > 0 && (
              <div>
                <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${(autoPublishedCount / (autoPublishedCount + reviewedCount)) * 100}%`,
                    }}
                  />
                  <div
                    className="h-full bg-amber-400"
                    style={{
                      width: `${(reviewedCount / (autoPublishedCount + reviewedCount)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>
                    {((autoPublishedCount / (autoPublishedCount + reviewedCount)) * 100).toFixed(0)}%
                    auto-published
                  </span>
                  <span>
                    {((reviewedCount / (autoPublishedCount + reviewedCount)) * 100).toFixed(0)}%
                    reviewed
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Source Breakdown & Cost ── */}
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold mb-3">Source & Cost</h2>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Jobs by Source
              </p>
              {(["manual", "batch", "auto_sync"] as const).map((trigger) => {
                const count = triggers[trigger] || 0;
                if (count === 0) return null;
                return (
                  <div key={trigger} className="flex items-center justify-between">
                    <span className="text-xs capitalize">{trigger.replace("_", " ")}</span>
                    <span className="font-mono text-xs">{count}</span>
                  </div>
                );
              })}
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Estimated Cost
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs">This week</span>
                <span className="font-mono text-sm font-medium">
                  ${estimatedWeeklyCost.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Total</span>
                <span className="font-mono text-sm font-medium">
                  ${estimatedTotalCost.toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Estimate based on ~$0.15/guide avg (Flash + Pro mix)
              </p>
            </div>
          </div>
        </div>
      </div>
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
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold font-mono ${valueColor || ""}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
