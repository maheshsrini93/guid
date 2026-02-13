import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { SubmissionActions } from "./submission-actions";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "needs_info", label: "Needs Info" },
  { value: "processing", label: "Processing" },
] as const;

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    approved:
      "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30",
    rejected:
      "bg-destructive/10 text-destructive border-destructive/30",
    needs_info:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    processing:
      "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  };

  return (
    <Badge
      variant="outline"
      className={styles[status] ?? "bg-muted text-muted-foreground"}
    >
      {status === "needs_info" ? "Needs Info" : status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

interface SubmissionsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function SubmissionsPage({
  searchParams,
}: SubmissionsPageProps) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";

  // Fetch stats
  const [totalPending, totalApproved, totalRejected] = await Promise.all([
    prisma.guideSubmission.count({ where: { status: "pending" } }),
    prisma.guideSubmission.count({ where: { status: "approved" } }),
    prisma.guideSubmission.count({ where: { status: "rejected" } }),
  ]);

  // Fetch submissions with filter
  const whereClause =
    statusFilter !== "all" ? { status: statusFilter } : {};

  const submissions = await prisma.guideSubmission.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          article_number: true,
          product_name: true,
        },
      },
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Guide Submissions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review community-submitted assembly guides.
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Pending Review</p>
          <p className="mt-1 text-2xl font-bold font-mono">{totalPending}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="mt-1 text-2xl font-bold font-mono">{totalApproved}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Rejected</p>
          <p className="mt-1 text-2xl font-bold font-mono">{totalRejected}</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={
              opt.value === "all"
                ? "/studio/submissions"
                : `/studio/submissions?status=${opt.value}`
            }
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors duration-200 ${
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* Submissions list */}
      {submissions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No submissions found
            {statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/products/${submission.product.article_number}`}
                      className="font-medium hover:underline cursor-pointer truncate"
                    >
                      {submission.product.product_name ??
                        submission.product.article_number}
                    </Link>
                    <StatusBadge status={submission.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted by{" "}
                    <span className="font-medium">
                      {submission.user.name ?? submission.user.email}
                    </span>{" "}
                    on{" "}
                    {submission.createdAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Content preview */}
              {submission.textContent && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {submission.textContent.slice(0, 200)}
                  {submission.textContent.length > 200 ? "..." : ""}
                </p>
              )}

              {/* Content indicators */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {submission.textContent && (
                  <span className="rounded bg-muted px-2 py-0.5">
                    Text instructions
                  </span>
                )}
                {submission.photos &&
                  Array.isArray(submission.photos) &&
                  (submission.photos as string[]).length > 0 && (
                    <span className="rounded bg-muted px-2 py-0.5">
                      {(submission.photos as string[]).length} photo
                      {(submission.photos as string[]).length !== 1 ? "s" : ""}
                    </span>
                  )}
                {submission.videoLinks &&
                  Array.isArray(submission.videoLinks) &&
                  (submission.videoLinks as string[]).length > 0 && (
                    <span className="rounded bg-muted px-2 py-0.5">
                      {(submission.videoLinks as string[]).length} video link
                      {(submission.videoLinks as string[]).length !== 1
                        ? "s"
                        : ""}
                    </span>
                  )}
                {submission.toolsList && (
                  <span className="rounded bg-muted px-2 py-0.5">
                    Tools listed
                  </span>
                )}
                {submission.difficulty && (
                  <span className="rounded bg-muted px-2 py-0.5">
                    {submission.difficulty} difficulty
                  </span>
                )}
                {submission.estimatedTime && (
                  <span className="rounded bg-muted px-2 py-0.5">
                    ~{submission.estimatedTime} min
                  </span>
                )}
              </div>

              {/* Review notes (if any) */}
              {submission.reviewNotes && (
                <div className="rounded bg-muted/50 p-2 text-xs">
                  <span className="font-medium">Review notes:</span>{" "}
                  {submission.reviewNotes}
                </div>
              )}

              {/* Actions */}
              <SubmissionActions
                submissionId={submission.id}
                status={submission.status}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
