/**
 * Script to generate AI assembly guides for all pilot products.
 * Run with: npx tsx scripts/generate-pilots.ts [--dry-run] [--skip-illustrations] [--select-first]
 *
 * Options:
 *   --dry-run             Only generate illustration prompts, don't call image API
 *   --skip-illustrations  Skip illustration generation entirely (text-only)
 *   --select-first        Run pilot selection before generation (if no pilot-selection.json exists)
 */
import * as fs from "fs";
import * as path from "path";
import { generateGuideForProduct } from "../src/lib/ai/generate-guide";
import { selectPilotProducts } from "../src/lib/ai/pilot-products";
import type { PilotSelection } from "../src/lib/ai/pilot-products";
import type { GeneratedGuide } from "../src/lib/ai/types";

interface PilotResult {
  articleNumber: string;
  productName: string;
  success: boolean;
  guide?: {
    title: string;
    stepCount: number;
    difficulty: string;
    estimatedTimeMinutes: number;
    overallConfidence: number;
    qualityFlags: { errors: number; warnings: number; info: number };
    passesQualityGate: boolean;
  };
  error?: string;
  processingTimeMs: number;
  costEstimate?: string;
}

async function loadOrSelectPilots(selectFirst: boolean): Promise<PilotSelection> {
  const selectionPath = path.join(__dirname, "pilot-selection.json");

  if (fs.existsSync(selectionPath) && !selectFirst) {
    console.log("Loading existing pilot selection from pilot-selection.json...\n");
    return JSON.parse(fs.readFileSync(selectionPath, "utf-8"));
  }

  console.log("Running pilot product selection...\n");
  const selection = await selectPilotProducts();
  fs.writeFileSync(selectionPath, JSON.stringify(selection, null, 2));
  return selection;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const skipIllustrations = args.includes("--skip-illustrations");
  const selectFirst = args.includes("--select-first");

  console.log("═══════════════════════════════════════════════════");
  console.log("  Guid.me — Pilot Guide Generation");
  console.log("═══════════════════════════════════════════════════\n");

  if (dryRun) console.log("  Mode: DRY RUN (illustration prompts only)\n");
  if (skipIllustrations) console.log("  Mode: SKIP ILLUSTRATIONS (text-only)\n");

  // Load or select pilot products
  const selection = await loadOrSelectPilots(selectFirst);

  if (selection.products.length === 0) {
    console.error("No pilot products found! Run select-pilots.ts first.");
    process.exit(1);
  }

  console.log(`Found ${selection.products.length} pilot products.\n`);

  // Create output directory
  const outputDir = path.join(__dirname, "pilot-results");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results: PilotResult[] = [];
  const overallStart = Date.now();

  for (const [i, pilot] of selection.products.entries()) {
    console.log("───────────────────────────────────────────────────");
    console.log(`  [${i + 1}/${selection.products.length}] ${pilot.productName}`);
    console.log(`  Article: ${pilot.articleNumber} | PDF: ${pilot.pdfPageCount ?? "?"} pages`);
    console.log("───────────────────────────────────────────────────\n");

    const startTime = Date.now();

    try {
      const guide: GeneratedGuide = await generateGuideForProduct(pilot.id, {
        skipJobRecord: false,
        skipIllustrations: skipIllustrations || undefined,
        illustrationDryRun: dryRun || undefined,
        pdfUrlOverride: pilot.assemblyPdfUrl,
      });

      const elapsed = Date.now() - startTime;

      // Count quality flag severities
      const errors = guide.qualityFlags.filter((f) => f.severity === "error").length;
      const warnings = guide.qualityFlags.filter((f) => f.severity === "warning").length;
      const info = guide.qualityFlags.filter((f) => f.severity === "info").length;

      const result: PilotResult = {
        articleNumber: pilot.articleNumber,
        productName: pilot.productName,
        success: true,
        guide: {
          title: guide.title,
          stepCount: guide.steps.length,
          difficulty: guide.difficulty,
          estimatedTimeMinutes: guide.estimatedTimeMinutes,
          overallConfidence: guide.overallConfidence,
          qualityFlags: { errors, warnings, info },
          passesQualityGate: errors === 0 && guide.overallConfidence >= 0.6,
        },
        processingTimeMs: elapsed,
        costEstimate: `${guide.metadata.processingTimeMs}ms processing`,
      };

      results.push(result);

      // Save full guide as JSON
      const guideFileName = `guide-${pilot.articleNumber}.json`;
      fs.writeFileSync(
        path.join(outputDir, guideFileName),
        JSON.stringify(guide, null, 2)
      );

      console.log(`  ✓ Generated: ${guide.steps.length} steps, ${guide.difficulty} difficulty`);
      console.log(`  ✓ Confidence: ${(guide.overallConfidence * 100).toFixed(1)}%`);
      console.log(`  ✓ Quality: ${errors} errors, ${warnings} warnings, ${info} info`);
      console.log(`  ✓ Time: ${(elapsed / 1000).toFixed(1)}s`);
      console.log(`  ✓ Saved to ${guideFileName}\n`);
    } catch (error) {
      const elapsed = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      results.push({
        articleNumber: pilot.articleNumber,
        productName: pilot.productName,
        success: false,
        error: errorMsg,
        processingTimeMs: elapsed,
      });

      console.error(`  ✗ FAILED: ${errorMsg}`);
      console.error(`  ✗ Time: ${(elapsed / 1000).toFixed(1)}s\n`);
    }
  }

  // Summary
  const totalTime = Date.now() - overallStart;
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Generation Summary");
  console.log("═══════════════════════════════════════════════════\n");

  console.log(`  Total: ${results.length} products`);
  console.log(`  Success: ${successful.length}`);
  console.log(`  Failed: ${failed.length}`);
  console.log(`  Total time: ${(totalTime / 1000).toFixed(1)}s\n`);

  if (successful.length > 0) {
    const avgConfidence =
      successful.reduce((sum, r) => sum + (r.guide?.overallConfidence ?? 0), 0) /
      successful.length;
    const avgSteps =
      successful.reduce((sum, r) => sum + (r.guide?.stepCount ?? 0), 0) /
      successful.length;
    const passingGate = successful.filter((r) => r.guide?.passesQualityGate).length;

    console.log(`  Avg confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    console.log(`  Avg steps: ${avgSteps.toFixed(1)}`);
    console.log(`  Passing quality gate: ${passingGate}/${successful.length}`);
  }

  if (failed.length > 0) {
    console.log("\n  Failed products:");
    for (const f of failed) {
      console.log(`    - ${f.productName}: ${f.error}`);
    }
  }

  // Save summary
  const summaryPath = path.join(outputDir, "summary.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        options: { dryRun, skipIllustrations },
        totalTimeMs: totalTime,
        results,
      },
      null,
      2
    )
  );
  console.log(`\n  Full results saved to ${summaryPath}`);
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../src/lib/prisma");
    await prisma.$disconnect();
  });
