"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session.user as unknown as { id: string; role: string };
}

const YOUTUBE_CHANNEL_PATTERN =
  /^https:\/\/(www\.)?youtube\.com\/(c\/|channel\/|@|user\/)?[\w\-%.]+\/?$/;

function extractChannelId(url: string): string | null {
  const match = url.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  return match ? match[1] : null;
}

const registerCreatorSchema = z.object({
  youtubeChannelUrl: z
    .string()
    .url("Please enter a valid URL")
    .regex(YOUTUBE_CHANNEL_PATTERN, "Please enter a valid YouTube channel URL"),
  channelName: z
    .string()
    .min(1, "Channel name is required")
    .max(100, "Channel name must be 100 characters or less")
    .trim(),
});

export type RegisterCreatorResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function registerCreator(
  formData: FormData
): Promise<RegisterCreatorResult> {
  const user = await requireAuth();

  // Check if user already has a creator profile
  const existing = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
  });

  if (existing) {
    return {
      success: false,
      error: "You already have a creator profile.",
    };
  }

  const result = registerCreatorSchema.safeParse({
    youtubeChannelUrl: (formData.get("youtubeChannelUrl") as string)?.trim(),
    channelName: (formData.get("channelName") as string)?.trim(),
  });

  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const youtubeChannelId = extractChannelId(result.data.youtubeChannelUrl);

  const profile = await prisma.creatorProfile.create({
    data: {
      userId: user.id,
      youtubeChannelUrl: result.data.youtubeChannelUrl,
      youtubeChannelId,
      channelName: result.data.channelName,
    },
  });

  redirect(`/creators/${profile.id}`);
}

// ─── Video Submission ───

const YOUTUBE_VIDEO_PATTERN =
  /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)[\w-]+/;

import { extractVideoId } from "@/lib/youtube-utils";

const submitVideoSchema = z.object({
  productArticleNumber: z
    .string()
    .min(1, "Please select a product"),
  youtubeUrl: z
    .string()
    .url("Please enter a valid URL")
    .regex(YOUTUBE_VIDEO_PATTERN, "Please enter a valid YouTube video URL"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or less")
    .trim(),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less")
    .trim()
    .optional()
    .transform((v) => v || null),
  language: z
    .string()
    .min(2)
    .max(10)
    .default("en"),
});

export type SubmitVideoResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitVideo(
  formData: FormData
): Promise<SubmitVideoResult> {
  const user = await requireAuth();

  // Verify the user is a creator
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!profile) {
    return {
      success: false,
      error: "You must register as a creator first.",
    };
  }

  const result = submitVideoSchema.safeParse({
    productArticleNumber: (formData.get("productArticleNumber") as string)?.trim(),
    youtubeUrl: (formData.get("youtubeUrl") as string)?.trim(),
    title: (formData.get("title") as string)?.trim(),
    description: (formData.get("description") as string)?.trim(),
    language: (formData.get("language") as string)?.trim() || "en",
  });

  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  // Resolve article number to product ID
  const product = await prisma.product.findUnique({
    where: { article_number: result.data.productArticleNumber },
    select: { id: true },
  });

  if (!product) {
    return {
      success: false,
      fieldErrors: { productArticleNumber: ["Product not found"] },
    };
  }

  const videoId = extractVideoId(result.data.youtubeUrl);
  if (!videoId) {
    return {
      success: false,
      fieldErrors: { youtubeUrl: ["Could not extract video ID from URL"] },
    };
  }

  // Check for duplicate submission (same creator + same video)
  const duplicate = await prisma.videoSubmission.findFirst({
    where: {
      creatorId: profile.id,
      youtubeVideoId: videoId,
    },
  });

  if (duplicate) {
    return {
      success: false,
      error: "You have already submitted this video.",
    };
  }

  await prisma.videoSubmission.create({
    data: {
      productId: product.id,
      creatorId: profile.id,
      youtubeUrl: result.data.youtubeUrl,
      youtubeVideoId: videoId,
      title: result.data.title,
      description: result.data.description,
      language: result.data.language,
      status: "pending",
    },
  });

  return { success: true };
}
