"use server";

import { z } from "zod";
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

const createGuideSchema = z.object({
  productId: z.number().int().positive(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  timeMinutes: z.number().int().positive().max(1440).nullable(),
  tools: z.string().max(2000).nullable(),
});

export async function createGuide(formData: FormData) {
  await requireAdmin();

  const parsed = createGuideSchema.parse({
    productId: parseInt(formData.get("productId") as string, 10),
    title: (formData.get("title") as string)?.trim(),
    description: (formData.get("description") as string)?.trim() || null,
    difficulty: (formData.get("difficulty") as string) || "medium",
    timeMinutes: formData.get("timeMinutes")
      ? parseInt(formData.get("timeMinutes") as string, 10)
      : null,
    tools: (formData.get("tools") as string)?.trim() || null,
  });

  const guide = await prisma.assemblyGuide.create({ data: parsed });

  redirect(`/studio/guides/${guide.id}`);
}

const updateGuideSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  timeMinutes: z.number().int().positive().max(1440).nullable(),
  tools: z.string().max(2000).nullable(),
  published: z.boolean(),
});

const cuidSchema = z.string().min(1).max(100);

export async function updateGuide(guideId: string, formData: FormData) {
  await requireAdmin();

  const validId = cuidSchema.parse(guideId);
  const parsed = updateGuideSchema.parse({
    title: (formData.get("title") as string)?.trim(),
    description: (formData.get("description") as string)?.trim() || null,
    difficulty: (formData.get("difficulty") as string) || "medium",
    timeMinutes: formData.get("timeMinutes")
      ? parseInt(formData.get("timeMinutes") as string, 10)
      : null,
    tools: (formData.get("tools") as string)?.trim() || null,
    published: formData.get("published") === "true",
  });

  await prisma.assemblyGuide.update({
    where: { id: validId },
    data: parsed,
  });

  revalidatePath(`/studio/guides/${validId}`);
  revalidatePath("/studio/guides");
}

export async function deleteGuide(guideId: string) {
  await requireAdmin();

  const validId = cuidSchema.parse(guideId);

  await prisma.assemblyGuide.delete({ where: { id: validId } });

  revalidatePath("/studio/guides");
  redirect("/studio/guides");
}

const addStepSchema = z.object({
  title: z.string().min(1).max(500),
  instruction: z.string().min(1).max(10000),
  tip: z.string().max(2000).nullable(),
  imageUrl: z.string().url().max(2000).nullable(),
});

export async function addStep(guideId: string, formData: FormData) {
  await requireAdmin();

  const validGuideId = cuidSchema.parse(guideId);
  const parsed = addStepSchema.parse({
    title: (formData.get("title") as string)?.trim(),
    instruction: (formData.get("instruction") as string)?.trim(),
    tip: (formData.get("tip") as string)?.trim() || null,
    imageUrl: (formData.get("imageUrl") as string)?.trim() || null,
  });

  // Get the next step number
  const lastStep = await prisma.assemblyStep.findFirst({
    where: { guideId: validGuideId },
    orderBy: { stepNumber: "desc" },
  });
  const stepNumber = (lastStep?.stepNumber ?? 0) + 1;

  await prisma.assemblyStep.create({
    data: { guideId: validGuideId, stepNumber, ...parsed },
  });

  revalidatePath(`/studio/guides/${validGuideId}`);
}

const updateStepSchema = z.object({
  title: z.string().min(1).max(500),
  instruction: z.string().min(1).max(10000),
  tip: z.string().max(2000).nullable(),
  imageUrl: z.string().url().max(2000).nullable(),
});

export async function updateStep(stepId: string, formData: FormData) {
  await requireAdmin();

  const validId = cuidSchema.parse(stepId);
  const parsed = updateStepSchema.parse({
    title: (formData.get("title") as string)?.trim(),
    instruction: (formData.get("instruction") as string)?.trim(),
    tip: (formData.get("tip") as string)?.trim() || null,
    imageUrl: (formData.get("imageUrl") as string)?.trim() || null,
  });

  const step = await prisma.assemblyStep.update({
    where: { id: validId },
    data: parsed,
  });

  revalidatePath(`/studio/guides/${step.guideId}`);
}

export async function deleteStep(stepId: string) {
  await requireAdmin();

  const validId = cuidSchema.parse(stepId);

  const step = await prisma.assemblyStep.delete({ where: { id: validId } });

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
