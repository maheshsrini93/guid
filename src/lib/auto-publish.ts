import { prisma } from "@/lib/prisma";
import type { GeneratedGuide } from "@/lib/ai/types";
import {
  classifyQualityGate,
  runQualityChecks,
  type QualityGateDecision,
  type QualityGateThresholds,
  DEFAULT_QUALITY_GATE,
} from "@/lib/ai/quality-checker";

/**
 * After generation completes, classify the guide and route it:
 *
 * - auto_publish (>= 90% confidence, 0 errors):
 *   Creates AssemblyGuide + Steps, sets product to "published",
 *   marks job "approved". Guide is live immediately.
 *
 * - review (70-89% confidence):
 *   Creates AssemblyGuide + Steps with aiGenerated=true, sets product
 *   to "published" (guide is live immediately with "AI-Generated" badge),
 *   but keeps job in "review" status so admin can verify and improve.
 *
 * - hold (< 70% confidence):
 *   No guide created. Job stays in "review" with hold notes.
 *   Product set to "in_review". Admin must manually approve.
 */
export async function autoPublishOrRoute(
  jobId: string,
  guide: GeneratedGuide,
  thresholds?: Partial<QualityGateThresholds>
): Promise<{
  decision: QualityGateDecision;
  published: boolean;
}> {
  const gate = { ...DEFAULT_QUALITY_GATE, ...thresholds };

  // Try to load active config thresholds from the database
  const activeConfig = await prisma.aIGenerationConfig.findFirst({
    where: { isActive: true },
    select: { autoPublishThresholds: true },
  });

  if (activeConfig?.autoPublishThresholds) {
    const configThresholds = activeConfig.autoPublishThresholds as Record<string, unknown>;
    if (typeof configThresholds.autoPublishMinConfidence === "number") {
      gate.autoPublishMinConfidence = configThresholds.autoPublishMinConfidence;
    }
    if (typeof configThresholds.reviewMinConfidence === "number") {
      gate.reviewQueueMinConfidence = configThresholds.reviewMinConfidence;
      gate.holdThreshold = configThresholds.reviewMinConfidence;
    }
  }

  // Run quality checks
  const qualityResult = runQualityChecks(
    guide.steps,
    guide.metadata.pdfPageCount
  );

  const decision = classifyQualityGate(qualityResult, gate);

  const job = await prisma.aIGenerationJob.findUnique({
    where: { id: jobId },
    select: {
      productId: true,
      product: {
        select: { assemblyGuide: { select: { id: true } } },
      },
    },
  });

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  // ── Auto-publish: high confidence, passed quality gate ──
  if (decision === "auto_publish") {
    await upsertGuide(job.productId, guide, job.product.assemblyGuide?.id, true);

    await prisma.$transaction([
      prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "approved",
          reviewNotes: "Auto-published (high confidence, passed quality gate)",
          completedAt: new Date(),
        },
      }),
      prisma.product.update({
        where: { id: job.productId },
        data: { guide_status: "published" },
      }),
    ]);

    return { decision: "auto_publish", published: true };
  }

  // ── Review tier: publish with AI-Generated badge, flag for review ──
  if (decision === "review") {
    await upsertGuide(job.productId, guide, job.product.assemblyGuide?.id, true);

    const reviewNote = `Review: auto-published with AI-Generated badge (confidence ${(qualityResult.overallConfidence * 100).toFixed(0)}%, ${qualityResult.summary.warnings} warnings)`;

    await prisma.$transaction([
      prisma.aIGenerationJob.update({
        where: { id: jobId },
        data: {
          status: "review",
          rawOutput: JSON.parse(JSON.stringify(guide)),
          confidenceScore: qualityResult.overallConfidence,
          qualityFlags: JSON.parse(JSON.stringify(qualityResult.flags)),
          modelPrimary: guide.metadata.primaryModel,
          modelSecondary: guide.metadata.secondaryModel || null,
          reviewNotes: reviewNote,
          completedAt: new Date(),
        },
      }),
      prisma.product.update({
        where: { id: job.productId },
        data: { guide_status: "published" },
      }),
    ]);

    return { decision: "review", published: true };
  }

  // ── Hold: low confidence, no guide created ──
  const holdNote = `Hold: confidence ${(qualityResult.overallConfidence * 100).toFixed(0)}% below threshold, ${qualityResult.summary.errors} errors`;

  await prisma.$transaction([
    prisma.aIGenerationJob.update({
      where: { id: jobId },
      data: {
        status: "review",
        rawOutput: JSON.parse(JSON.stringify(guide)),
        confidenceScore: qualityResult.overallConfidence,
        qualityFlags: JSON.parse(JSON.stringify(qualityResult.flags)),
        modelPrimary: guide.metadata.primaryModel,
        modelSecondary: guide.metadata.secondaryModel || null,
        reviewNotes: holdNote,
        completedAt: new Date(),
      },
    }),
    prisma.product.update({
      where: { id: job.productId },
      data: { guide_status: "in_review" },
    }),
  ]);

  return { decision: "hold", published: false };
}

/**
 * Create or update an AssemblyGuide with steps.
 * Sets aiGenerated=true for all AI-created guides.
 */
async function upsertGuide(
  productId: number,
  guide: GeneratedGuide,
  existingGuideId: string | undefined,
  aiGenerated: boolean
) {
  const toolsList =
    guide.tools?.required?.map((t) => t.toolName).join(", ") || null;

  const stepsData = guide.steps.map((step) => ({
    stepNumber: step.stepNumber,
    title: step.title,
    instruction: step.instruction,
    tip: step.callouts?.find((c) => c.type === "tip")?.text || null,
    imageUrl: step.illustrationUrl || null,
  }));

  if (existingGuideId) {
    await prisma.assemblyStep.deleteMany({
      where: { guideId: existingGuideId },
    });
    await prisma.assemblyGuide.update({
      where: { id: existingGuideId },
      data: {
        title: guide.title,
        description: guide.description,
        difficulty: guide.difficulty,
        timeMinutes: guide.estimatedTimeMinutes,
        tools: toolsList,
        published: true,
        aiGenerated,
        steps: { create: stepsData },
      },
    });
  } else {
    await prisma.assemblyGuide.create({
      data: {
        productId,
        title: guide.title,
        description: guide.description,
        difficulty: guide.difficulty,
        timeMinutes: guide.estimatedTimeMinutes,
        tools: toolsList,
        published: true,
        aiGenerated,
        steps: { create: stepsData },
      },
    });
  }
}
