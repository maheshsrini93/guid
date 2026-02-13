"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Auth Helpers ───

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user as unknown as { id: string; email: string; role: string };
}

async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") throw new Error("Not authorized");
  return user;
}

// ─── Validation Schemas ───

const urlSchema = z.string().url().max(2000);

const submitGuideSchema = z.object({
  productId: z.number().int().positive(),
  textContent: z.string().min(1, "Please provide assembly instructions").max(50000),
  videoLinks: z.array(urlSchema).max(10).optional(),
  externalLinks: z.array(urlSchema).max(10).optional(),
  toolsList: z.string().max(2000).optional(),
  estimatedTime: z.number().int().positive().max(1440).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

const submissionIdSchema = z.string().min(1).max(100);

// ─── User Actions ───

export async function submitGuideSubmission(data: {
  productId: number;
  textContent: string;
  videoLinks?: string[];
  externalLinks?: string[];
  toolsList?: string;
  estimatedTime?: number;
  difficulty?: string;
}) {
  const user = await requireAuth();
  const parsed = submitGuideSchema.parse(data);

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: parsed.productId },
    select: { id: true, guide_status: true },
  });
  if (!product) throw new Error("Product not found");

  // Check for existing pending submission from this user for this product
  const existing = await prisma.guideSubmission.findFirst({
    where: {
      productId: parsed.productId,
      userId: user.id,
      status: { in: ["pending", "needs_info"] },
    },
  });
  if (existing) {
    throw new Error("You already have a pending submission for this product");
  }

  const submission = await prisma.guideSubmission.create({
    data: {
      productId: parsed.productId,
      userId: user.id,
      textContent: parsed.textContent,
      videoLinks:
        parsed.videoLinks && parsed.videoLinks.length > 0
          ? JSON.parse(JSON.stringify(parsed.videoLinks))
          : undefined,
      externalLinks:
        parsed.externalLinks && parsed.externalLinks.length > 0
          ? JSON.parse(JSON.stringify(parsed.externalLinks))
          : undefined,
      toolsList: parsed.toolsList || undefined,
      estimatedTime: parsed.estimatedTime || undefined,
      difficulty: parsed.difficulty || undefined,
    },
  });

  // Update product guide_status if it was none or no_source_material
  if (
    product.guide_status === "none" ||
    product.guide_status === "no_source_material"
  ) {
    await prisma.product.update({
      where: { id: parsed.productId },
      data: { guide_status: "submission_received" },
    });
  }

  revalidatePath(`/products`);
  revalidatePath(`/studio/submissions`);

  return { success: true, submissionId: submission.id };
}

// ─── Admin Actions ───

export async function approveSubmission(id: string) {
  const user = await requireAdmin();

  await prisma.guideSubmission.update({
    where: { id },
    data: {
      status: "approved",
      reviewedBy: user.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/studio/submissions");
}

export async function rejectSubmission(id: string, notes: string) {
  const user = await requireAdmin();

  await prisma.guideSubmission.update({
    where: { id },
    data: {
      status: "rejected",
      reviewedBy: user.id,
      reviewNotes: notes,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/studio/submissions");
}

export async function requestMoreInfo(id: string, notes: string) {
  const user = await requireAdmin();

  await prisma.guideSubmission.update({
    where: { id },
    data: {
      status: "needs_info",
      reviewedBy: user.id,
      reviewNotes: notes,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/studio/submissions");
}

export async function reApproveSubmission(id: string) {
  const user = await requireAdmin();

  await prisma.guideSubmission.update({
    where: { id },
    data: {
      status: "approved",
      reviewedBy: user.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/studio/submissions");
}

// ─── Generate from Submission ───

export async function generateFromSubmission(submissionId: string) {
  await requireAdmin();
  const validId = submissionIdSchema.parse(submissionId);

  const submission = await prisma.guideSubmission.findUnique({
    where: { id: validId },
    include: {
      product: {
        select: { id: true, guide_status: true },
      },
    },
  });
  if (!submission) throw new Error("Submission not found");
  if (submission.status !== "approved") {
    throw new Error("Only approved submissions can be used for generation");
  }

  // Update submission status to processing
  await prisma.guideSubmission.update({
    where: { id: validId },
    data: { status: "processing" },
  });

  // Build raw output from submission content
  const rawOutput = {
    source: "community_submission",
    submissionId: submission.id,
    textContent: submission.textContent,
    photos: submission.photos,
    videoLinks: submission.videoLinks,
    externalLinks: submission.externalLinks,
    toolsList: submission.toolsList,
    estimatedTime: submission.estimatedTime,
    difficulty: submission.difficulty,
  };

  // Create AI generation job linked to this submission
  const job = await prisma.aIGenerationJob.create({
    data: {
      productId: submission.productId,
      status: "queued",
      priority: "normal",
      triggeredBy: "manual",
      submissionId: submission.id,
      rawOutput: JSON.parse(JSON.stringify(rawOutput)),
    },
  });

  // Update product guide_status
  await prisma.product.update({
    where: { id: submission.productId },
    data: { guide_status: "queued" },
  });

  revalidatePath("/studio/submissions");
  revalidatePath("/studio/ai-generate");

  return { success: true, jobId: job.id };
}
