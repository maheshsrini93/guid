import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { GeneratedGuide, QualityFlag } from "@/lib/ai/types";
import { JobReviewActions } from "./review-actions";
import { StepReviewCard } from "./step-review-card";

interface ReviewPageProps {
  params: Promise<{ jobId: string }>;
}

export default async function AIGenerateReviewPage({
  params,
}: ReviewPageProps) {
  const { jobId } = await params;

  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: jobId },
    include: {
      product: {
        select: {
          id: true,
          product_name: true,
          article_number: true,
          documents: {
            where: { document_type: "assembly" },
            select: { source_url: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!job) return notFound();

  const guide = job.rawOutput as unknown as GeneratedGuide | null;
  const qualityFlags = (job.qualityFlags as unknown as QualityFlag[]) || [];
  const pdfUrl = job.product.documents[0]?.source_url || job.inputPdfUrl;

  const isReviewable = job.status === "review";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/studio/ai-generate"
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to jobs
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {job.product.product_name || "Unknown Product"}
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">
                {job.product.article_number}
              </span>
              {" "}&middot; Job {job.id.slice(0, 8)}...
            </p>
          </div>
          <Badge
            variant={
              job.status === "review"
                ? "default"
                : job.status === "approved"
                  ? "secondary"
                  : job.status === "failed"
                    ? "destructive"
                    : "outline"
            }
          >
            {job.status === "review"
              ? "Needs Review"
              : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </Badge>
        </div>
      </div>

      {/* Stats overview */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Confidence</p>
          <p
            className={`mt-1 text-2xl font-bold font-mono ${
              (job.confidenceScore ?? 0) >= 0.9
                ? "text-green-600"
                : (job.confidenceScore ?? 0) >= 0.7
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {job.confidenceScore != null
              ? `${(job.confidenceScore * 100).toFixed(0)}%`
              : "-"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Steps</p>
          <p className="mt-1 text-2xl font-bold">
            {guide?.steps?.length ?? 0}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Model</p>
          <p className="mt-1 text-sm font-medium truncate">
            {job.modelPrimary || "-"}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Quality Flags</p>
          <p className="mt-1 text-2xl font-bold">
            {qualityFlags.length}
          </p>
        </div>
      </div>

      {/* Quality flags */}
      {qualityFlags.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold mb-2">Quality Flags</h2>
          <div className="space-y-1">
            {qualityFlags.map((flag, i) => (
              <div
                key={i}
                className={`text-sm rounded-md px-3 py-2 ${
                  flag.severity === "error"
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : flag.severity === "warning"
                      ? "bg-amber-50 text-amber-800 border border-amber-200"
                      : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                <span className="font-mono text-xs mr-2">[{flag.code}]</span>
                {flag.message}
                {flag.stepNumber != null && (
                  <span className="ml-1 text-xs">(Step {flag.stepNumber})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guide metadata */}
      {guide && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="font-semibold">{guide.title}</h2>
          {guide.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {guide.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">
              {guide.difficulty}
            </Badge>
            {guide.estimatedTimeMinutes && (
              <Badge variant="secondary">
                ~{guide.estimatedTimeMinutes} min
              </Badge>
            )}
            {guide.tools?.required?.map((t) => (
              <Badge key={t.toolName} variant="secondary">
                {t.toolName}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Separator className="my-6" />

      {/* Side-by-side: PDF vs Guide steps */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: PDF viewer */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Original PDF</h2>
          {pdfUrl ? (
            <div className="rounded-lg border overflow-hidden bg-muted/30">
              <iframe
                src={`/api/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`}
                className="w-full h-[600px]"
                title="Assembly PDF"
              />
              <div className="p-2 border-t">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Open PDF in new tab
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              No assembly PDF available
            </div>
          )}
        </div>

        {/* Right: Generated guide steps */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Generated Guide</h2>
          {guide?.steps && guide.steps.length > 0 ? (
            <div className="space-y-3">
              {guide.steps.map((step) => (
                <StepReviewCard
                  key={step.stepNumber}
                  jobId={jobId}
                  step={step}
                  isEditable={isReviewable}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
              No steps generated
            </div>
          )}
        </div>
      </div>

      {/* Review notes (for rejected jobs) */}
      {job.reviewNotes && (
        <>
          <Separator className="my-6" />
          <div className="rounded-lg border p-4 bg-red-50">
            <h2 className="text-sm font-semibold text-red-800 mb-1">
              Review Notes
            </h2>
            <p className="text-sm text-red-700 whitespace-pre-line">
              {job.reviewNotes}
            </p>
          </div>
        </>
      )}

      {/* Approve / Reject actions */}
      {isReviewable && (
        <>
          <Separator className="my-6" />
          <JobReviewActions jobId={jobId} />
        </>
      )}
    </div>
  );
}
