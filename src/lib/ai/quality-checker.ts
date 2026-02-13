import type {
  GeneratedStep,
  QualityFlag,
  QualityFlagCode,
} from "./types";

// ─── Quality Check Configuration ───

export interface QualityCheckConfig {
  /** Minimum acceptable confidence per step (default: 0.7) */
  minStepConfidence: number;
  /** Minimum acceptable overall confidence (default: 0.6) */
  minOverallConfidence: number;
  /** Maximum step count before flagging (default: 50) */
  maxExpectedSteps: number;
  /** Minimum step count for a multi-page PDF (default: 2) */
  minExpectedSteps: number;
}

const DEFAULT_CONFIG: QualityCheckConfig = {
  minStepConfidence: 0.7,
  minOverallConfidence: 0.6,
  maxExpectedSteps: 50,
  minExpectedSteps: 2,
};

// ─── Quality Gate Thresholds ───
// Determines how generated guides are routed after quality checks.

export interface QualityGateThresholds {
  /** Minimum confidence for auto-publishing without human review */
  autoPublishMinConfidence: number;
  /** Auto-publish also requires zero quality errors */
  autoPublishMaxErrors: number;
  /** Maximum warnings allowed for auto-publish (info flags don't count) */
  autoPublishMaxWarnings: number;

  /** Minimum confidence for the review queue (below this → hold) */
  reviewQueueMinConfidence: number;

  /** Below this confidence, guide is held and not shown to reviewers until re-generated */
  holdThreshold: number;
}

export const DEFAULT_QUALITY_GATE: QualityGateThresholds = {
  autoPublishMinConfidence: 0.9,
  autoPublishMaxErrors: 0,
  autoPublishMaxWarnings: 2,
  reviewQueueMinConfidence: 0.7,
  holdThreshold: 0.7,
};

export type QualityGateDecision = "auto_publish" | "review" | "hold";

/**
 * Classify a guide into a quality gate decision based on its quality check result.
 *
 * - auto_publish: High confidence, no errors, few warnings → publish immediately
 * - review: Moderate confidence or has warnings → queue for human review
 * - hold: Low confidence or has errors → hold for re-generation or major rework
 */
export function classifyQualityGate(
  result: QualityCheckResult,
  thresholds: QualityGateThresholds = DEFAULT_QUALITY_GATE
): QualityGateDecision {
  const { overallConfidence, summary } = result;

  // Hold: below minimum confidence or has errors
  if (
    overallConfidence < thresholds.holdThreshold ||
    summary.errors > 0
  ) {
    return "hold";
  }

  // Auto-publish: high confidence, no errors, few warnings
  if (
    overallConfidence >= thresholds.autoPublishMinConfidence &&
    summary.errors <= thresholds.autoPublishMaxErrors &&
    summary.warnings <= thresholds.autoPublishMaxWarnings
  ) {
    return "auto_publish";
  }

  // Everything else goes to review
  return "review";
}

// ─── Quality Check Result ───

export interface QualityCheckResult {
  flags: QualityFlag[];
  overallConfidence: number;
  passesQualityGate: boolean;
  summary: {
    totalChecks: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

// ─── Individual Check Functions ───

/** Check for low-confidence steps */
function checkLowConfidenceSteps(
  steps: GeneratedStep[],
  config: QualityCheckConfig
): QualityFlag[] {
  const flags: QualityFlag[] = [];
  for (const step of steps) {
    if (step.confidence < config.minStepConfidence) {
      flags.push({
        code: "low_confidence_step",
        message: `Step ${step.stepNumber} has low confidence (${step.confidence.toFixed(2)})`,
        severity: step.confidence < 0.5 ? "error" : "warning",
        stepNumber: step.stepNumber,
      });
    }
  }
  return flags;
}

/** Check step count against PDF page count */
function checkStepCountVsPdfPages(
  steps: GeneratedStep[],
  pdfPageCount: number
): QualityFlag[] {
  const flags: QualityFlag[] = [];

  if (steps.length === 0) {
    flags.push({
      code: "step_count_mismatch",
      message: "No assembly steps were extracted from the PDF",
      severity: "error",
    });
    return flags;
  }

  // Usually the first 1-2 pages are parts lists, so expect step count ≈ pages - 1 or 2.
  // But steps can be merged or split, so allow wide tolerance.
  const minReasonable = Math.max(1, pdfPageCount - 3);
  const maxReasonable = pdfPageCount * 3; // some pages have multiple steps

  if (steps.length < minReasonable && pdfPageCount > 3) {
    flags.push({
      code: "step_count_mismatch",
      message: `Only ${steps.length} steps extracted from ${pdfPageCount}-page PDF — some steps may be missing`,
      severity: "warning",
    });
  }

  if (steps.length > maxReasonable) {
    flags.push({
      code: "step_count_mismatch",
      message: `${steps.length} steps extracted from ${pdfPageCount}-page PDF — possible duplicate extraction`,
      severity: "warning",
    });
  }

  return flags;
}

/** Check for sequential step numbering (after renumbering) */
function checkStepSequence(steps: GeneratedStep[]): QualityFlag[] {
  const flags: QualityFlag[] = [];

  for (let i = 0; i < steps.length; i++) {
    if (steps[i].stepNumber !== i + 1) {
      flags.push({
        code: "sequence_gap",
        message: `Step numbering gap: expected step ${i + 1} but found step ${steps[i].stepNumber}`,
        severity: "warning",
        stepNumber: steps[i].stepNumber,
      });
      break; // Only flag the first gap
    }
  }

  return flags;
}

/** Check that all parts referenced in steps are consistent */
function checkPartReferences(steps: GeneratedStep[]): QualityFlag[] {
  const flags: QualityFlag[] = [];

  // Collect all part numbers and the steps they appear in
  const partSteps = new Map<string, number[]>();
  for (const step of steps) {
    for (const part of step.parts) {
      const existing = partSteps.get(part.partNumber) ?? [];
      existing.push(step.stepNumber);
      partSteps.set(part.partNumber, existing);
    }
  }

  // Check for parts that only appear once in a multi-step guide
  // (not necessarily an issue, but worth flagging if the guide is large)
  if (steps.length > 10) {
    const singleUseParts = Array.from(partSteps.entries()).filter(
      ([, stepNums]) => stepNums.length === 1
    );
    if (singleUseParts.length > partSteps.size * 0.8) {
      flags.push({
        code: "missing_parts",
        message: `${singleUseParts.length} of ${partSteps.size} parts appear in only one step — part tracking may be incomplete`,
        severity: "info",
      });
    }
  }

  return flags;
}

/** Check that tools are identified */
function checkToolCoverage(steps: GeneratedStep[]): QualityFlag[] {
  const flags: QualityFlag[] = [];

  const allTools = new Set<string>();
  for (const step of steps) {
    for (const tool of step.tools) {
      allTools.add(tool.toolName);
    }
  }

  // Most multi-step assemblies require at least one tool
  if (allTools.size === 0 && steps.length > 3) {
    flags.push({
      code: "missing_tools",
      message:
        "No tools were identified across all steps — assembly likely requires tools",
      severity: "info",
    });
  }

  // Check for steps with fasteners but no tools
  for (const step of steps) {
    const raw = step.rawExtraction;
    if (raw && raw.fasteners.length > 0 && step.tools.length === 0) {
      const screwFasteners = raw.fasteners.filter(
        (f) =>
          f.type === "screw" ||
          f.type === "bolt" ||
          f.type === "cam lock"
      );
      if (screwFasteners.length > 0) {
        flags.push({
          code: "missing_tools",
          message: `Step ${step.stepNumber} has ${screwFasteners.map((f) => f.type).join(", ")} but no tools identified`,
          severity: "warning",
          stepNumber: step.stepNumber,
        });
      }
    }
  }

  return flags;
}

/** Check that instructions are not empty or too short */
function checkInstructionQuality(steps: GeneratedStep[]): QualityFlag[] {
  const flags: QualityFlag[] = [];

  for (const step of steps) {
    if (!step.instruction || step.instruction.trim().length === 0) {
      flags.push({
        code: "low_confidence_step",
        message: `Step ${step.stepNumber} has an empty instruction`,
        severity: "error",
        stepNumber: step.stepNumber,
      });
    } else if (step.instruction.trim().length < 20) {
      flags.push({
        code: "low_confidence_step",
        message: `Step ${step.stepNumber} has a very short instruction (${step.instruction.trim().length} chars)`,
        severity: "warning",
        stepNumber: step.stepNumber,
      });
    }
  }

  return flags;
}

/** Check for duplicate/near-identical steps */
function checkDuplicateSteps(steps: GeneratedStep[]): QualityFlag[] {
  const flags: QualityFlag[] = [];

  for (let i = 0; i < steps.length; i++) {
    for (let j = i + 1; j < steps.length; j++) {
      const a = steps[i].instruction.toLowerCase().trim();
      const b = steps[j].instruction.toLowerCase().trim();

      // Exact duplicate
      if (a === b && a.length > 20) {
        flags.push({
          code: "duplicate_step",
          message: `Steps ${steps[i].stepNumber} and ${steps[j].stepNumber} have identical instructions`,
          severity: "warning",
          stepNumber: steps[j].stepNumber,
        });
      }
    }
  }

  return flags;
}

/** Check that safety warnings exist for products with screws/heavy parts */
function checkSafetyWarnings(steps: GeneratedStep[]): QualityFlag[] {
  const flags: QualityFlag[] = [];

  const hasWarningCallouts = steps.some((s) =>
    s.callouts.some((c) => c.type === "warning")
  );

  // If there are many steps and heavy parts, expect at least one warning
  if (!hasWarningCallouts && steps.length > 10) {
    const hasHeavyParts = steps.some((s) => {
      const raw = s.rawExtraction;
      return raw?.annotations.some(
        (a) =>
          a.includes("two-person") ||
          a.includes("2x") ||
          a.includes("heavy")
      );
    });

    if (hasHeavyParts) {
      flags.push({
        code: "no_warnings",
        message:
          "Guide has heavy-lift annotations but no warning callouts — consider adding safety warnings",
        severity: "warning",
      });
    }
  }

  return flags;
}

/** Check for uncertain orientation in complex steps */
function checkOrientationCoverage(steps: GeneratedStep[]): QualityFlag[] {
  const flags: QualityFlag[] = [];

  const complexSteps = steps.filter((s) => s.complexity === "complex");
  for (const step of complexSteps) {
    const raw = step.rawExtraction;
    if (raw && !raw.spatialDetails.orientation) {
      flags.push({
        code: "orientation_uncertain",
        message: `Complex step ${step.stepNumber} has no orientation data — user may be confused about part positioning`,
        severity: "info",
        stepNumber: step.stepNumber,
      });
    }
  }

  return flags;
}

/** Check that all steps have illustrations (when illustrations were generated) */
function checkIllustrationCoverage(steps: GeneratedStep[]): QualityFlag[] {
  const flags: QualityFlag[] = [];

  // Only check if at least one step has an illustration (meaning illustrations were enabled)
  const hasAnyIllustration = steps.some((s) => s.illustrationUrl);
  if (!hasAnyIllustration) return flags;

  for (const step of steps) {
    if (!step.illustrationUrl) {
      flags.push({
        code: "illustration_missing",
        message: `Step ${step.stepNumber} has no illustration`,
        severity: "warning",
        stepNumber: step.stepNumber,
      });
    }
  }

  return flags;
}

/** Flag guides where >30% of steps have low confidence */
function checkConfidenceDistribution(
  steps: GeneratedStep[],
  config: QualityCheckConfig
): QualityFlag[] {
  const flags: QualityFlag[] = [];
  if (steps.length === 0) return flags;

  const lowConfidenceCount = steps.filter(
    (s) => s.confidence < config.minStepConfidence
  ).length;
  const ratio = lowConfidenceCount / steps.length;

  if (ratio > 0.3) {
    flags.push({
      code: "high_low_confidence_ratio",
      message: `${Math.round(ratio * 100)}% of steps (${lowConfidenceCount}/${steps.length}) have low confidence — guide may need manual review`,
      severity: "error",
    });
  } else if (ratio > 0.15) {
    flags.push({
      code: "high_low_confidence_ratio",
      message: `${Math.round(ratio * 100)}% of steps (${lowConfidenceCount}/${steps.length}) have low confidence`,
      severity: "warning",
    });
  }

  return flags;
}

/** Check that steps don't reference parts not yet introduced */
function checkPartSequence(steps: GeneratedStep[]): QualityFlag[] {
  const flags: QualityFlag[] = [];

  // Build a set of parts introduced so far (by part number)
  const introducedParts = new Set<string>();

  // Step 1 implicitly introduces all its parts
  // For subsequent steps, check if any parts were never seen before in a prior step's parts list
  // Note: this is a soft check — new parts can be introduced at any step for sub-assemblies
  const partFirstSeen = new Map<string, number>();

  for (const step of steps) {
    for (const part of step.parts) {
      if (!partFirstSeen.has(part.partNumber)) {
        partFirstSeen.set(part.partNumber, step.stepNumber);
      }
    }
  }

  // A part appearing for the first time after step 1 in a guide with >5 steps
  // could indicate it was missed in an earlier step, but only flag if the step
  // references it alongside other parts that were already introduced much earlier
  if (steps.length > 5) {
    for (const step of steps) {
      if (step.stepNumber <= 2) continue; // First two steps always introduce parts

      const newParts = step.parts.filter(
        (p) => partFirstSeen.get(p.partNumber) === step.stepNumber
      );
      const existingParts = step.parts.filter(
        (p) => (partFirstSeen.get(p.partNumber) ?? step.stepNumber) < step.stepNumber
      );

      // If a step introduces new parts alongside old parts, and the new parts
      // have been referenced in the instruction text of earlier steps, flag it
      if (newParts.length > 0 && existingParts.length > 0) {
        // Check if any "new" part number appears in earlier step instructions
        for (const newPart of newParts) {
          const mentionedEarlier = steps
            .filter((s) => s.stepNumber < step.stepNumber)
            .some(
              (s) =>
                s.instruction.includes(newPart.partNumber) ||
                s.instruction.toLowerCase().includes(newPart.partName.toLowerCase())
            );

          if (mentionedEarlier) {
            flags.push({
              code: "part_sequence_error",
              message: `Part "${newPart.partName}" (${newPart.partNumber}) first tracked in step ${step.stepNumber} but referenced in earlier instructions`,
              severity: "warning",
              stepNumber: step.stepNumber,
            });
          }
        }
      }
    }
  }

  return flags;
}

// ─── Main Quality Check Function ───

/**
 * Run all quality checks on a generated guide's steps.
 * Returns flags, overall confidence, and whether the guide passes the quality gate.
 */
export function runQualityChecks(
  steps: GeneratedStep[],
  pdfPageCount: number,
  config: Partial<QualityCheckConfig> = {}
): QualityCheckResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Run all checks
  const flags: QualityFlag[] = [
    ...checkLowConfidenceSteps(steps, fullConfig),
    ...checkStepCountVsPdfPages(steps, pdfPageCount),
    ...checkStepSequence(steps),
    ...checkPartReferences(steps),
    ...checkToolCoverage(steps),
    ...checkInstructionQuality(steps),
    ...checkDuplicateSteps(steps),
    ...checkSafetyWarnings(steps),
    ...checkOrientationCoverage(steps),
    ...checkIllustrationCoverage(steps),
    ...checkConfidenceDistribution(steps, fullConfig),
    ...checkPartSequence(steps),
  ];

  // Calculate overall confidence
  const stepConfidences = steps.map((s) => s.confidence);
  const overallConfidence =
    stepConfidences.length > 0
      ? stepConfidences.reduce((a, b) => a + b, 0) / stepConfidences.length
      : 0;

  // Count by severity
  const errors = flags.filter((f) => f.severity === "error").length;
  const warnings = flags.filter((f) => f.severity === "warning").length;
  const info = flags.filter((f) => f.severity === "info").length;

  // Quality gate: no errors and confidence above threshold
  const passesQualityGate =
    errors === 0 && overallConfidence >= fullConfig.minOverallConfidence;

  return {
    flags,
    overallConfidence,
    passesQualityGate,
    summary: {
      totalChecks: flags.length,
      errors,
      warnings,
      info,
    },
  };
}
