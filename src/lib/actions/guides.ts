"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as unknown as { role: string }).role;
  if (role !== "admin") throw new Error("Not authorized");
  return session.user;
}

export async function createGuide(formData: FormData) {
  await requireAdmin();

  const productId = parseInt(formData.get("productId") as string, 10);
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const difficulty = (formData.get("difficulty") as string) || "medium";
  const timeMinutes = formData.get("timeMinutes")
    ? parseInt(formData.get("timeMinutes") as string, 10)
    : null;
  const tools = (formData.get("tools") as string) || null;

  if (!productId || !title) {
    throw new Error("Product and title are required");
  }

  const guide = await prisma.assemblyGuide.create({
    data: {
      productId,
      title,
      description,
      difficulty,
      timeMinutes,
      tools,
    },
  });

  redirect(`/studio/guides/${guide.id}`);
}

export async function updateGuide(guideId: string, formData: FormData) {
  await requireAdmin();

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const difficulty = (formData.get("difficulty") as string) || "medium";
  const timeMinutes = formData.get("timeMinutes")
    ? parseInt(formData.get("timeMinutes") as string, 10)
    : null;
  const tools = (formData.get("tools") as string) || null;
  const published = formData.get("published") === "true";

  await prisma.assemblyGuide.update({
    where: { id: guideId },
    data: { title, description, difficulty, timeMinutes, tools, published },
  });

  revalidatePath(`/studio/guides/${guideId}`);
  revalidatePath("/studio/guides");
}

export async function deleteGuide(guideId: string) {
  await requireAdmin();

  await prisma.assemblyGuide.delete({ where: { id: guideId } });

  revalidatePath("/studio/guides");
  redirect("/studio/guides");
}

export async function addStep(guideId: string, formData: FormData) {
  await requireAdmin();

  const title = formData.get("title") as string;
  const instruction = formData.get("instruction") as string;
  const tip = (formData.get("tip") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || null;

  if (!title || !instruction) {
    throw new Error("Title and instruction are required");
  }

  // Get the next step number
  const lastStep = await prisma.assemblyStep.findFirst({
    where: { guideId },
    orderBy: { stepNumber: "desc" },
  });
  const stepNumber = (lastStep?.stepNumber ?? 0) + 1;

  await prisma.assemblyStep.create({
    data: { guideId, stepNumber, title, instruction, tip, imageUrl },
  });

  revalidatePath(`/studio/guides/${guideId}`);
}

export async function updateStep(stepId: string, formData: FormData) {
  await requireAdmin();

  const title = formData.get("title") as string;
  const instruction = formData.get("instruction") as string;
  const tip = (formData.get("tip") as string) || null;
  const imageUrl = (formData.get("imageUrl") as string) || null;

  const step = await prisma.assemblyStep.update({
    where: { id: stepId },
    data: { title, instruction, tip, imageUrl },
  });

  revalidatePath(`/studio/guides/${step.guideId}`);
}

export async function deleteStep(stepId: string) {
  await requireAdmin();

  const step = await prisma.assemblyStep.delete({ where: { id: stepId } });

  // Renumber remaining steps
  const remaining = await prisma.assemblyStep.findMany({
    where: { guideId: step.guideId },
    orderBy: { stepNumber: "asc" },
  });

  for (let i = 0; i < remaining.length; i++) {
    if (remaining[i].stepNumber !== i + 1) {
      await prisma.assemblyStep.update({
        where: { id: remaining[i].id },
        data: { stepNumber: i + 1 },
      });
    }
  }

  revalidatePath(`/studio/guides/${step.guideId}`);
}
