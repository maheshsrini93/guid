"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as unknown as { role: string }).role;
  if (role !== "admin") throw new Error("Not authorized");
  return session.user;
}

const configIdSchema = z.string().min(1).max(100);

const createConfigSchema = z.object({
  name: z.string().min(1).max(200),
  promptTemplate: z.string().max(50000).optional(),
  modelConfig: z
    .object({
      primaryModel: z.string().max(100).optional(),
      secondaryModel: z.string().max(100).optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().min(1).max(100000).optional(),
    })
    .optional(),
  autoPublishThresholds: z
    .object({
      autoPublishMinConfidence: z.number().min(0).max(1).optional(),
      reviewMinConfidence: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

const updateConfigSchema = createConfigSchema.partial().extend({
  id: z.string().min(1).max(100),
});

/**
 * List all AI generation configs, ordered by most recently updated.
 */
export async function listConfigs() {
  await requireAdmin();

  const configs = await prisma.aIGenerationConfig.findMany({
    orderBy: { updatedAt: "desc" },
  });

  return configs.map((c) => ({
    id: c.id,
    name: c.name,
    version: c.version,
    isActive: c.isActive,
    promptTemplate: c.promptTemplate,
    modelConfig: c.modelConfig as Record<string, unknown> | null,
    autoPublishThresholds: c.autoPublishThresholds as Record<string, unknown> | null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

/**
 * Get a single config by ID.
 */
export async function getConfig(configId: string) {
  await requireAdmin();
  const validId = configIdSchema.parse(configId);

  const config = await prisma.aIGenerationConfig.findUnique({
    where: { id: validId },
  });

  if (!config) return { success: false as const, error: "Config not found" };

  return {
    success: true as const,
    config: {
      id: config.id,
      name: config.name,
      version: config.version,
      isActive: config.isActive,
      promptTemplate: config.promptTemplate,
      modelConfig: config.modelConfig as Record<string, unknown> | null,
      autoPublishThresholds: config.autoPublishThresholds as Record<string, unknown> | null,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    },
  };
}

/**
 * Create a new AI generation config.
 */
export async function createConfig(data: z.infer<typeof createConfigSchema>) {
  await requireAdmin();

  let parsed;
  try {
    parsed = createConfigSchema.parse(data);
  } catch {
    return { success: false as const, error: "Invalid config data" };
  }

  const config = await prisma.aIGenerationConfig.create({
    data: {
      name: parsed.name,
      version: 1,
      promptTemplate: parsed.promptTemplate || null,
      modelConfig: parsed.modelConfig ? JSON.parse(JSON.stringify(parsed.modelConfig)) : null,
      autoPublishThresholds: parsed.autoPublishThresholds
        ? JSON.parse(JSON.stringify(parsed.autoPublishThresholds))
        : null,
      isActive: false,
    },
  });

  revalidatePath("/studio/ai-config");
  return { success: true as const, configId: config.id };
}

/**
 * Update an existing config. Bumps the version number.
 */
export async function updateConfig(data: z.infer<typeof updateConfigSchema>) {
  await requireAdmin();

  let parsed;
  try {
    parsed = updateConfigSchema.parse(data);
  } catch {
    return { success: false as const, error: "Invalid config data" };
  }

  const existing = await prisma.aIGenerationConfig.findUnique({
    where: { id: parsed.id },
  });

  if (!existing) return { success: false as const, error: "Config not found" };

  const updateData: Record<string, unknown> = {
    version: existing.version + 1,
  };

  if (parsed.name !== undefined) updateData.name = parsed.name;
  if (parsed.promptTemplate !== undefined) updateData.promptTemplate = parsed.promptTemplate;
  if (parsed.modelConfig !== undefined)
    updateData.modelConfig = JSON.parse(JSON.stringify(parsed.modelConfig));
  if (parsed.autoPublishThresholds !== undefined)
    updateData.autoPublishThresholds = JSON.parse(JSON.stringify(parsed.autoPublishThresholds));

  await prisma.aIGenerationConfig.update({
    where: { id: parsed.id },
    data: updateData,
  });

  revalidatePath("/studio/ai-config");
  return { success: true as const };
}

/**
 * Set a config as the active one. Deactivates all others.
 */
export async function activateConfig(configId: string) {
  await requireAdmin();
  const validId = configIdSchema.parse(configId);

  const config = await prisma.aIGenerationConfig.findUnique({
    where: { id: validId },
  });

  if (!config) return { success: false as const, error: "Config not found" };

  // Deactivate all, then activate the selected one
  await prisma.$transaction([
    prisma.aIGenerationConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    }),
    prisma.aIGenerationConfig.update({
      where: { id: validId },
      data: { isActive: true },
    }),
  ]);

  revalidatePath("/studio/ai-config");
  return { success: true as const };
}

/**
 * Deactivate a config (no active config).
 */
export async function deactivateConfig(configId: string) {
  await requireAdmin();
  const validId = configIdSchema.parse(configId);

  await prisma.aIGenerationConfig.update({
    where: { id: validId },
    data: { isActive: false },
  });

  revalidatePath("/studio/ai-config");
  return { success: true as const };
}

/**
 * Delete a config. Cannot delete the active config.
 */
export async function deleteConfig(configId: string) {
  await requireAdmin();
  const validId = configIdSchema.parse(configId);

  const config = await prisma.aIGenerationConfig.findUnique({
    where: { id: validId },
  });

  if (!config) return { success: false as const, error: "Config not found" };
  if (config.isActive) {
    return { success: false as const, error: "Cannot delete the active config. Deactivate it first." };
  }

  await prisma.aIGenerationConfig.delete({ where: { id: validId } });

  revalidatePath("/studio/ai-config");
  return { success: true as const };
}
