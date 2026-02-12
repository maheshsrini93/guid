/**
 * Vision Model Benchmark: Gemini 2.5 Flash vs Gemini 2.5 Pro
 *
 * 20-page benchmark (5 manuals x 4 archetypes) to validate the all-Gemini
 * Flash-first + Pro-on-fail routing strategy.
 *
 * Archetypes per manual:
 *   1. Parts/fasteners legend — Part-ID mapping, quantities, tool icons
 *   2. Simple 1-action step — Baseline precision (orientation + arrow)
 *   3. Multi-panel step with rotation — Directionality, 3D inference, mirrored parts
 *   4. "Tricky" mechanism page — Hinges/drawer slides/cam locks, alignment, tighten/loosen cues
 *
 * Scoring rubric per page (0-10):
 *   - Orientation correctness (0-2)
 *   - Fastener correctness (0-2)
 *   - Action correctness (0-2)
 *   - Step completeness (0-2)
 *   - Hallucination penalty (subtract if invents parts/tools)
 *
 * Usage:
 *   npx tsx scripts/benchmark-vision.ts
 *
 * Requires:
 *   GEMINI_API_KEY in .env
 */

import { PrismaClient } from "@prisma/client";
import { extractSinglePage, getPdfPageCount } from "../src/lib/ai/pdf-extractor";
import {
  createVisionProvider,
  type VisionProvider,
} from "../src/lib/ai/vision-provider";
import { calculateCost } from "../src/lib/ai/cost-tracker";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

// ─── Config ───

/** Models to benchmark (all-Gemini strategy) */
const FLASH_MODEL = "gemini-2.5-flash";
const PRO_MODEL = "gemini-2.5-pro";

/** Page archetype labels */
type PageArchetype = "parts_legend" | "simple_step" | "multi_panel_rotation" | "tricky_mechanism";

const ARCHETYPE_LABELS: Record<PageArchetype, string> = {
  parts_legend: "Parts/Fasteners Legend",
  simple_step: "Simple 1-Action Step",
  multi_panel_rotation: "Multi-Panel w/ Rotation",
  tricky_mechanism: "Tricky Mechanism",
};

/** The analysis prompt — identical for both models for fair comparison */
const ANALYSIS_PROMPT = `You are analyzing a single page from an IKEA furniture assembly instruction PDF.

Extract the following information as structured JSON. Be as precise as possible about spatial details, screw types, and orientations.

{
  "pageType": "cover" | "parts_list" | "tools" | "assembly_step" | "multi_step" | "hardware_legend" | "other",
  "stepNumbers": [numbers shown on this page, if any],
  "partsListed": [
    {"partId": "letter/number shown in diagram", "description": "what the part looks like", "quantity": number}
  ],
  "actions": [
    {
      "stepNumber": number,
      "description": "Precise description of what the user should do — include direction, orientation, alignment",
      "partsUsed": [{"partId": "letter/number", "quantity": number, "description": "part description"}],
      "toolsNeeded": ["tool name with specifics (e.g. 'Phillips screwdriver', 'Allen key 4mm')"],
      "screwDirection": "clockwise" | "counter_clockwise" | "not_applicable",
      "fastenerType": "cam_lock" | "dowel" | "screw" | "bolt" | "nail" | "bracket" | "none" | "multiple",
      "orientation": "Which way parts face, which side is up, where holes align, any rotation needed",
      "spatialRelationship": "How parts relate to each other (e.g. 'Part A slides into Part B from the left')",
      "warnings": ["any safety or caution notes shown"],
      "hasMirroredStep": false,
      "rotationIndicator": "none" | "90deg" | "180deg" | "flip" | "custom"
    }
  ],
  "partCount": number,
  "hardwareVisible": ["list all hardware types: screws, dowels, cam locks, hinges, drawer slides, etc."],
  "arrowCount": number,
  "hasMultiplePanels": false,
  "panelCount": number,
  "confidence": 0.0 to 1.0,
  "ambiguities": ["list anything unclear or hard to interpret"]
}

Focus on precision for these critical areas:
- SCREW DIRECTION: Look at rotation arrows carefully — clockwise vs counter-clockwise matters
- CAM LOCKS: Note the arrow direction and how far to turn (quarter turn, half turn)
- PART ORIENTATION: Which side has pre-drilled holes, which face is smooth vs rough, grain direction
- FASTENER IDENTIFICATION: Distinguish Torx vs Phillips vs Allen, different screw lengths
- SPATIAL RELATIONSHIPS: "Insert from left", "align holes on top edge", etc.
- HINGE/DRAWER SLIDES: Note alignment marks, left vs right hand, mounting direction
- MIRRORED STEPS: Flag when a step must be repeated mirrored for the other side
- ARROW MEANINGS: Distinguish between "push here", "align here", "rotate this way", "this dimension"
- If something is ambiguous, note it in the ambiguities array and lower your confidence`;

// ─── Product Selection ───

interface BenchmarkProduct {
  productName: string;
  articleNumber: string;
  category: string;
  mechanism: string;
  pdfUrl: string;
  totalPages: number;
}

interface PageSelection {
  archetype: PageArchetype;
  pageNumber: number;
  rationale: string;
}

/**
 * Target 5 product categories that cover different assembly mechanisms.
 * Per implementation plan: bed frame, drawer unit, cabinet with hinges, chair, sofa/section
 */
const TARGET_PRODUCTS = [
  {
    label: "Bed frame",
    mechanism: "Large panels, cam locks, bed slat supports",
    pattern: "Bed frames",
  },
  {
    label: "Drawer unit",
    mechanism: "Drawer slides, runner alignment, multiple repeated steps",
    pattern: "Dressers",
  },
  {
    label: "Cabinet with hinges",
    mechanism: "Door hinges, hinge alignment, soft-close adjustment",
    pattern: "Cabinets",
  },
  {
    label: "Chair",
    mechanism: "Seat attachment, leg bolts, armrest assembly",
    pattern: "Chairs",
  },
  {
    label: "Shelf/Storage",
    mechanism: "Shelving pegs, wall anchoring, level adjustment",
    pattern: "Bookshelves",
  },
];

/**
 * Select 5 products with assembly PDFs — one per mechanism category.
 * Prioritize products with longer PDFs (more complex assembly = richer benchmark).
 */
async function selectBenchmarkProducts(): Promise<BenchmarkProduct[]> {
  const selected: BenchmarkProduct[] = [];

  for (const target of TARGET_PRODUCTS) {
    const products = await prisma.product.findMany({
      where: {
        documents: { some: { document_type: "assembly" } },
        category_path: { contains: target.pattern, mode: "insensitive" },
        assembly_required: true,
      },
      include: {
        documents: {
          where: { document_type: "assembly" },
          take: 1,
        },
      },
      orderBy: { review_count: "desc" },
      take: 5, // Get top 5 candidates, we'll pick the one with most pages
    });

    // Pick the product with the longest assembly PDF (more pages = more archetypes to choose from)
    let bestProduct = null;
    let bestPageCount = 0;

    for (const product of products) {
      if (!product.documents[0]?.source_url) continue;
      try {
        const pageCount = await getPdfPageCount(product.documents[0].source_url);
        if (pageCount > bestPageCount) {
          bestPageCount = pageCount;
          bestProduct = product;
        }
      } catch {
        continue;
      }
    }

    if (bestProduct?.documents[0]?.source_url) {
      selected.push({
        productName: bestProduct.product_name ?? "Unknown",
        articleNumber: bestProduct.article_number,
        category: target.label,
        mechanism: target.mechanism,
        pdfUrl: bestProduct.documents[0].source_url,
        totalPages: bestPageCount,
      });
    }
  }

  return selected;
}

/**
 * Select 4 pages per product covering the archetype spread.
 * Uses page-position heuristics based on typical IKEA PDF structure:
 *   - Page 1: Cover
 *   - Page 2-3: Safety warnings
 *   - Page 3-5: Parts list / hardware legend
 *   - Page 5+: Assembly steps (simple to complex)
 */
function selectPages(totalPages: number): PageSelection[] {
  const pages: PageSelection[] = [];

  // 1. Parts/fasteners legend — typically pages 3-4
  const partsPage = Math.min(3, totalPages);
  pages.push({
    archetype: "parts_legend",
    pageNumber: partsPage,
    rationale: `Page ${partsPage} — typically parts list/hardware legend area`,
  });

  // 2. Simple 1-action step — early assembly steps, around page 5-6
  const simplePage = Math.min(Math.max(5, Math.floor(totalPages * 0.25)), totalPages);
  pages.push({
    archetype: "simple_step",
    pageNumber: simplePage,
    rationale: `Page ${simplePage} — early assembly steps (25% through PDF)`,
  });

  // 3. Multi-panel step with rotation — mid-assembly, around 60% through
  const multiPage = Math.min(Math.max(7, Math.floor(totalPages * 0.6)), totalPages);
  pages.push({
    archetype: "multi_panel_rotation",
    pageNumber: multiPage,
    rationale: `Page ${multiPage} — mid-assembly (60% through PDF), likely multi-panel`,
  });

  // 4. Tricky mechanism — late assembly, around 80% through
  const trickyPage = Math.min(Math.max(9, Math.floor(totalPages * 0.8)), totalPages);
  pages.push({
    archetype: "tricky_mechanism",
    pageNumber: trickyPage,
    rationale: `Page ${trickyPage} — late assembly (80% through PDF), likely complex mechanism`,
  });

  // Ensure no duplicate pages
  const seen = new Set<number>();
  for (const page of pages) {
    while (seen.has(page.pageNumber) && page.pageNumber < totalPages) {
      page.pageNumber++;
    }
    seen.add(page.pageNumber);
  }

  return pages;
}

// ─── Benchmark Runner ───

interface ModelResult {
  model: string;
  response: string;
  parsed: Record<string, unknown> | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  confidence: number;
  arrowCount: number;
  partCount: number;
  hasMultiplePanels: boolean;
  ambiguityCount: number;
  error?: string;
}

interface PageBenchmark {
  product: BenchmarkProduct;
  archetype: PageArchetype;
  pageNumber: number;
  rationale: string;
  flash: ModelResult;
  pro: ModelResult;
}

function parseModelResponse(response: string): Record<string, unknown> | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // not parseable
  }
  return null;
}

async function runModel(
  provider: VisionProvider,
  imageBuffer: Buffer,
  mimeType: "image/png" | "image/jpeg"
): Promise<ModelResult> {
  const start = Date.now();
  try {
    const response = await provider.analyzeImage({
      image: imageBuffer,
      mimeType,
      prompt: ANALYSIS_PROMPT,
      maxTokens: 4096,
    });

    const parsed = parseModelResponse(response.content);

    return {
      model: provider.model,
      response: response.content,
      parsed,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      costUsd: calculateCost(
        provider.model,
        response.usage.inputTokens,
        response.usage.outputTokens
      ),
      latencyMs: Date.now() - start,
      confidence: (parsed?.confidence as number) ?? 0,
      arrowCount: (parsed?.arrowCount as number) ?? 0,
      partCount: (parsed?.partCount as number) ?? 0,
      hasMultiplePanels: (parsed?.hasMultiplePanels as boolean) ?? false,
      ambiguityCount: (parsed?.ambiguities as unknown[])?.length ?? 0,
    };
  } catch (err) {
    return {
      model: provider.model,
      response: "",
      parsed: null,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      latencyMs: Date.now() - start,
      confidence: 0,
      arrowCount: 0,
      partCount: 0,
      hasMultiplePanels: false,
      ambiguityCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Escalation Trigger Analysis ───

interface EscalationAnalysis {
  shouldEscalate: boolean;
  triggers: string[];
}

/**
 * Analyze Flash results to determine if Pro escalation would be triggered.
 * Based on the 5 escalation triggers from implementation-plan.md:
 *   1. Multiple arrows/overlays in one panel
 *   2. Hinge/drawer-slide alignment, rotation, or mirrored steps
 *   3. Fastener ambiguity (Torx vs Philips; "tight vs loose")
 *   4. Low confidence or self-reported uncertainty
 *   5. Flash <-> rule-checker disagreement
 */
function analyzeEscalationTriggers(result: ModelResult): EscalationAnalysis {
  const triggers: string[] = [];

  // Trigger 1: Multiple arrows/overlays (raised from >=3 to >=5 based on benchmark —
  // most IKEA pages have 3-4 arrows normally; >=5 captures genuinely complex panels)
  if (result.arrowCount >= 5) {
    triggers.push(`Multiple arrows (${result.arrowCount}) in panel`);
  }

  // Trigger 2: Hinge/drawer-slide/rotation/mirrored
  if (result.parsed) {
    const actions = (result.parsed.actions as Array<Record<string, unknown>>) ?? [];
    for (const action of actions) {
      if (action.hasMirroredStep) {
        triggers.push("Mirrored step detected");
      }
      if (action.rotationIndicator && action.rotationIndicator !== "none") {
        triggers.push(`Rotation indicator: ${action.rotationIndicator}`);
      }
      const fastener = String(action.fastenerType ?? "");
      if (fastener === "cam_lock" || fastener === "multiple") {
        triggers.push(`Complex fastener: ${fastener}`);
      }
    }
    const hardware = (result.parsed.hardwareVisible as string[]) ?? [];
    const hasHinge = hardware.some((h) => /hinge/i.test(h));
    const hasDrawerSlide = hardware.some((h) => /drawer.?slide|runner/i.test(h));
    if (hasHinge) triggers.push("Hinge hardware detected");
    if (hasDrawerSlide) triggers.push("Drawer slide/runner detected");
  }

  // Trigger 3: Fastener ambiguity
  if (result.ambiguityCount > 0) {
    const ambiguities = (result.parsed?.ambiguities as string[]) ?? [];
    const fastenerAmbiguity = ambiguities.some(
      (a) => /screw|fastener|torx|phillips|allen|bolt/i.test(a)
    );
    if (fastenerAmbiguity) {
      triggers.push("Fastener ambiguity in self-reported uncertainties");
    }
  }

  // Trigger 4: Low confidence
  if (result.confidence < 0.7) {
    triggers.push(`Low confidence: ${result.confidence.toFixed(2)}`);
  }

  // Trigger 5: JSON parse failure (Flash returned non-parseable output)
  if (!result.parsed && !result.error) {
    triggers.push("Failed to produce valid JSON");
  }

  // Trigger 6: Rule-checker disagreement — can't be tested in isolation
  // (needs the full pipeline with rule checking)

  return {
    shouldEscalate: triggers.length > 0,
    triggers,
  };
}

// ─── Report Generation ───

function generateReport(benchmarks: PageBenchmark[]): string {
  const lines: string[] = [];
  const divider = "=".repeat(80);
  const thinDivider = "-".repeat(80);

  lines.push(divider);
  lines.push("  VISION MODEL BENCHMARK: Gemini 2.5 Flash vs Gemini 2.5 Pro");
  lines.push("  20-Page IKEA Assembly PDF Analysis (5 manuals x 4 archetypes)");
  lines.push(`  Date: ${new Date().toISOString()}`);
  lines.push(divider);
  lines.push("");

  // ─── Per-page results ───
  let currentProduct = "";
  for (const bm of benchmarks) {
    if (bm.product.articleNumber !== currentProduct) {
      currentProduct = bm.product.articleNumber;
      lines.push(thinDivider);
      lines.push(`  ${bm.product.productName} (${bm.product.articleNumber})`);
      lines.push(`  Category: ${bm.product.category} | Mechanism: ${bm.product.mechanism}`);
      lines.push(`  PDF: ${bm.product.totalPages} pages`);
      lines.push(thinDivider);
    }

    lines.push("");
    lines.push(`  [Page ${bm.pageNumber}] ${ARCHETYPE_LABELS[bm.archetype]}`);
    lines.push(`  Rationale: ${bm.rationale}`);
    lines.push("");

    for (const [label, result] of [
      ["FLASH", bm.flash],
      ["PRO  ", bm.pro],
    ] as const) {
      const status = result.error ? `ERROR: ${result.error}` : "OK";
      lines.push(`    ${label} (${result.model})`);
      lines.push(`      Status:      ${status}`);
      lines.push(`      Latency:     ${(result.latencyMs / 1000).toFixed(1)}s`);
      lines.push(
        `      Tokens:      ${result.inputTokens} in / ${result.outputTokens} out`
      );
      lines.push(`      Cost:        $${result.costUsd.toFixed(4)}`);
      lines.push(`      Confidence:  ${result.confidence.toFixed(2)}`);
      lines.push(`      JSON Valid:  ${result.parsed ? "Yes" : "No"}`);
      lines.push(
        `      Parts:       ${result.partCount} | Arrows: ${result.arrowCount} | Multi-panel: ${result.hasMultiplePanels}`
      );

      if (result.ambiguityCount > 0 && result.parsed?.ambiguities) {
        const ambiguities = result.parsed.ambiguities as string[];
        lines.push(`      Ambiguities: ${ambiguities.join("; ")}`);
      }

      if (result.parsed?.actions) {
        const actions = result.parsed.actions as Array<Record<string, unknown>>;
        for (const action of actions.slice(0, 3)) {
          const desc = String(action.description ?? "").substring(0, 90);
          lines.push(`      -> Step ${action.stepNumber}: ${desc}...`);
          if (action.screwDirection && action.screwDirection !== "not_applicable") {
            lines.push(`         Screw: ${action.screwDirection} | Fastener: ${action.fastenerType}`);
          }
          if (action.orientation) {
            lines.push(`         Orient: ${String(action.orientation).substring(0, 90)}...`);
          }
        }
        if (actions.length > 3) {
          lines.push(`      ... and ${actions.length - 3} more actions`);
        }
      }
      lines.push("");
    }

    // Escalation analysis
    const escalation = analyzeEscalationTriggers(bm.flash);
    lines.push(`    ESCALATION ANALYSIS (based on Flash result):`);
    lines.push(`      Would escalate to Pro: ${escalation.shouldEscalate ? "YES" : "NO"}`);
    if (escalation.triggers.length > 0) {
      lines.push(`      Triggers: ${escalation.triggers.join("; ")}`);
    }

    // Quality comparison
    const flashConf = bm.flash.confidence;
    const proConf = bm.pro.confidence;
    const confDiff = proConf - flashConf;
    lines.push("");
    lines.push(`    COMPARISON:`);
    lines.push(
      `      Confidence delta (Pro - Flash): ${confDiff > 0 ? "+" : ""}${confDiff.toFixed(2)}`
    );
    lines.push(
      `      Cost ratio (Pro / Flash): ${bm.flash.costUsd > 0 ? (bm.pro.costUsd / bm.flash.costUsd).toFixed(1) : "N/A"}x`
    );
    lines.push(
      `      Latency ratio (Pro / Flash): ${bm.flash.latencyMs > 0 ? (bm.pro.latencyMs / bm.flash.latencyMs).toFixed(1) : "N/A"}x`
    );

    // Scoring template (for manual review)
    lines.push("");
    lines.push(`    MANUAL SCORING (fill in after review):`);
    lines.push(`      ┌──────────────────────┬───────┬─────┐`);
    lines.push(`      │ Criterion (0-2)      │ Flash │ Pro │`);
    lines.push(`      ├──────────────────────┼───────┼─────┤`);
    lines.push(`      │ Orientation correct.  │  __   │ __  │`);
    lines.push(`      │ Fastener correctness  │  __   │ __  │`);
    lines.push(`      │ Action correctness    │  __   │ __  │`);
    lines.push(`      │ Step completeness     │  __   │ __  │`);
    lines.push(`      │ Hallucination penalty │  __   │ __  │`);
    lines.push(`      ├──────────────────────┼───────┼─────┤`);
    lines.push(`      │ TOTAL (0-10)         │  __   │ __  │`);
    lines.push(`      └──────────────────────┴───────┴─────┘`);
    lines.push("");
  }

  // ─── Summary Statistics ───
  lines.push(divider);
  lines.push("  AGGREGATE SUMMARY");
  lines.push(divider);

  const flashResults = benchmarks.map((b) => b.flash).filter((r) => !r.error);
  const proResults = benchmarks.map((b) => b.pro).filter((r) => !r.error);
  const flashErrors = benchmarks.filter((b) => b.flash.error);
  const proErrors = benchmarks.filter((b) => b.pro.error);

  const avg = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  lines.push("");
  lines.push(`  ┌───────────────────────┬────────────────┬────────────────┐`);
  lines.push(`  │ Metric                │ Gemini 2.5     │ Gemini 2.5     │`);
  lines.push(`  │                       │ Flash          │ Pro            │`);
  lines.push(`  ├───────────────────────┼────────────────┼────────────────┤`);
  lines.push(
    `  │ Success rate          │ ${flashResults.length}/${benchmarks.length} pages     │ ${proResults.length}/${benchmarks.length} pages     │`
  );
  lines.push(
    `  │ Errors                │ ${flashErrors.length}              │ ${proErrors.length}              │`
  );
  lines.push(
    `  │ Avg latency           │ ${(avg(flashResults.map((r) => r.latencyMs)) / 1000).toFixed(1)}s           │ ${(avg(proResults.map((r) => r.latencyMs)) / 1000).toFixed(1)}s           │`
  );
  lines.push(
    `  │ Total cost            │ $${flashResults.reduce((s, r) => s + r.costUsd, 0).toFixed(4)}        │ $${proResults.reduce((s, r) => s + r.costUsd, 0).toFixed(4)}        │`
  );
  lines.push(
    `  │ Avg cost/page         │ $${avg(flashResults.map((r) => r.costUsd)).toFixed(4)}        │ $${avg(proResults.map((r) => r.costUsd)).toFixed(4)}        │`
  );
  lines.push(
    `  │ Avg confidence        │ ${avg(flashResults.map((r) => r.confidence)).toFixed(2)}            │ ${avg(proResults.map((r) => r.confidence)).toFixed(2)}            │`
  );
  lines.push(
    `  │ JSON parse rate       │ ${flashResults.filter((r) => r.parsed).length}/${flashResults.length}             │ ${proResults.filter((r) => r.parsed).length}/${proResults.length}             │`
  );
  lines.push(`  └───────────────────────┴────────────────┴────────────────┘`);

  // Escalation statistics
  const escalations = benchmarks.map((b) => analyzeEscalationTriggers(b.flash));
  const escalatedCount = escalations.filter((e) => e.shouldEscalate).length;

  lines.push("");
  lines.push(`  ESCALATION TRIGGER STATISTICS:`);
  lines.push(
    `    Pages that would trigger Pro escalation: ${escalatedCount}/${benchmarks.length} (${((escalatedCount / benchmarks.length) * 100).toFixed(0)}%)`
  );

  // Count trigger types
  const triggerCounts = new Map<string, number>();
  for (const e of escalations) {
    for (const t of e.triggers) {
      const key = t.split(":")[0].split("(")[0].trim();
      triggerCounts.set(key, (triggerCounts.get(key) ?? 0) + 1);
    }
  }
  if (triggerCounts.size > 0) {
    lines.push(`    Trigger breakdown:`);
    for (const [trigger, count] of [...triggerCounts.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`      - ${trigger}: ${count} pages`);
    }
  }

  // By archetype
  lines.push("");
  lines.push(`  RESULTS BY ARCHETYPE:`);
  for (const archetype of Object.keys(ARCHETYPE_LABELS) as PageArchetype[]) {
    const archetypeBms = benchmarks.filter((b) => b.archetype === archetype);
    const flashAvgConf = avg(archetypeBms.map((b) => b.flash.confidence));
    const proAvgConf = avg(archetypeBms.map((b) => b.pro.confidence));
    const escRate = archetypeBms.filter((b) => analyzeEscalationTriggers(b.flash).shouldEscalate).length;
    lines.push(
      `    ${ARCHETYPE_LABELS[archetype]}: Flash conf=${flashAvgConf.toFixed(2)}, Pro conf=${proAvgConf.toFixed(2)}, Escalation: ${escRate}/${archetypeBms.length}`
    );
  }

  // Cost projection
  lines.push("");
  lines.push(`  COST PROJECTION (2,800 products, ~20 pages each = ~56,000 pages):`);
  const flashCostPerPage = avg(flashResults.map((r) => r.costUsd));
  const proCostPerPage = avg(proResults.map((r) => r.costUsd));
  const flashOnlyTotal = flashCostPerPage * 56000;
  const proOnlyTotal = proCostPerPage * 56000;
  const hybridTotal =
    flashCostPerPage * 56000 * (1 - escalatedCount / benchmarks.length) +
    proCostPerPage * 56000 * (escalatedCount / benchmarks.length);
  lines.push(`    Flash-only (all pages):    $${flashOnlyTotal.toFixed(2)}`);
  lines.push(`    Pro-only (all pages):      $${proOnlyTotal.toFixed(2)}`);
  lines.push(
    `    Hybrid (Flash + Pro escal): $${hybridTotal.toFixed(2)} (${((escalatedCount / benchmarks.length) * 100).toFixed(0)}% Pro usage)`
  );

  lines.push("");
  lines.push(divider);
  lines.push("  SCORING GUIDE");
  lines.push(divider);
  lines.push("");
  lines.push("  Per page, score each model 0-10:");
  lines.push("    Orientation correctness (0-2): Parts face correct direction, holes align");
  lines.push("    Fastener correctness (0-2):    Right screw type, direction, cam lock turn");
  lines.push("    Action correctness (0-2):      Step description matches the diagram");
  lines.push("    Step completeness (0-2):       All visible actions captured, no omissions");
  lines.push("    Hallucination penalty:         Subtract 1 per invented part/tool/step");
  lines.push("");
  lines.push("  Total score across 20 pages: 0-200 per model");
  lines.push("");
  lines.push(`  MANUAL SCORE TOTALS (fill in after review):`);
  lines.push(`    Flash total: ___/200`);
  lines.push(`    Pro total:   ___/200`);
  lines.push("");
  lines.push(divider);

  return lines.join("\n");
}

// ─── Main ───

async function main() {
  console.log("Vision Model Benchmark: Gemini 2.5 Flash vs Gemini 2.5 Pro");
  console.log("20-page benchmark (5 manuals x 4 archetypes)\n");

  // Check API key
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey === "YOUR_GEMINI_API_KEY_HERE" || geminiKey === "") {
    console.error("ERROR: GEMINI_API_KEY not set in .env");
    console.error("Get a key at: https://aistudio.google.com/apikey");
    process.exit(1);
  }

  // Create providers (both Gemini, different models)
  const flash = createVisionProvider({
    provider: "gemini",
    model: FLASH_MODEL,
    apiKey: geminiKey,
    temperature: 0.1,
  });

  const pro = createVisionProvider({
    provider: "gemini",
    model: PRO_MODEL,
    apiKey: geminiKey,
    temperature: 0.1,
  });

  // Select products
  console.log("Selecting 5 products with assembly PDFs (one per mechanism)...\n");
  const products = await selectBenchmarkProducts();

  if (products.length === 0) {
    console.error("ERROR: No products found with assembly PDFs. Check database connection.");
    process.exit(1);
  }

  console.log(`Selected ${products.length} products:\n`);
  for (const p of products) {
    console.log(
      `  - ${p.productName} (${p.articleNumber}) [${p.category}] ${p.totalPages} pages`
    );
  }
  console.log("");

  // Run benchmarks
  const benchmarks: PageBenchmark[] = [];
  let pageNum = 0;
  const totalPages = products.reduce((s, p) => s + 4, 0); // 4 pages per product

  for (const product of products) {
    const pages = selectPages(product.totalPages);
    console.log(`\n--- ${product.productName} (${product.articleNumber}) ---`);

    for (const page of pages) {
      pageNum++;
      console.log(
        `\n[${pageNum}/${totalPages}] ${ARCHETYPE_LABELS[page.archetype]} (page ${page.pageNumber}/${product.totalPages})`
      );

      try {
        // Extract the page image
        const extracted = await extractSinglePage(product.pdfUrl, page.pageNumber);
        console.log(
          `  Extracted: ${extracted.width}x${extracted.height}, ${(extracted.imageBuffer.length / 1024).toFixed(0)}KB`
        );

        // Run Flash
        console.log(`  Running Flash (${FLASH_MODEL})...`);
        const flashResult = await runModel(flash, extracted.imageBuffer, extracted.mimeType);
        console.log(
          `    ${flashResult.error ? "ERROR: " + flashResult.error : "OK"} | ${(flashResult.latencyMs / 1000).toFixed(1)}s | $${flashResult.costUsd.toFixed(4)} | conf=${flashResult.confidence.toFixed(2)}`
        );

        // Delay between models (share the same Gemini rate limit)
        await new Promise((r) => setTimeout(r, 4000));

        // Run Pro
        console.log(`  Running Pro (${PRO_MODEL})...`);
        const proResult = await runModel(pro, extracted.imageBuffer, extracted.mimeType);
        console.log(
          `    ${proResult.error ? "ERROR: " + proResult.error : "OK"} | ${(proResult.latencyMs / 1000).toFixed(1)}s | $${proResult.costUsd.toFixed(4)} | conf=${proResult.confidence.toFixed(2)}`
        );

        benchmarks.push({
          product,
          archetype: page.archetype,
          pageNumber: page.pageNumber,
          rationale: page.rationale,
          flash: flashResult,
          pro: proResult,
        });

        // Escalation check
        const escalation = analyzeEscalationTriggers(flashResult);
        if (escalation.shouldEscalate) {
          console.log(`    -> Would escalate to Pro: ${escalation.triggers.join("; ")}`);
        }
      } catch (err) {
        console.log(
          `  SKIP: ${err instanceof Error ? err.message : String(err)}`
        );
      }

      // Rate limit delay between pages
      await new Promise((r) => setTimeout(r, 4000));
    }
  }

  // Generate and save report
  const report = generateReport(benchmarks);
  const reportPath = path.resolve(
    __dirname,
    `../benchmark-report-gemini25-${new Date().toISOString().split("T")[0]}.txt`
  );
  fs.writeFileSync(reportPath, report);

  console.log("\n" + report);
  console.log(`\nReport saved to: ${reportPath}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
