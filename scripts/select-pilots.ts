/**
 * Script to select pilot products for AI guide generation.
 * Run with: npx tsx scripts/select-pilots.ts
 */
import { selectPilotProducts } from "../src/lib/ai/pilot-products";

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Guid.me — Pilot Product Selection");
  console.log("═══════════════════════════════════════════════════\n");
  console.log("Searching for 5 pilot products across categories...\n");

  const selection = await selectPilotProducts();

  console.log("\n───────────────────────────────────────────────────");
  console.log("  Selection Summary");
  console.log("───────────────────────────────────────────────────\n");

  if (selection.products.length === 0) {
    console.error("No pilot products found! Check database connectivity and data.");
    process.exit(1);
  }

  for (const [i, product] of selection.products.entries()) {
    console.log(`${i + 1}. ${product.productName}`);
    console.log(`   Article: ${product.articleNumber}`);
    console.log(`   Category: ${product.categoryPath ?? "N/A"}`);
    console.log(`   PDF Pages: ${product.pdfPageCount ?? "unknown"}`);
    console.log(`   Images: ${product.imageCount}`);
    console.log(`   PDF URL: ${product.assemblyPdfUrl}`);
    console.log();
  }

  console.log(`Selected ${selection.products.length}/5 pilot products`);
  console.log(`Criteria: ${selection.selectionCriteria}`);
  console.log(`Timestamp: ${selection.selectedAt}`);

  // Write selection to file for later use
  const fs = await import("fs");
  const outputPath = "scripts/pilot-selection.json";
  fs.writeFileSync(outputPath, JSON.stringify(selection, null, 2));
  console.log(`\nSelection saved to ${outputPath}`);
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
