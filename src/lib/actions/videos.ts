"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const user = session.user as unknown as { id: string; role: string };
  if (user.role !== "admin") throw new Error("Not authorized");
  return user;
}

export async function approveVideo(videoId: string) {
  const admin = await requireAdmin();

  await prisma.videoSubmission.update({
    where: { id: videoId },
    data: {
      status: "approved",
      reviewedBy: admin.id,
      reviewedAt: new Date(),
    },
  });

  // Increment the creator's total video count
  const video = await prisma.videoSubmission.findUnique({
    where: { id: videoId },
    select: { creatorId: true },
  });
  if (video) {
    await prisma.creatorProfile.update({
      where: { id: video.creatorId },
      data: { totalVideos: { increment: 1 } },
    });
  }

  revalidatePath("/studio/videos");
}

export async function rejectVideo(videoId: string, notes: string) {
  const admin = await requireAdmin();

  await prisma.videoSubmission.update({
    where: { id: videoId },
    data: {
      status: "rejected",
      reviewedBy: admin.id,
      reviewNotes: notes,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/studio/videos");
}
