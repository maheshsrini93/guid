"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPremiumUser } from "@/lib/subscription";
import { revalidatePath } from "next/cache";

const requestGuideSchema = z.object({
  productId: z.number().int().positive(),
});

export type RequestGuideResult = {
  success: boolean;
  error?: string;
  status?: "requested" | "already_exists" | "already_queued";
  isPriority?: boolean;
};

/**
 * Request an AI guide for a product.
 * Premium users' requests get "high" priority in the AI queue.
 * Free users get "normal" priority.
 */
export async function requestGuide(
  productId: number
): Promise<RequestGuideResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Please sign in to request a guide" };
  }

  const userId = (session.user as unknown as { id: string }).id;
  const parsed = requestGuideSchema.safeParse({ productId });
  if (!parsed.success) {
    return { success: false, error: "Invalid product" };
  }

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: {
      id: true,
      guide_status: true,
      documents: {
        where: { document_type: "assembly" },
        select: { source_url: true },
        take: 1,
      },
    },
  });

  if (!product) {
    return { success: false, error: "Product not found" };
  }

  // Check if guide already exists or is in progress
  if (product.guide_status === "published") {
    return { success: true, status: "already_exists" };
  }

  if (
    product.guide_status === "queued" ||
    product.guide_status === "generating"
  ) {
    return { success: true, status: "already_queued" };
  }

  // Check for existing active job
  const activeJob = await prisma.aIGenerationJob.findFirst({
    where: {
      productId: parsed.data.productId,
      status: { in: ["queued", "processing"] },
    },
    select: { id: true },
  });

  if (activeJob) {
    return { success: true, status: "already_queued" };
  }

  // Check if product has assembly PDF (required for generation)
  if (product.documents.length === 0) {
    return {
      success: false,
      error: "This product has no assembly instructions available for guide generation",
    };
  }

  // Determine priority based on subscription
  const premium = await isPremiumUser(userId);
  const priority = premium ? "high" : "normal";

  // Create the AI generation job
  await prisma.$transaction([
    prisma.aIGenerationJob.create({
      data: {
        productId: parsed.data.productId,
        status: "queued",
        priority,
        triggeredBy: "manual",
        inputPdfUrl: product.documents[0]?.source_url,
      },
    }),
    prisma.product.update({
      where: { id: parsed.data.productId },
      data: { guide_status: "queued" },
    }),
  ]);

  revalidatePath(`/products`);

  return {
    success: true,
    status: "requested",
    isPriority: premium,
  };
}
