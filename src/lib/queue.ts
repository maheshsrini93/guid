import { prisma } from "@/lib/prisma";
import type { JobPriority, JobTrigger } from "@prisma/client";

// ─── Queue Operations (shared core, importable by server actions and API routes) ───

interface EnqueueOptions {
  priority?: JobPriority;
  triggeredBy?: JobTrigger;
}

/**
 * Enqueue a single product for AI generation.
 * Returns { success, jobId?, error? }.
 */
export async function enqueueJob(
  productId: number,
  options?: EnqueueOptions
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      documents: {
        where: { document_type: "assembly" },
        select: { source_url: true },
        take: 1,
      },
    },
  });

  if (!product) return { success: false as const, error: "Product not found" };
  if (product.documents.length === 0) {
    return { success: false as const, error: "No assembly PDF" };
  }

  const activeJob = await prisma.aIGenerationJob.findFirst({
    where: { productId, status: { in: ["queued", "processing"] } },
    select: { id: true },
  });

  if (activeJob) {
    return { success: false as const, error: "Job already active", jobId: activeJob.id };
  }

  const job = await prisma.aIGenerationJob.create({
    data: {
      productId,
      status: "queued",
      priority: options?.priority || "normal",
      triggeredBy: options?.triggeredBy || "manual",
      inputPdfUrl: product.documents[0].source_url,
    },
  });

  await prisma.product.update({
    where: { id: productId },
    data: { guide_status: "queued" },
  });

  return { success: true as const, jobId: job.id };
}

/**
 * Enqueue multiple products at once.
 */
export async function enqueueBatch(
  productIds: number[],
  options?: EnqueueOptions
) {
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      documents: {
        where: { document_type: "assembly" },
        select: { source_url: true },
        take: 1,
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  const activeJobs = await prisma.aIGenerationJob.findMany({
    where: {
      productId: { in: productIds },
      status: { in: ["queued", "processing"] },
    },
    select: { productId: true },
  });

  const activeSet = new Set(activeJobs.map((j) => j.productId));

  const jobsToCreate: Array<{
    productId: number;
    status: "queued";
    priority: JobPriority;
    triggeredBy: JobTrigger;
    inputPdfUrl: string;
  }> = [];
  const idsToUpdate: number[] = [];
  let skipped = 0;

  for (const pid of productIds) {
    const product = productMap.get(pid);
    if (!product || product.documents.length === 0 || activeSet.has(pid)) {
      skipped++;
      continue;
    }
    jobsToCreate.push({
      productId: pid,
      status: "queued",
      priority: options?.priority || "normal",
      triggeredBy: options?.triggeredBy || "batch",
      inputPdfUrl: product.documents[0].source_url,
    });
    idsToUpdate.push(pid);
  }

  if (jobsToCreate.length > 0) {
    await prisma.$transaction([
      prisma.aIGenerationJob.createMany({ data: jobsToCreate }),
      prisma.product.updateMany({
        where: { id: { in: idsToUpdate } },
        data: { guide_status: "queued" },
      }),
    ]);
  }

  return {
    success: true as const,
    queued: jobsToCreate.length,
    skipped,
    total: productIds.length,
  };
}

/**
 * Cancel a queued job.
 */
export async function cancelJob(jobId: string) {
  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, productId: true },
  });

  if (!job) return { success: false as const, error: "Job not found" };
  if (job.status !== "queued") {
    return { success: false as const, error: "Can only cancel queued jobs" };
  }

  await prisma.$transaction([
    prisma.aIGenerationJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        reviewNotes: "Cancelled by admin",
        completedAt: new Date(),
      },
    }),
    prisma.product.update({
      where: { id: job.productId },
      data: { guide_status: "none" },
    }),
  ]);

  return { success: true as const };
}

/**
 * Re-queue a failed job.
 */
export async function retryJob(jobId: string) {
  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, productId: true },
  });

  if (!job) return { success: false as const, error: "Job not found" };
  if (job.status !== "failed") {
    return { success: false as const, error: "Can only retry failed jobs" };
  }

  await prisma.$transaction([
    prisma.aIGenerationJob.update({
      where: { id: jobId },
      data: {
        status: "queued",
        reviewNotes: null,
        completedAt: null,
      },
    }),
    prisma.product.update({
      where: { id: job.productId },
      data: { guide_status: "queued" },
    }),
  ]);

  return { success: true as const };
}

// ─── Queue Stats ───

/**
 * Get queue statistics for the AI generation dashboard.
 * Used by the server component (not a server action — called during page render).
 */
export async function getQueueStats() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [statusCounts, avgConfidence, completedToday, failedToday, oldestQueued] =
    await Promise.all([
      prisma.aIGenerationJob.groupBy({
        by: ["status"],
        _count: { status: true },
      }),

      prisma.aIGenerationJob.aggregate({
        where: {
          confidenceScore: { not: null },
          status: { in: ["review", "approved"] },
        },
        _avg: { confidenceScore: true },
      }),

      prisma.aIGenerationJob.count({
        where: {
          status: "approved",
          completedAt: { gte: todayStart },
        },
      }),

      prisma.aIGenerationJob.count({
        where: {
          status: "failed",
          completedAt: { gte: todayStart },
        },
      }),

      prisma.aIGenerationJob.findFirst({
        where: { status: "queued" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);

  const byStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    byStatus[row.status] = row._count.status;
  }

  return {
    queued: byStatus.queued || 0,
    processing: byStatus.processing || 0,
    review: byStatus.review || 0,
    approved: byStatus.approved || 0,
    failed: byStatus.failed || 0,
    total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    avgConfidence: avgConfidence._avg.confidenceScore,
    completedToday,
    failedToday,
    oldestQueuedAt: oldestQueued?.createdAt ?? null,
  };
}
