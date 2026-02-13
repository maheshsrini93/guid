import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateGuideForProduct } from "@/lib/ai/generate-guide";
import { auth } from "@/lib/auth";

/**
 * POST /api/queue/process — Process the next queued AI generation job.
 *
 * Secured by admin session (for Studio dashboard) or CRON_SECRET Bearer token (for Vercel Cron).
 * Each invocation processes at most one job.
 */
export async function POST(request: Request) {
  const session = await auth();
  const isAdmin = (session?.user as unknown as { role: string })?.role === "admin";
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isAdmin && !hasCronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Concurrency check — max 2 concurrent jobs
  const processingCount = await prisma.aIGenerationJob.count({
    where: { status: "processing" },
  });

  if (processingCount >= 2) {
    return NextResponse.json({
      processed: false,
      status: "at_capacity",
      processing: processingCount,
    });
  }

  // Claim next queued job (priority order, then oldest)
  const nextJob = await prisma.aIGenerationJob.findFirst({
    where: { status: "queued" },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (!nextJob) {
    return NextResponse.json({
      processed: false,
      status: "no_jobs",
    });
  }

  // Atomically claim the job
  let claimed;
  try {
    claimed = await prisma.aIGenerationJob.update({
      where: { id: nextJob.id, status: "queued" },
      data: { status: "processing" },
      include: {
        product: {
          select: {
            id: true,
            product_name: true,
            article_number: true,
          },
        },
      },
    });
  } catch {
    return NextResponse.json({
      processed: false,
      status: "claim_failed",
    });
  }

  await prisma.product.update({
    where: { id: claimed.productId },
    data: { guide_status: "generating" },
  });

  // Run the generation pipeline
  try {
    const guide = await generateGuideForProduct(claimed.productId, {
      skipJobRecord: true,
      pdfUrlOverride: claimed.inputPdfUrl || undefined,
    });

    // Mark complete -> review
    await prisma.aIGenerationJob.update({
      where: { id: claimed.id },
      data: {
        status: "review",
        rawOutput: JSON.parse(JSON.stringify(guide)),
        confidenceScore: guide.overallConfidence,
        qualityFlags: JSON.parse(JSON.stringify(guide.qualityFlags)),
        modelPrimary: guide.metadata.primaryModel,
        modelSecondary: guide.metadata.secondaryModel || null,
        completedAt: new Date(),
      },
    });

    await prisma.product.update({
      where: { id: claimed.productId },
      data: { guide_status: "in_review" },
    });

    return NextResponse.json({
      processed: true,
      status: "completed",
      jobId: claimed.id,
      productId: claimed.productId,
      productName: claimed.product.product_name,
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

    return NextResponse.json({
      processed: true,
      status: "failed",
      jobId: claimed.id,
      error: errorMsg,
    });
  }
}

/**
 * GET /api/queue/process — Get queue stats (for polling from dashboard).
 */
export async function GET(request: Request) {
  const session = await auth();
  const isAdmin = (session?.user as unknown as { role: string })?.role === "admin";
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isAdmin && !hasCronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusCounts = await prisma.aIGenerationJob.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  const counts: Record<string, number> = {};
  for (const row of statusCounts) {
    counts[row.status] = row._count.id;
  }

  return NextResponse.json({
    queued: counts["queued"] || 0,
    processing: counts["processing"] || 0,
    review: counts["review"] || 0,
    approved: counts["approved"] || 0,
    failed: counts["failed"] || 0,
  });
}
