"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { JobStatus, JobPriority, JobTrigger } from "@prisma/client";

// ─── Auth ───

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as unknown as { role: string }).role;
  if (role !== "admin") throw new Error("Not authorized");
  return session.user;
}

// ─── Validation Schemas ───

const enqueueSchema = z.object({
  productId: z.number().int().positive(),
  priority: z.enum(["high", "normal", "low"]).optional(),
  triggeredBy: z.enum(["manual", "auto_sync", "batch"]).optional(),
});

const batchEnqueueSchema = z.object({
  productIds: z.array(z.number().int().positive()).min(1).max(500),
  priority: z.enum(["high", "normal", "low"]).optional(),
  triggeredBy: z.enum(["manual", "auto_sync", "batch"]).optional(),
});

const jobIdSchema = z.string().min(1).max(100);

const listQueueSchema = z.object({
  status: z.enum(["queued", "processing", "review", "approved", "failed"]).optional(),
  priority: z.enum(["high", "normal", "low"]).optional(),
  triggeredBy: z.enum(["manual", "auto_sync", "batch"]).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["createdAt", "priority", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

// ─── Valid Status Transitions ───

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  queued: ["processing", "failed"],
  processing: ["review", "failed"],
  review: ["approved", "failed"],
  approved: [],
  failed: ["queued"], // allow re-queue of failed jobs
};

// ─── Enqueue Actions ───

/**
 * Enqueue a single product for AI guide generation.
 * Creates an AIGenerationJob in "queued" status without running generation.
 * Also updates the product's guide_status to "queued".
 */
export async function enqueueJob(data: z.infer<typeof enqueueSchema>) {
  await requireAdmin();

  let parsed;
  try {
    parsed = enqueueSchema.parse(data);
  } catch {
    return { success: false as const, error: "Invalid input" };
  }

  // Check product exists and has assembly PDF
  const product = await prisma.product.findUnique({
    where: { id: parsed.productId },
    select: {
      id: true,
      article_number: true,
      product_name: true,
      guide_status: true,
      documents: {
        where: { document_type: "assembly" },
        select: { source_url: true },
        take: 1,
      },
    },
  });

  if (!product) {
    return { success: false as const, error: "Product not found" };
  }

  if (product.documents.length === 0) {
    return { success: false as const, error: "No assembly PDF found for this product" };
  }

  // Check for existing active job
  const activeJob = await prisma.aIGenerationJob.findFirst({
    where: {
      productId: parsed.productId,
      status: { in: ["queued", "processing"] },
    },
    select: { id: true },
  });

  if (activeJob) {
    return {
      success: false as const,
      error: "A job is already active for this product",
      jobId: activeJob.id,
    };
  }

  const job = await prisma.aIGenerationJob.create({
    data: {
      productId: parsed.productId,
      status: "queued",
      priority: parsed.priority || "normal",
      triggeredBy: parsed.triggeredBy || "manual",
      inputPdfUrl: product.documents[0].source_url,
    },
  });

  // Update product guide_status
  await prisma.product.update({
    where: { id: parsed.productId },
    data: { guide_status: "queued" },
  });

  revalidatePath("/studio/ai-generate");
  return { success: true as const, jobId: job.id };
}

/**
 * Batch enqueue multiple products for AI guide generation.
 * Skips products that already have active jobs or no assembly PDF.
 * Returns results per product.
 */
export async function batchEnqueueJobs(data: z.infer<typeof batchEnqueueSchema>) {
  await requireAdmin();

  let parsed;
  try {
    parsed = batchEnqueueSchema.parse(data);
  } catch {
    return { success: false as const, error: "Invalid input" };
  }

  // Find all products with their assembly docs
  const products = await prisma.product.findMany({
    where: { id: { in: parsed.productIds } },
    select: {
      id: true,
      article_number: true,
      documents: {
        where: { document_type: "assembly" },
        select: { source_url: true },
        take: 1,
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Find products that already have active jobs
  const activeJobs = await prisma.aIGenerationJob.findMany({
    where: {
      productId: { in: parsed.productIds },
      status: { in: ["queued", "processing"] },
    },
    select: { productId: true },
  });

  const activeProductIds = new Set(activeJobs.map((j) => j.productId));

  const results: Array<{
    productId: number;
    status: "queued" | "skipped";
    reason?: string;
    jobId?: string;
  }> = [];

  const jobsToCreate: Array<{
    productId: number;
    status: JobStatus;
    priority: JobPriority;
    triggeredBy: JobTrigger;
    inputPdfUrl: string;
  }> = [];

  const productIdsToUpdate: number[] = [];

  for (const productId of parsed.productIds) {
    const product = productMap.get(productId);

    if (!product) {
      results.push({ productId, status: "skipped", reason: "Product not found" });
      continue;
    }

    if (product.documents.length === 0) {
      results.push({ productId, status: "skipped", reason: "No assembly PDF" });
      continue;
    }

    if (activeProductIds.has(productId)) {
      results.push({ productId, status: "skipped", reason: "Job already active" });
      continue;
    }

    jobsToCreate.push({
      productId,
      status: "queued",
      priority: parsed.priority || "normal",
      triggeredBy: parsed.triggeredBy || "batch",
      inputPdfUrl: product.documents[0].source_url,
    });

    productIdsToUpdate.push(productId);
    results.push({ productId, status: "queued" });
  }

  // Batch create in a transaction
  if (jobsToCreate.length > 0) {
    await prisma.$transaction([
      prisma.aIGenerationJob.createMany({ data: jobsToCreate }),
      prisma.product.updateMany({
        where: { id: { in: productIdsToUpdate } },
        data: { guide_status: "queued" },
      }),
    ]);
  }

  revalidatePath("/studio/ai-generate");

  return {
    success: true as const,
    total: parsed.productIds.length,
    queued: jobsToCreate.length,
    skipped: parsed.productIds.length - jobsToCreate.length,
    results,
  };
}

// ─── Queue Management ───

/**
 * Get the next job to process from the queue.
 * Returns the highest-priority queued job (high > normal > low),
 * with oldest job first within same priority.
 */
export async function getNextQueuedJob() {
  await requireAdmin();

  const job = await prisma.aIGenerationJob.findFirst({
    where: { status: "queued" },
    orderBy: [
      { priority: "asc" }, // Prisma enum ordering: high=0, normal=1, low=2
      { createdAt: "asc" },
    ],
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

  if (!job) {
    return { success: true as const, job: null };
  }

  return {
    success: true as const,
    job: {
      id: job.id,
      productId: job.productId,
      productName: job.product.product_name,
      articleNumber: job.product.article_number,
      priority: job.priority,
      triggeredBy: job.triggeredBy,
      inputPdfUrl: job.inputPdfUrl,
      createdAt: job.createdAt,
    },
  };
}

/**
 * Transition a job's status. Validates the transition is allowed.
 */
export async function transitionJobStatus(
  jobId: string,
  newStatus: JobStatus,
  metadata?: {
    confidenceScore?: number;
    rawOutput?: unknown;
    qualityFlags?: unknown;
    modelPrimary?: string;
    modelSecondary?: string;
    reviewNotes?: string;
    reviewedBy?: string;
  }
) {
  await requireAdmin();
  const validId = jobIdSchema.parse(jobId);

  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: validId },
    select: { id: true, status: true, productId: true },
  });

  if (!job) return { success: false as const, error: "Job not found" };

  const allowed = VALID_TRANSITIONS[job.status];
  if (!allowed.includes(newStatus)) {
    return {
      success: false as const,
      error: `Cannot transition from "${job.status}" to "${newStatus}"`,
    };
  }

  const updateData: Record<string, unknown> = { status: newStatus };

  if (metadata?.confidenceScore != null) updateData.confidenceScore = metadata.confidenceScore;
  if (metadata?.rawOutput != null) updateData.rawOutput = JSON.parse(JSON.stringify(metadata.rawOutput));
  if (metadata?.qualityFlags != null) updateData.qualityFlags = JSON.parse(JSON.stringify(metadata.qualityFlags));
  if (metadata?.modelPrimary) updateData.modelPrimary = metadata.modelPrimary;
  if (metadata?.modelSecondary) updateData.modelSecondary = metadata.modelSecondary;
  if (metadata?.reviewNotes) updateData.reviewNotes = metadata.reviewNotes;
  if (metadata?.reviewedBy) updateData.reviewedBy = metadata.reviewedBy;

  // Set completedAt for terminal states
  if (newStatus === "approved" || newStatus === "failed") {
    updateData.completedAt = new Date();
  }

  await prisma.aIGenerationJob.update({
    where: { id: validId },
    data: updateData,
  });

  // Update product guide_status to match
  const guideStatusMap: Partial<Record<JobStatus, string>> = {
    queued: "queued",
    processing: "generating",
    review: "in_review",
    approved: "published",
  };

  const newGuideStatus = guideStatusMap[newStatus];
  if (newGuideStatus) {
    await prisma.product.update({
      where: { id: job.productId },
      data: { guide_status: newGuideStatus },
    });
  }

  // For failed -> re-queue, reset product status
  if (job.status === "failed" && newStatus === "queued") {
    await prisma.product.update({
      where: { id: job.productId },
      data: { guide_status: "queued" },
    });
  }

  revalidatePath("/studio/ai-generate");
  revalidatePath(`/studio/ai-generate/${validId}`);

  return { success: true as const };
}

/**
 * Cancel a queued or processing job. Sets status to failed.
 */
export async function cancelJob(jobId: string) {
  await requireAdmin();
  const validId = jobIdSchema.parse(jobId);

  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: validId },
    select: { id: true, status: true, productId: true },
  });

  if (!job) return { success: false as const, error: "Job not found" };

  if (job.status !== "queued" && job.status !== "processing") {
    return { success: false as const, error: `Cannot cancel job with status "${job.status}"` };
  }

  await prisma.$transaction([
    prisma.aIGenerationJob.update({
      where: { id: validId },
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

  revalidatePath("/studio/ai-generate");
  return { success: true as const };
}

/**
 * Re-queue a failed job for another attempt.
 */
export async function requeueJob(jobId: string) {
  await requireAdmin();
  const validId = jobIdSchema.parse(jobId);

  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: validId },
    select: { id: true, status: true, productId: true, inputPdfUrl: true, priority: true },
  });

  if (!job) return { success: false as const, error: "Job not found" };
  if (job.status !== "failed") {
    return { success: false as const, error: "Only failed jobs can be re-queued" };
  }

  await prisma.$transaction([
    prisma.aIGenerationJob.update({
      where: { id: validId },
      data: {
        status: "queued",
        reviewNotes: null,
        completedAt: null,
        rawOutput: Prisma.DbNull,
        confidenceScore: null,
        qualityFlags: Prisma.DbNull,
      },
    }),
    prisma.product.update({
      where: { id: job.productId },
      data: { guide_status: "queued" },
    }),
  ]);

  revalidatePath("/studio/ai-generate");
  return { success: true as const };
}

// ─── Queue Statistics ───

export interface QueueStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byTrigger: Record<string, number>;
  avgConfidence: number | null;
  completedToday: number;
  failedToday: number;
  queueDepth: number;
  processing: number;
  inReview: number;
}

/**
 * Get comprehensive queue statistics.
 */
export async function getQueueStats(): Promise<QueueStats> {
  await requireAdmin();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    total,
    statusCounts,
    priorityCounts,
    triggerCounts,
    avgConfidence,
    completedToday,
    failedToday,
  ] = await Promise.all([
    prisma.aIGenerationJob.count(),

    prisma.aIGenerationJob.groupBy({
      by: ["status"],
      _count: { status: true },
    }),

    prisma.aIGenerationJob.groupBy({
      by: ["priority"],
      _count: { priority: true },
    }),

    prisma.aIGenerationJob.groupBy({
      by: ["triggeredBy"],
      _count: { triggeredBy: true },
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
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    byStatus[row.status] = row._count.status;
  }

  const byPriority: Record<string, number> = {};
  for (const row of priorityCounts) {
    byPriority[row.priority] = row._count.priority;
  }

  const byTrigger: Record<string, number> = {};
  for (const row of triggerCounts) {
    byTrigger[row.triggeredBy] = row._count.triggeredBy;
  }

  return {
    total,
    byStatus,
    byPriority,
    byTrigger,
    avgConfidence: avgConfidence._avg.confidenceScore,
    completedToday,
    failedToday,
    queueDepth: byStatus.queued || 0,
    processing: byStatus.processing || 0,
    inReview: byStatus.review || 0,
  };
}

// ─── Queue Listing with Filters ───

/**
 * List jobs with comprehensive filtering, pagination, and sorting.
 */
export async function listQueueJobs(options?: z.infer<typeof listQueueSchema>) {
  await requireAdmin();

  let parsed;
  try {
    parsed = listQueueSchema.parse(options || {});
  } catch {
    return { success: false as const, error: "Invalid filters" };
  }

  const page = parsed.page || 1;
  const pageSize = parsed.pageSize || 20;

  const where: Record<string, unknown> = {};
  if (parsed.status) where.status = parsed.status;
  if (parsed.priority) where.priority = parsed.priority;
  if (parsed.triggeredBy) where.triggeredBy = parsed.triggeredBy;

  // Priority ordering: high first when sorting by priority
  const orderBy =
    parsed.sortBy === "priority"
      ? [{ priority: parsed.sortOrder || "asc" as const }, { createdAt: "asc" as const }]
      : [{ [parsed.sortBy || "createdAt"]: parsed.sortOrder || "desc" }];

  const [jobs, total] = await Promise.all([
    prisma.aIGenerationJob.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
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
  ]);

  return {
    success: true as const,
    jobs: jobs.map((job) => ({
      id: job.id,
      productId: job.productId,
      productName: job.product.product_name,
      articleNumber: job.product.article_number,
      status: job.status,
      priority: job.priority,
      triggeredBy: job.triggeredBy,
      confidenceScore: job.confidenceScore,
      modelPrimary: job.modelPrimary,
      reviewNotes: job.reviewNotes,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
