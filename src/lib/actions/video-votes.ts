"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const voteSchema = z.object({
  videoSubmissionId: z.string().min(1),
  vote: z.enum(["up", "down"]),
});

export type VoteResult = {
  success: boolean;
  error?: string;
  helpfulVotes?: number;
  unhelpfulVotes?: number;
  userVote?: "up" | "down" | null;
};

/**
 * Cast or change a vote on a video submission.
 * If the user already voted the same way, the vote is removed (toggle).
 * If the user voted differently, the vote is changed.
 */
export async function castVideoVote(
  videoSubmissionId: string,
  vote: "up" | "down"
): Promise<VoteResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Please sign in to vote." };
  }

  const userId = (session.user as unknown as { id: string }).id;

  const parsed = voteSchema.safeParse({ videoSubmissionId, vote });
  if (!parsed.success) {
    return { success: false, error: "Invalid vote." };
  }

  // Verify the video exists and is approved
  const video = await prisma.videoSubmission.findUnique({
    where: { id: parsed.data.videoSubmissionId },
    select: {
      id: true,
      status: true,
      helpfulVotes: true,
      unhelpfulVotes: true,
      creatorId: true,
      product: { select: { article_number: true } },
    },
  });

  if (!video || video.status !== "approved") {
    return { success: false, error: "Video not found." };
  }

  // Check for existing vote
  const existingVote = await prisma.videoVote.findUnique({
    where: {
      videoSubmissionId_userId: {
        videoSubmissionId: parsed.data.videoSubmissionId,
        userId,
      },
    },
  });

  let helpfulDelta = 0;
  let unhelpfulDelta = 0;
  let newUserVote: "up" | "down" | null = null;

  if (existingVote) {
    if (existingVote.vote === parsed.data.vote) {
      // Same vote — toggle off (remove vote)
      await prisma.videoVote.delete({
        where: { id: existingVote.id },
      });
      if (parsed.data.vote === "up") helpfulDelta = -1;
      else unhelpfulDelta = -1;
      newUserVote = null;
    } else {
      // Different vote — change it
      await prisma.videoVote.update({
        where: { id: existingVote.id },
        data: { vote: parsed.data.vote },
      });
      if (parsed.data.vote === "up") {
        helpfulDelta = 1;
        unhelpfulDelta = -1;
      } else {
        helpfulDelta = -1;
        unhelpfulDelta = 1;
      }
      newUserVote = parsed.data.vote;
    }
  } else {
    // New vote
    await prisma.videoVote.create({
      data: {
        videoSubmissionId: parsed.data.videoSubmissionId,
        userId,
        vote: parsed.data.vote,
      },
    });
    if (parsed.data.vote === "up") helpfulDelta = 1;
    else unhelpfulDelta = 1;
    newUserVote = parsed.data.vote;
  }

  // Update the counters on VideoSubmission
  const updated = await prisma.videoSubmission.update({
    where: { id: parsed.data.videoSubmissionId },
    data: {
      helpfulVotes: { increment: helpfulDelta },
      unhelpfulVotes: { increment: unhelpfulDelta },
    },
    select: { helpfulVotes: true, unhelpfulVotes: true },
  });

  // Update the creator's total helpful votes
  if (helpfulDelta !== 0) {
    await prisma.creatorProfile.update({
      where: { id: video.creatorId },
      data: { totalHelpfulVotes: { increment: helpfulDelta } },
    });
  }

  revalidatePath(`/products/${video.product.article_number}`);

  return {
    success: true,
    helpfulVotes: updated.helpfulVotes,
    unhelpfulVotes: updated.unhelpfulVotes,
    userVote: newUserVote,
  };
}

/**
 * Get the current user's vote for a set of video submissions.
 * Returns a map of videoSubmissionId -> vote direction.
 */
export async function getUserVideoVotes(
  videoSubmissionIds: string[]
): Promise<Record<string, "up" | "down">> {
  const session = await auth();
  if (!session?.user) return {};

  const userId = (session.user as unknown as { id: string }).id;

  const votes = await prisma.videoVote.findMany({
    where: {
      videoSubmissionId: { in: videoSubmissionIds },
      userId,
    },
    select: { videoSubmissionId: true, vote: true },
  });

  const result: Record<string, "up" | "down"> = {};
  for (const v of votes) {
    result[v.videoSubmissionId] = v.vote as "up" | "down";
  }
  return result;
}
