import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateGuideForProduct } from "@/lib/ai/generate-guide";
import { getRateLimiter } from "@/lib/ai/rate-limiter";
import { autoPublishOrRoute } from "@/lib/auto-publish";
import { auth } from "@/lib/auth";

/**
 * GET /api/cron/process-queue — Vercel Cron job that processes queued AI generation jobs.
 *
 * Runs every 5 minutes. Each invocation processes up to MAX_JOBS_PER_RUN jobs,
 * respecting rate limits and concurrency constraints.
 *
 * Secured by admin session (for Studio dashboard) or CRON_SECRET Bearer token (for Vercel Cron).
 */

const MAX_JOBS_PER_RUN = 3;
const MAX_CONCURRENT = 2;

export async function GET(request: Request) {
  const session = await auth();
  const isAdmin = (session?.user as unknown as { role: string })?.role === "admin";
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isAdmin && !hasCronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Array<{
    jobId: string;
    productId: number;
    status: "completed" | "failed";
    decision?: string;
    error?: string;
  }> = [];

  const rateLimiter = getRateLimiter("gemini");

  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    // Check concurrency limit
    const processingCount = await prisma.aIGenerationJob.count({
      where: { status: "processing" },
    });

    if (processingCount >= MAX_CONCURRENT) {
      break;
    }

    // Check rate limit — each guide generation uses multiple API calls (~10-20)
    // Wait if necessary but don't block indefinitely
    if (!rateLimiter.canProceed()) {
      const waitMs = rateLimiter.waitTime();
      if (waitMs > 30_000) {
        // Don't wait more than 30s in a cron job
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    // Claim next job
    const nextJob = await prisma.aIGenerationJob.findFirst({
      where: { status: "queued" },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    if (!nextJob) {
      break; // No more jobs
    }

    let claimed;
    try {
      claimed = await prisma.aIGenerationJob.update({
        where: { id: nextJob.id, status: "queued" },
        data: { status: "processing" },
        select: {
          id: true,
          productId: true,
          inputPdfUrl: true,
        },
      });
    } catch {
      continue; // Race condition — another worker claimed it
    }

    await prisma.product.update({
      where: { id: claimed.productId },
      data: { guide_status: "generating" },
    });

    // Process the job
    try {
      const guide = await generateGuideForProduct(claimed.productId, {
        skipJobRecord: true,
        pdfUrlOverride: claimed.inputPdfUrl || undefined,
      });

      // Store raw output on the job first (needed by autoPublishOrRoute)
      await prisma.aIGenerationJob.update({
        where: { id: claimed.id },
        data: {
          rawOutput: JSON.parse(JSON.stringify(guide)),
          confidenceScore: guide.overallConfidence,
          qualityFlags: JSON.parse(JSON.stringify(guide.qualityFlags)),
          modelPrimary: guide.metadata.primaryModel,
          modelSecondary: guide.metadata.secondaryModel || null,
        },
      });

      // Auto-publish or route to review based on quality gate
      const { decision } = await autoPublishOrRoute(claimed.id, guide);

      results.push({
        jobId: claimed.id,
        productId: claimed.productId,
        status: "completed",
        decision,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      await prisma.$transaction([
        prisma.aIGenerationJob.update({
          where: { id: claimed.id },
          data: {
            status: "failed",
            reviewNotes: errorMsg,
            completedAt: new Date(),
          },
        }),
        prisma.product.update({
          where: { id: claimed.productId },
          data: { guide_status: "none" },
        }),
      ]);

      results.push({
        jobId: claimed.id,
        productId: claimed.productId,
        status: "failed",
        error: errorMsg,
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    completed: results.filter((r) => r.status === "completed").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}
