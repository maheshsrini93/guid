import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobStatus } from "@prisma/client";

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
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status || "all";
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const PAGE_SIZE = 20;

  const validStatuses: JobStatus[] = ["queued", "processing", "review", "approved", "failed"];
  const where = statusFilter !== "all" && validStatuses.includes(statusFilter as JobStatus)
    ? { status: statusFilter as JobStatus }
    : undefined;

  const [jobs, total, statusCounts] = await Promise.all([
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
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Build counts map
  const counts: Record<string, number> = {};
  let totalCount = 0;
  for (const row of statusCounts) {
    counts[row.status] = row._count.status;
    totalCount += row._count.status;
  }

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (statusFilter !== "all" && !overrides.status) p.set("status", statusFilter);
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== "all") p.set(key, value);
    }
    const qs = p.toString();
    return `/studio/ai-generate${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">AI Guide Generation</h1>
        <p className="text-sm text-muted-foreground">
          {total} job{total !== 1 ? "s" : ""} {statusFilter !== "all" && `(${statusFilter})`}
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
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

      {/* Jobs table */}
      {jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No generation jobs{statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Article #</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Confidence</th>
                <th className="px-4 py-3 font-medium">Model</th>
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
                              ? "text-green-600"
                              : job.confidenceScore >= 0.7
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {(job.confidenceScore * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {job.modelPrimary || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {job.createdAt.toLocaleDateString()}{" "}
                      {job.createdAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/studio/ai-generate/${job.id}`}>
                          {job.status === "review" ? "Review" : "View"}
                        </Link>
                      </Button>
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
