import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { JobStatus } from "@prisma/client";
import {
  ProcessNextButton,
  ProcessAllButton,
  CancelJobButton,
  RetryJobButton,
} from "./queue-controls";
import { BatchEnqueueButton } from "./batch-enqueue";
import { SingleEnqueueSearch } from "./single-enqueue";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  queued: { label: "Queued", variant: "outline" },
  processing: { label: "Processing", variant: "secondary" },
  review: { label: "Needs Review", variant: "default" },
  approved: { label: "Approved", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
};

export default async function AIGeneratePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; source?: string; page?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status || "all";
  const priorityFilter = params.priority || "all";
  const sourceFilter = params.source || "all";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const PAGE_SIZE = 20;

  const validStatuses: JobStatus[] = ["queued", "processing", "review", "approved", "failed"];
  const validPriorities = ["high", "normal", "low"] as const;
  const validSources = ["manual", "batch", "auto_sync"] as const;

  // Build composite where clause from all filters
  const where: Record<string, unknown> = {};
  if (statusFilter !== "all" && validStatuses.includes(statusFilter as JobStatus)) {
    where.status = statusFilter;
  }
  if (priorityFilter !== "all" && validPriorities.includes(priorityFilter as (typeof validPriorities)[number])) {
    where.priority = priorityFilter;
  }
  if (sourceFilter !== "all" && validSources.includes(sourceFilter as (typeof validSources)[number])) {
    where.triggeredBy = sourceFilter;
  }
  const hasFilters = Object.keys(where).length > 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    jobs,
    total,
    statusCounts,
    avgConfidenceResult,
    oldestQueued,
    eligibleCount,
    // Batch analytics queries
    recentCompletedJobs,
    failedReasons,
    last7DaysCompleted,
    triggerCounts,
  ] = await Promise.all([
    prisma.aIGenerationJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        product: {
          select: {
            id: true,
            product_name: true,
            article_number: true,
          },
        },
      },
    }),
    prisma.aIGenerationJob.count({ where }),
    prisma.aIGenerationJob.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.aIGenerationJob.aggregate({
      where: { confidenceScore: { not: null } },
      _avg: { confidenceScore: true },
    }),
    prisma.aIGenerationJob.findFirst({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.product.count({
      where: {
        guide_status: "none",
        documents: { some: { document_type: "assembly" } },
        aiGenerationJobs: { none: { status: { in: ["queued", "processing"] } } },
      },
    }),

    // Avg processing time: recent completed jobs with timestamps
    prisma.aIGenerationJob.findMany({
      where: {
        completedAt: { not: null },
        status: { in: ["approved", "review"] },
      },
      select: { createdAt: true, completedAt: true },
      orderBy: { completedAt: "desc" },
      take: 100,
    }),

    // Failure reasons grouped (top 10 most common)
    prisma.aIGenerationJob.groupBy({
      by: ["reviewNotes"],
      where: { status: "failed", reviewNotes: { not: null } },
      _count: { reviewNotes: true },
      orderBy: { _count: { reviewNotes: "desc" } },
      take: 10,
    }),

    // Last 7 days throughput
    prisma.aIGenerationJob.findMany({
      where: {
        completedAt: { gte: sevenDaysAgo },
      },
      select: { completedAt: true, status: true },
    }),

    // Jobs by trigger source
    prisma.aIGenerationJob.groupBy({
      by: ["triggeredBy"],
      _count: { triggeredBy: true },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build counts map
  const counts: Record<string, number> = {};
  let totalCount = 0;
  for (const row of statusCounts) {
    counts[row.status] = row._count.status;
    totalCount += row._count.status;
  }

  const avgConfidence = avgConfidenceResult._avg.confidenceScore;

  // ── Batch Analytics Computations ──

  // Success rate
  const approvedCount = counts["approved"] || 0;
  const failedCount = counts["failed"] || 0;
  const terminalCount = approvedCount + failedCount;
  const successRate = terminalCount > 0 ? approvedCount / terminalCount : null;

  // Average processing time (in minutes)
  let avgProcessingMinutes: number | null = null;
  if (recentCompletedJobs.length > 0) {
    const totalMs = recentCompletedJobs.reduce((sum, job) => {
      const diff = job.completedAt!.getTime() - job.createdAt.getTime();
      return sum + diff;
    }, 0);
    avgProcessingMinutes = totalMs / recentCompletedJobs.length / 1000 / 60;
  }

  // Daily throughput (last 7 days)
  const dailyThroughput: { date: string; completed: number; failed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const dayJobs = last7DaysCompleted.filter((j) => {
      const t = j.completedAt!.getTime();
      return t >= dayStart.getTime() && t <= dayEnd.getTime();
    });

    dailyThroughput.push({
      date: dateStr,
      completed: dayJobs.filter((j) => j.status !== "failed").length,
      failed: dayJobs.filter((j) => j.status === "failed").length,
    });
  }

  const maxDailyJobs = Math.max(1, ...dailyThroughput.map((d) => d.completed + d.failed));

  // Trigger breakdown
  const triggers: Record<string, number> = {};
  for (const row of triggerCounts) {
    triggers[row.triggeredBy] = row._count.triggeredBy;
  }

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    // Preserve current filters unless overridden
    if (statusFilter !== "all" && !overrides.status) p.set("status", statusFilter);
    if (priorityFilter !== "all" && !overrides.priority) p.set("priority", priorityFilter);
    if (sourceFilter !== "all" && !overrides.source) p.set("source", sourceFilter);
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== "all") p.set(key, value);
    }
    const qs = p.toString();
    return `/studio/ai-generate${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Guide Generation</h1>
          <p className="text-sm text-muted-foreground">
            {total} job{total !== 1 ? "s" : ""}
            {hasFilters && " (filtered)"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/studio/ai-generate/monitoring">Monitoring</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/studio/ai-generate/feedback">Reviewer Feedback</Link>
          </Button>
        </div>
      </div>

      {/* Queue stats overview */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Queued</p>
          <p className="text-xl font-bold font-mono">{counts["queued"] || 0}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Processing</p>
          <p className="text-xl font-bold font-mono">{counts["processing"] || 0}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">In Review</p>
          <p className="text-xl font-bold font-mono">{counts["review"] || 0}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Confidence</p>
          <p className={`text-xl font-bold font-mono ${
            (avgConfidence ?? 0) >= 0.9
              ? "text-green-600 dark:text-green-400"
              : (avgConfidence ?? 0) >= 0.7
                ? "text-amber-600 dark:text-amber-400"
                : "text-destructive"
          }`}>
            {avgConfidence != null
              ? `${(avgConfidence * 100).toFixed(0)}%`
              : "-"}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Failed</p>
          <p className="text-xl font-bold font-mono text-destructive">{counts["failed"] || 0}</p>
        </div>
      </div>

      {/* Queue controls */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ProcessNextButton queuedCount={counts["queued"] || 0} />
          <ProcessAllButton queuedCount={counts["queued"] || 0} />
          <BatchEnqueueButton eligibleCount={eligibleCount} />
        </div>
        {oldestQueued && (
          <span className="text-xs text-muted-foreground">
            Oldest queued: {oldestQueued.createdAt.toLocaleString()}
          </span>
        )}
      </div>

      {/* Single product enqueue */}
      <div className="mb-4">
        <SingleEnqueueSearch />
      </div>

      <Separator className="mb-4" />

      {/* Batch Processing Analytics */}
      {totalCount > 0 && (
        <>
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-3">Batch Analytics</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Completion rates */}
              <div className="rounded-lg border p-4">
                <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                  Completion Rates
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Success Rate</span>
                    <span className={`font-mono text-sm font-medium ${
                      (successRate ?? 0) >= 0.9
                        ? "text-green-600 dark:text-green-400"
                        : (successRate ?? 0) >= 0.7
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-destructive"
                    }`}>
                      {successRate != null ? `${(successRate * 100).toFixed(0)}%` : "-"}
                    </span>
                  </div>
                  {terminalCount > 0 && (
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${(successRate ?? 0) * 100}%` }}
                      />
                    </div>
                  )}
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{approvedCount} approved</span>
                    <span>{failedCount} failed</span>
                  </div>
                  {avgProcessingMinutes != null && (
                    <div className="flex items-center justify-between pt-1 border-t">
                      <span className="text-xs">Avg Processing Time</span>
                      <span className="font-mono text-sm">
                        {avgProcessingMinutes < 1
                          ? `${Math.round(avgProcessingMinutes * 60)}s`
                          : avgProcessingMinutes < 60
                            ? `${avgProcessingMinutes.toFixed(1)}m`
                            : `${(avgProcessingMinutes / 60).toFixed(1)}h`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 7-day throughput */}
              <div className="rounded-lg border p-4">
                <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                  7-Day Throughput
                </h3>
                <div className="flex items-end gap-1 h-20">
                  {dailyThroughput.map((day) => {
                    const total = day.completed + day.failed;
                    const height = total > 0 ? (total / maxDailyJobs) * 100 : 0;
                    const failedPct = total > 0 ? (day.failed / total) * 100 : 0;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full relative" style={{ height: "100%" }}>
                          <div className="absolute bottom-0 w-full flex flex-col">
                            {day.failed > 0 && (
                              <div
                                className="w-full bg-red-400 dark:bg-red-500 rounded-t-sm"
                                style={{ height: `${(failedPct / 100) * (height / 100) * 80}px` }}
                              />
                            )}
                            <div
                              className="w-full bg-primary rounded-t-sm"
                              style={{ height: `${((100 - failedPct) / 100) * (height / 100) * 80}px` }}
                            />
                          </div>
                        </div>
                        <span className="text-[8px] text-muted-foreground leading-none">
                          {day.date.split(" ")[1]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                  <span>
                    {last7DaysCompleted.filter((j) => j.status !== "failed").length} completed
                  </span>
                  <span>
                    {last7DaysCompleted.filter((j) => j.status === "failed").length} failed
                  </span>
                </div>
              </div>

              {/* Source breakdown + failure reasons */}
              <div className="rounded-lg border p-4">
                <h3 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                  Source & Failures
                </h3>
                <div className="space-y-2">
                  {/* Trigger source breakdown */}
                  <div className="space-y-1">
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

                  {/* Top failure reasons */}
                  {failedReasons.length > 0 && (
                    <div className="pt-2 border-t space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Top Failure Reasons
                      </p>
                      {failedReasons.slice(0, 5).map((reason, i) => (
                        <div key={i} className="flex items-start justify-between gap-2">
                          <span className="text-xs text-destructive truncate max-w-[180px]" title={reason.reviewNotes ?? ""}>
                            {reason.reviewNotes
                              ? reason.reviewNotes.length > 40
                                ? reason.reviewNotes.slice(0, 40) + "..."
                                : reason.reviewNotes
                              : "Unknown"}
                          </span>
                          <span className="font-mono text-xs text-muted-foreground shrink-0">
                            {reason._count.reviewNotes}x
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator className="mb-4" />
        </>
      )}

      {/* Filters */}
      <div className="mb-4 space-y-2">
        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider self-center mr-1">Status</span>
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={buildUrl({ status: "all", page: "1" })}>
              All ({totalCount})
            </Link>
          </Button>
          {(["review", "queued", "processing", "approved", "failed"] as const).map(
            (s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href={buildUrl({ status: s, page: "1" })}>
                  {STATUS_CONFIG[s].label} ({counts[s] || 0})
                </Link>
              </Button>
            )
          )}
        </div>

        {/* Priority + Source filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Priority</span>
            <Button
              variant={priorityFilter === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              asChild
            >
              <Link href={buildUrl({ priority: "all", page: "1" })}>All</Link>
            </Button>
            {(["high", "normal", "low"] as const).map((p) => (
              <Button
                key={p}
                variant={priorityFilter === p ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs capitalize"
                asChild
              >
                <Link href={buildUrl({ priority: p, page: "1" })}>{p}</Link>
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Source</span>
            <Button
              variant={sourceFilter === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              asChild
            >
              <Link href={buildUrl({ source: "all", page: "1" })}>All</Link>
            </Button>
            {(["manual", "batch", "auto_sync"] as const).map((src) => (
              <Button
                key={src}
                variant={sourceFilter === src ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs capitalize"
                asChild
              >
                <Link href={buildUrl({ source: src, page: "1" })}>
                  {src.replace("_", " ")}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Jobs table */}
      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No generation jobs{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Article #</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Confidence</th>
                <th className="px-4 py-3 font-medium text-center">Priority</th>
                <th className="px-4 py-3 font-medium text-center">Source</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const config = STATUS_CONFIG[job.status] || {
                  label: job.status,
                  variant: "outline" as const,
                };
                return (
                  <tr key={job.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 max-w-xs truncate">
                      {job.product.product_name || "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">
                        {job.product.article_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {job.confidenceScore != null ? (
                        <span
                          className={`font-mono text-xs font-medium ${
                            job.confidenceScore >= 0.9
                              ? "text-green-600 dark:text-green-400"
                              : job.confidenceScore >= 0.7
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-destructive"
                          }`}
                        >
                          {(job.confidenceScore * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {job.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] text-muted-foreground capitalize">
                        {job.triggeredBy.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {job.createdAt.toLocaleDateString()}{" "}
                      {job.createdAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {job.status === "queued" && (
                          <CancelJobButton jobId={job.id} />
                        )}
                        {job.status === "failed" && (
                          <RetryJobButton jobId={job.id} />
                        )}
                        <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                          <Link href={`/studio/ai-generate/${job.id}`}>
                            {job.status === "review" ? "Review" : "View"}
                          </Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={buildUrl({ page: String(page - 1) })}>
                Previous
              </Link>
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
