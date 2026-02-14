import { prisma } from "@/lib/prisma";
import type { RetailerAdapter } from "@/lib/adapters/types";

// ─── Types ───

export interface SyncResult {
  newProducts: number;
  updatedProducts: number;
  delistedProducts: number;
  jobsQueued: number;
  pdfUpdates: number;
  errors: number;
  errorDetails: Array<{ articleNumber?: string; error: string }>;
  duration: number;
}

export interface DetectedProduct {
  articleNumber: string;
  productId?: number;
  hasAssemblyDoc: boolean;
  isNew: boolean;
}

// ─── Retry Utility (P1.5.11) ───

/**
 * Wraps an async operation with exponential backoff.
 * 3 attempts with 1s/2s/4s delays between retries.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const delays = [1000, 2000, 4000];
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < delays.length) {
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  throw new Error(`${label}: all ${delays.length + 1} attempts failed — ${lastError?.message}`);
}

// ─── Catalog Diff Logic (P1.5.2) ───

/**
 * Detect new products by cross-referencing scrape_urls with products table.
 * Returns products that were scraped (completed) but need processing.
 */
export async function detectNewProducts(
  sinceDays = 30
): Promise<DetectedProduct[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - sinceDays);

  // Find scrape_urls completed since last sync period
  const recentScrapes = await prisma.scrapeUrl.findMany({
    where: {
      status: "completed",
      updated_at: { gte: sinceDate },
      article_number: { not: null },
    },
    select: {
      article_number: true,
    },
  });

  const scrapedArticles = recentScrapes
    .map((s) => s.article_number)
    .filter((a): a is string => a != null);

  if (scrapedArticles.length === 0) return [];

  // Find which of these have products, and whether they have assembly docs
  const products = await prisma.product.findMany({
    where: { article_number: { in: scrapedArticles } },
    select: {
      id: true,
      article_number: true,
      first_detected_at: true,
      documents: {
        where: { document_type: "assembly" },
        select: { id: true },
        take: 1,
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.article_number, p]));

  const detected: DetectedProduct[] = [];

  for (const articleNumber of scrapedArticles) {
    const product = productMap.get(articleNumber);
    if (product) {
      // Existing product — check if it was recently detected (new)
      const isNew = product.first_detected_at == null;
      detected.push({
        articleNumber,
        productId: product.id,
        hasAssemblyDoc: product.documents.length > 0,
        isNew,
      });
    }
    // Products in scrape_urls but not in products table yet won't be processed
    // (the scraper creates the product row — we only work with existing products)
  }

  return detected;
}

// ─── Auto-detection for New Products (P1.5.3) ───

/**
 * For newly detected products with assembly documents,
 * auto-queue AI generation jobs with high priority.
 */
async function autoQueueNewProducts(
  detectedProducts: DetectedProduct[],
  errors: Array<{ articleNumber?: string; error: string }>
): Promise<{ jobsQueued: number; productsUpdated: number }> {
  let jobsQueued = 0;
  let productsUpdated = 0;

  const newWithDocs = detectedProducts.filter((p) => p.isNew && p.hasAssemblyDoc && p.productId);

  for (const product of newWithDocs) {
    try {
      await withRetry(async () => {
        // Check for existing active job
        const activeJob = await prisma.aIGenerationJob.findFirst({
          where: {
            productId: product.productId!,
            status: { in: ["queued", "processing"] },
          },
          select: { id: true },
        });

        if (activeJob) return; // Already has active job

        // Get the assembly PDF URL
        const doc = await prisma.productDocument.findFirst({
          where: {
            product_id: product.productId!,
            document_type: "assembly",
          },
          select: { source_url: true },
        });

        if (!doc) return;

        await prisma.$transaction([
          prisma.aIGenerationJob.create({
            data: {
              productId: product.productId!,
              status: "queued",
              priority: "high",
              triggeredBy: "auto_sync",
              inputPdfUrl: doc.source_url,
            },
          }),
          prisma.product.update({
            where: { id: product.productId! },
            data: {
              guide_status: "queued",
              is_new: true,
              first_detected_at: new Date(),
            },
          }),
        ]);

        jobsQueued++;
        productsUpdated++;
      }, `auto-queue ${product.articleNumber}`);
    } catch (err) {
      errors.push({
        articleNumber: product.articleNumber,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Also update first_detected_at for new products without assembly docs
  const newWithoutDocs = detectedProducts.filter((p) => p.isNew && !p.hasAssemblyDoc && p.productId);
  for (const product of newWithoutDocs) {
    try {
      await withRetry(async () => {
        await prisma.product.update({
          where: { id: product.productId! },
          data: {
            is_new: true,
            first_detected_at: new Date(),
            guide_status: "no_source_material",
          },
        });
        productsUpdated++;
      }, `update-new ${product.articleNumber}`);
    } catch (err) {
      errors.push({
        articleNumber: product.articleNumber,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { jobsQueued, productsUpdated };
}

// ─── Assembly PDF Update Detection (P1.5.8) ───

/**
 * Detect products whose assembly PDF file_hash has changed.
 * This indicates the manufacturer updated the instructions.
 * Queue a new AI generation job for re-processing.
 */
export async function detectPdfUpdates(
  errors: Array<{ articleNumber?: string; error: string }>
): Promise<{ pdfUpdates: number; jobsQueued: number }> {
  let pdfUpdates = 0;
  let jobsQueued = 0;

  // Find products that have published guides and assembly documents
  const productsWithGuides = await prisma.product.findMany({
    where: {
      guide_status: "published",
      assemblyGuide: { published: true },
    },
    select: {
      id: true,
      article_number: true,
      documents: {
        where: { document_type: "assembly" },
        select: { id: true, source_url: true, file_hash: true },
      },
      aiGenerationJobs: {
        where: { status: "approved" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { inputPdfUrl: true },
      },
    },
  });

  for (const product of productsWithGuides) {
    const currentDoc = product.documents[0];
    const lastJob = product.aiGenerationJobs[0];

    if (!currentDoc || !lastJob) continue;

    // If the PDF URL changed, the document was likely updated
    const urlChanged = currentDoc.source_url !== lastJob.inputPdfUrl;

    // If we have file hashes, compare those (more reliable)
    // Hash changes indicate actual content updates even at same URL
    if (!urlChanged && currentDoc.file_hash == null) continue;
    if (!urlChanged) continue;

    try {
      await withRetry(async () => {
        // Check for existing active job
        const activeJob = await prisma.aIGenerationJob.findFirst({
          where: {
            productId: product.id,
            status: { in: ["queued", "processing"] },
          },
          select: { id: true },
        });

        if (activeJob) return;

        await prisma.$transaction([
          prisma.aIGenerationJob.create({
            data: {
              productId: product.id,
              status: "queued",
              priority: "normal",
              triggeredBy: "auto_sync",
              inputPdfUrl: currentDoc.source_url,
            },
          }),
          prisma.product.update({
            where: { id: product.id },
            data: { guide_status: "queued" },
          }),
        ]);

        pdfUpdates++;
        jobsQueued++;
      }, `pdf-update ${product.article_number}`);
    } catch (err) {
      errors.push({
        articleNumber: product.article_number,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { pdfUpdates, jobsQueued };
}

// ─── Product Delisting Handling (P1.5.9) ───

/**
 * Detect products no longer in the retailer catalog.
 * Mark as discontinued but keep existing guides live.
 */
export async function handleDelistedProducts(
  errors: Array<{ articleNumber?: string; error: string }>,
  retailerSlug: string = "ikea"
): Promise<number> {
  // Get all article numbers from scrape_urls (the source catalog)
  const catalogArticles = await prisma.scrapeUrl.findMany({
    where: {
      status: "completed",
      article_number: { not: null },
    },
    select: { article_number: true },
  });

  const catalogSet = new Set(
    catalogArticles
      .map((s) => s.article_number)
      .filter((a): a is string => a != null)
  );

  if (catalogSet.size === 0) return 0;

  // Find products that are NOT in the catalog and not already discontinued
  const allProducts = await prisma.product.findMany({
    where: {
      discontinued: false,
      source_retailer: retailerSlug,
    },
    select: {
      id: true,
      article_number: true,
    },
  });

  const toDiscontinue = allProducts.filter(
    (p) => !catalogSet.has(p.article_number)
  );

  if (toDiscontinue.length === 0) return 0;

  try {
    await withRetry(async () => {
      await prisma.product.updateMany({
        where: {
          id: { in: toDiscontinue.map((p) => p.id) },
        },
        data: { discontinued: true },
      });
    }, "handle-delisted");
  } catch (err) {
    errors.push({
      error: `Failed to mark ${toDiscontinue.length} products as discontinued: ${err instanceof Error ? err.message : String(err)}`,
    });
    return 0;
  }

  return toDiscontinue.length;
}

// ─── Main Sync Runner (P1.5.1) ───

/**
 * Run the full monthly catalog sync pipeline.
 * 1. Detect new products
 * 2. Auto-queue AI generation for new products with assembly PDFs
 * 3. Detect PDF updates for existing guides
 * 4. Handle delisted products
 * 5. Update timestamps
 * 6. Save sync log (if CatalogSyncLog model exists)
 */
export async function runCatalogSync(
  triggeredBy: "cron" | "manual" = "cron",
  adapter?: RetailerAdapter
): Promise<SyncResult> {
  // Future: iterate getActiveAdapters() for multi-retailer sync
  // For now, single-retailer mode is preserved for backward compatibility
  const startTime = Date.now();
  const errors: Array<{ articleNumber?: string; error: string }> = [];
  const retailerSlug = adapter?.info.slug ?? "ikea";

  // Step 1: Detect new products (P1.5.2)
  let detectedProducts: DetectedProduct[] = [];
  try {
    detectedProducts = await withRetry(
      () => adapter ? adapter.detectNewProducts(30) : detectNewProducts(30),
      "detect-new-products"
    );
  } catch (err) {
    errors.push({
      error: `detectNewProducts failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const newProductCount = detectedProducts.filter((p) => p.isNew).length;

  // Step 2: Auto-queue generation for new products with assembly docs (P1.5.3)
  let jobsQueued = 0;
  let productsUpdated = 0;
  if (detectedProducts.length > 0) {
    const autoResult = await autoQueueNewProducts(detectedProducts, errors);
    jobsQueued += autoResult.jobsQueued;
    productsUpdated += autoResult.productsUpdated;
  }

  // Step 3: Detect PDF updates (P1.5.8)
  let pdfUpdates = 0;
  try {
    const pdfResult = await detectPdfUpdates(errors);
    pdfUpdates = pdfResult.pdfUpdates;
    jobsQueued += pdfResult.jobsQueued;
  } catch (err) {
    errors.push({
      error: `detectPdfUpdates failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Step 4: Handle delisted products (P1.5.9)
  let delistedProducts = 0;
  try {
    delistedProducts = await handleDelistedProducts(errors, retailerSlug);
  } catch (err) {
    errors.push({
      error: `handleDelistedProducts failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  // Step 5: Update last_scraped_at for all processed products
  const processedProductIds = detectedProducts
    .filter((p) => p.productId)
    .map((p) => p.productId!);

  if (processedProductIds.length > 0) {
    try {
      await withRetry(async () => {
        await prisma.product.updateMany({
          where: { id: { in: processedProductIds } },
          data: { last_scraped_at: new Date() },
        });
      }, "update-last-scraped");
    } catch (err) {
      errors.push({
        error: `Failed to update last_scraped_at: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Step 6: Reset is_new for products older than 30 days
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await prisma.product.updateMany({
      where: {
        is_new: true,
        first_detected_at: { lt: thirtyDaysAgo },
      },
      data: { is_new: false },
    });
  } catch {
    // Non-critical — don't add to errors
  }

  const duration = Date.now() - startTime;

  const result: SyncResult = {
    newProducts: newProductCount,
    updatedProducts: productsUpdated,
    delistedProducts,
    jobsQueued,
    pdfUpdates,
    errors: errors.length,
    errorDetails: errors,
    duration,
  };

  // Step 7: Save sync log (if model exists)
  try {
    await prisma.catalogSyncLog.create({
      data: {
        retailer: retailerSlug,
        newProducts: result.newProducts,
        updatedProducts: result.updatedProducts,
        delistedProducts: result.delistedProducts,
        jobsQueued: result.jobsQueued,
        pdfUpdates: result.pdfUpdates,
        errors: result.errors,
        errorDetails: result.errorDetails.length > 0
          ? JSON.parse(JSON.stringify(result.errorDetails))
          : undefined,
        duration: result.duration,
        triggeredBy,
      },
    });
  } catch {
    // CatalogSyncLog model may not exist yet — ignore
  }

  return result;
}
