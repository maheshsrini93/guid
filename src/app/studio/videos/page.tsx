import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { VideoActions } from "./video-actions";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    approved:
      "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30",
    rejected:
      "bg-destructive/10 text-destructive border-destructive/30",
  };

  return (
    <Badge
      variant="outline"
      className={styles[status] ?? "bg-muted text-muted-foreground"}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

interface VideosPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function VideosPage({ searchParams }: VideosPageProps) {
  const params = await searchParams;
  const statusFilter = params.status ?? "all";

  const [totalPending, totalApproved, totalRejected] = await Promise.all([
    prisma.videoSubmission.count({ where: { status: "pending" } }),
    prisma.videoSubmission.count({ where: { status: "approved" } }),
    prisma.videoSubmission.count({ where: { status: "rejected" } }),
  ]);

  const whereClause =
    statusFilter !== "all" ? { status: statusFilter } : {};

  const submissions = await prisma.videoSubmission.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          article_number: true,
          product_name: true,
        },
      },
      creator: {
        select: {
          channelName: true,
          youtubeChannelUrl: true,
        },
      },
    },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Video Submissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review video guides submitted by creators.
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Pending Review</p>
          <p className="mt-1 font-mono text-2xl font-bold">{totalPending}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Approved</p>
          <p className="mt-1 font-mono text-2xl font-bold">{totalApproved}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Rejected</p>
          <p className="mt-1 font-mono text-2xl font-bold">{totalRejected}</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={
              opt.value === "all"
                ? "/studio/videos"
                : `/studio/videos?status=${opt.value}`
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
            No video submissions found
            {statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((video) => (
            <div
              key={video.id}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-start gap-4">
                {/* YouTube thumbnail */}
                <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image
                    src={`https://img.youtube.com/vi/${video.youtubeVideoId}/mqdefault.jpg`}
                    alt={video.title}
                    fill
                    sizes="144px"
                    className="object-cover"
                    unoptimized
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="truncate font-medium">{video.title}</h3>
                    <StatusBadge status={video.status} />
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Product:{" "}
                      <Link
                        href={`/products/${video.product.article_number}`}
                        className="cursor-pointer font-medium hover:underline"
                      >
                        {video.product.product_name ??
                          video.product.article_number}
                      </Link>
                    </span>
                    <span>
                      Creator:{" "}
                      <a
                        href={video.creator.youtubeChannelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer font-medium hover:underline"
                      >
                        {video.creator.channelName}
                      </a>
                    </span>
                    <span>
                      {video.createdAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {video.description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {video.description}
                    </p>
                  )}

                  {/* Language tag */}
                  {video.language !== "en" && (
                    <span className="mt-1 inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {video.language.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Review notes */}
              {video.reviewNotes && (
                <div className="rounded bg-muted/50 p-2 text-xs">
                  <span className="font-medium">Review notes:</span>{" "}
                  {video.reviewNotes}
                </div>
              )}

              {/* Actions */}
              <VideoActions videoId={video.id} status={video.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
