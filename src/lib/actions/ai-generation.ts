"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateGuideForProduct,
  type GenerateGuideOptions,
} from "@/lib/ai/generate-guide";
import type { GeneratedGuide } from "@/lib/ai/types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as unknown as { role: string }).role;
  if (role !== "admin") throw new Error("Not authorized");
  return session.user;
}

export interface GenerationResult {
  success: boolean;
  guide?: GeneratedGuide;
  error?: string;
  jobId?: string;
}

/**
 * Server action: Generate an AI guide for a single product.
 * Requires admin authentication.
 *
 * Takes a product ID, finds its assembly PDF, runs the AI vision pipeline,
 * and returns structured guide data. Creates an AIGenerationJob to track progress.
 */
export async function generateGuideAction(
  productId: number
): Promise<GenerationResult> {
  await requireAdmin();

  // Validate product exists and has an assembly PDF
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      documents: {
        where: { document_type: "assembly" },
        take: 1,
      },
      assemblyGuide: { select: { id: true, published: true } },
    },
  });

  if (!product) {
    return { success: false, error: "Product not found" };
  }

  if (product.documents.length === 0) {
    return {
      success: false,
      error: "No assembly PDF found for this product",
    };
  }

  // Check if there's already a guide being generated
  const activeJob = await prisma.aIGenerationJob.findFirst({
    where: {
      productId,
      status: { in: ["queued", "processing"] },
    },
  });

  if (activeJob) {
    return {
      success: false,
      error: "A generation job is already in progress for this product",
      jobId: activeJob.id,
    };
  }

  try {
    const guide = await generateGuideForProduct(productId);

    // Find the job that was created
    const job = await prisma.aIGenerationJob.findFirst({
      where: { productId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      guide,
      jobId: job?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Server action: Get the status of an AI generation job.
 */
export async function getGenerationJobStatus(jobId: string) {
  await requireAdmin();

  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: jobId },
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
    return { success: false, error: "Job not found" };
  }

  return {
    success: true,
    job: {
      id: job.id,
      productId: job.productId,
      productName: job.product.product_name,
      articleNumber: job.product.article_number,
      status: job.status,
      confidenceScore: job.confidenceScore,
      qualityFlags: job.qualityFlags,
      modelPrimary: job.modelPrimary,
      modelSecondary: job.modelSecondary,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    },
  };
}

/**
 * Server action: List recent AI generation jobs.
 */
export async function listGenerationJobs(options?: {
  status?: string;
  limit?: number;
}) {
  await requireAdmin();

  const jobs = await prisma.aIGenerationJob.findMany({
    where: options?.status
      ? { status: options.status as "queued" | "processing" | "review" | "approved" | "failed" }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 20,
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

  return jobs.map((job) => ({
    id: job.id,
    productId: job.productId,
    productName: job.product.product_name,
    articleNumber: job.product.article_number,
    status: job.status,
    confidenceScore: job.confidenceScore,
    priority: job.priority,
    triggeredBy: job.triggeredBy,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  }));
}
