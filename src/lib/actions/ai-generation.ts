"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  generateGuideForProduct,
  type GenerateGuideOptions,
} from "@/lib/ai/generate-guide";
import type { GeneratedGuide, GeneratedStep } from "@/lib/ai/types";

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

const productIdSchema = z.number().int().positive();
const jobIdSchema = z.string().min(1).max(100);
const listOptionsSchema = z.object({
  status: z.enum(["queued", "processing", "review", "approved", "failed"]).optional(),
  limit: z.number().int().min(1).max(100).optional(),
}).optional();

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
  const validId = productIdSchema.parse(productId);

  // Validate product exists and has an assembly PDF
  const product = await prisma.product.findUnique({
    where: { id: validId },
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
      productId: validId,
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
    const guide = await generateGuideForProduct(validId);

    // Find the job that was created
    const job = await prisma.aIGenerationJob.findFirst({
      where: { productId: validId },
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
  const validId = jobIdSchema.parse(jobId);

  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: validId },
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
  const parsed = listOptionsSchema.parse(options);

  const jobs = await prisma.aIGenerationJob.findMany({
    where: parsed?.status ? { status: parsed.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: parsed?.limit ?? 20,
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

/**
 * Server action: Approve a reviewed AI generation job.
 * Creates an AssemblyGuide + AssemblySteps from the rawOutput, marks job as approved,
 * and updates the product's guide_status to "published".
 */
export async function approveGenerationJob(jobId: string) {
  const user = await requireAdmin();
  const validId = jobIdSchema.parse(jobId);

  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: validId },
    include: {
      product: { select: { id: true, article_number: true, assemblyGuide: { select: { id: true } } } },
    },
  });

  if (!job) return { success: false, error: "Job not found" };
  if (job.status !== "review") {
    return { success: false, error: `Cannot approve job with status "${job.status}"` };
  }

  const guide = job.rawOutput as unknown as GeneratedGuide;
  if (!guide || !guide.steps) {
    return { success: false, error: "Job has no guide data" };
  }

  // Build tool string from guide data
  const toolsList = guide.tools?.required?.map((t) => t.toolName).join(", ") || null;

  // Create or update the AssemblyGuide
  const existingGuide = job.product.assemblyGuide;

  if (existingGuide) {
    // Delete existing steps and update guide
    await prisma.assemblyStep.deleteMany({ where: { guideId: existingGuide.id } });
    await prisma.assemblyGuide.update({
      where: { id: existingGuide.id },
      data: {
        title: guide.title,
        description: guide.description,
        difficulty: guide.difficulty,
        timeMinutes: guide.estimatedTimeMinutes,
        tools: toolsList,
        published: true,
        steps: {
          create: guide.steps.map((step) => ({
            stepNumber: step.stepNumber,
            title: step.title,
            instruction: step.instruction,
            tip: step.callouts?.find((c) => c.type === "tip")?.text || null,
            imageUrl: step.illustrationUrl || null,
          })),
        },
      },
    });
  } else {
    await prisma.assemblyGuide.create({
      data: {
        productId: job.productId,
        title: guide.title,
        description: guide.description,
        difficulty: guide.difficulty,
        timeMinutes: guide.estimatedTimeMinutes,
        tools: toolsList,
        published: true,
        steps: {
          create: guide.steps.map((step) => ({
            stepNumber: step.stepNumber,
            title: step.title,
            instruction: step.instruction,
            tip: step.callouts?.find((c) => c.type === "tip")?.text || null,
            imageUrl: step.illustrationUrl || null,
          })),
        },
      },
    });
  }

  // Update job status and product guide_status
  await prisma.aIGenerationJob.update({
    where: { id: validId },
    data: {
      status: "approved",
      reviewedBy: (user as unknown as { id: string }).id,
      completedAt: new Date(),
    },
  });

  await prisma.product.update({
    where: { id: job.productId },
    data: { guide_status: "published" },
  });

  revalidatePath(`/studio/ai-generate/${validId}`);
  revalidatePath("/studio/ai-generate");
  revalidatePath(`/products/${job.product.article_number}`);

  return { success: true };
}

/**
 * Server action: Reject a reviewed AI generation job.
 */
export async function rejectGenerationJob(
  jobId: string,
  notes: string
) {
  const user = await requireAdmin();
  const validId = jobIdSchema.parse(jobId);
  const validNotes = z.string().max(5000).parse(notes);

  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: validId },
  });

  if (!job) return { success: false, error: "Job not found" };
  if (job.status !== "review") {
    return { success: false, error: `Cannot reject job with status "${job.status}"` };
  }

  await prisma.aIGenerationJob.update({
    where: { id: validId },
    data: {
      status: "failed",
      reviewedBy: (user as unknown as { id: string }).id,
      reviewNotes: validNotes,
      completedAt: new Date(),
    },
  });

  // Reset product guide_status
  await prisma.product.update({
    where: { id: job.productId },
    data: { guide_status: "none" },
  });

  revalidatePath(`/studio/ai-generate/${validId}`);
  revalidatePath("/studio/ai-generate");

  return { success: true };
}

/**
 * Server action: Update a step's instruction text in the rawOutput JSON.
 * Used for inline editing during review.
 */
export async function updateJobStep(
  jobId: string,
  stepNumber: number,
  updates: { title?: string; instruction?: string }
) {
  await requireAdmin();
  const validId = jobIdSchema.parse(jobId);

  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: validId },
  });

  if (!job) return { success: false, error: "Job not found" };
  if (job.status !== "review") {
    return { success: false, error: "Can only edit steps on jobs in review" };
  }

  const guide = job.rawOutput as unknown as GeneratedGuide;
  if (!guide?.steps) return { success: false, error: "No guide data" };

  const stepIndex = guide.steps.findIndex(
    (s) => s.stepNumber === stepNumber
  );
  if (stepIndex === -1) {
    return { success: false, error: `Step ${stepNumber} not found` };
  }

  if (updates.title) guide.steps[stepIndex].title = updates.title;
  if (updates.instruction) guide.steps[stepIndex].instruction = updates.instruction;

  await prisma.aIGenerationJob.update({
    where: { id: validId },
    data: {
      rawOutput: JSON.parse(JSON.stringify(guide)),
    },
  });

  revalidatePath(`/studio/ai-generate/${validId}`);

  return { success: true };
}
