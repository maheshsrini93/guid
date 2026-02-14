import { Paths, File, Directory } from "expo-file-system";

import { MAX_CACHED_GUIDES } from "./config";
import { getDatabase, initDatabase } from "./database";

// ── Types ────────────────────────────────────────────────────────────────────

interface GuideStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  imageUrl: string | null;
  tip: string | null;
  warning: string | null;
}

interface GuideData {
  id: string;
  title: string;
  difficulty: string;
  timeMinutes: number | null;
  tools: string | null;
  published: boolean;
  steps: GuideStep[];
}

export interface CachedGuideRow {
  id: number;
  articleNumber: string;
  title: string;
  difficulty: string;
  stepsJson: string;
  totalSteps: number;
  cachedAt: string;
  lastAccessedAt: string;
  storageBytes: number;
}

export interface CachedGuideMeta {
  articleNumber: string;
  title: string;
  difficulty: string;
  totalSteps: number;
  cachedAt: string;
  imageCount: number;
  storageBytes: number;
}

export interface DownloadProgress {
  current: number;
  total: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const guidesDir = new Directory(Paths.document, "guides");

function guideDirectory(articleNumber: string): Directory {
  return new Directory(guidesDir, articleNumber);
}

function ensureDir(dir: Directory): void {
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    await initDatabase();
    initialized = true;
  }
}

/**
 * Check whether a guide has been cached locally.
 */
export async function isGuideCached(
  articleNumber: string
): Promise<boolean> {
  await ensureInitialized();
  const db = getDatabase();
  const row = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM cached_guides WHERE articleNumber = ?",
    [articleNumber]
  );
  return (row?.cnt ?? 0) > 0;
}

/**
 * Download and cache a guide's JSON + all step images.
 * Calls `onProgress` after each image download.
 * Enforces `MAX_CACHED_GUIDES` via LRU eviction.
 */
export async function cacheGuide(
  articleNumber: string,
  guideData: GuideData,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  await ensureInitialized();
  const db = getDatabase();

  // If already cached, remove first to re-download fresh
  const existing = await isGuideCached(articleNumber);
  if (existing) {
    await removeCachedGuide(articleNumber);
  }

  // Evict oldest if at capacity
  const countRow = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM cached_guides"
  );
  const currentCount = countRow?.cnt ?? 0;
  if (currentCount >= MAX_CACHED_GUIDES) {
    await evictOldest();
  }

  // Prepare image directory
  const dir = guideDirectory(articleNumber);
  ensureDir(dir);

  // Determine which steps have images
  const stepsWithImages = guideData.steps.filter((s) => s.imageUrl);
  const totalImages = stepsWithImages.length;
  let downloadedImages = 0;
  let totalImageBytes = 0;

  // Download each image
  for (const step of stepsWithImages) {
    if (!step.imageUrl) continue;

    const destFile = new File(dir, `${step.stepNumber}.jpg`);

    try {
      const downloaded = await File.downloadFileAsync(step.imageUrl, destFile, {
        idempotent: true,
      });
      const fileSize = downloaded.size ?? 0;
      totalImageBytes += fileSize;

      await db.runAsync(
        `INSERT INTO cached_images (articleNumber, stepNumber, remoteUrl, localPath, sizeBytes)
         VALUES (?, ?, ?, ?, ?)`,
        [articleNumber, step.stepNumber, step.imageUrl, destFile.uri, fileSize]
      );
    } catch {
      // If a single image fails, continue — partial cache is still useful
    }

    downloadedImages++;
    onProgress?.({ current: downloadedImages, total: totalImages });
  }

  // Calculate rough storage for the JSON text
  const stepsJson = JSON.stringify(guideData);
  const jsonBytes = new TextEncoder().encode(stepsJson).byteLength;
  const totalBytes = jsonBytes + totalImageBytes;
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO cached_guides (articleNumber, title, difficulty, stepsJson, totalSteps, cachedAt, lastAccessedAt, storageBytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      articleNumber,
      guideData.title,
      guideData.difficulty,
      stepsJson,
      guideData.steps.length,
      now,
      now,
      totalBytes,
    ]
  );
}

/**
 * Load a cached guide, swapping remote imageUrls for local file paths.
 * Updates `lastAccessedAt` for LRU tracking.
 * Returns null if not cached.
 */
export async function getCachedGuide(
  articleNumber: string
): Promise<GuideData | null> {
  await ensureInitialized();
  const db = getDatabase();

  const row = await db.getFirstAsync<CachedGuideRow>(
    "SELECT * FROM cached_guides WHERE articleNumber = ?",
    [articleNumber]
  );

  if (!row) return null;

  // Update LRU timestamp
  await db.runAsync(
    "UPDATE cached_guides SET lastAccessedAt = ? WHERE articleNumber = ?",
    [new Date().toISOString(), articleNumber]
  );

  const guide: GuideData = JSON.parse(row.stepsJson);

  // Replace remote URLs with local paths where available
  const images = await db.getAllAsync<{
    stepNumber: number;
    localPath: string;
  }>(
    "SELECT stepNumber, localPath FROM cached_images WHERE articleNumber = ?",
    [articleNumber]
  );

  const localPathMap = new Map(images.map((img) => [img.stepNumber, img.localPath]));

  guide.steps = guide.steps.map((step) => {
    const localPath = localPathMap.get(step.stepNumber);
    if (localPath) {
      return { ...step, imageUrl: localPath };
    }
    return step;
  });

  return guide;
}

/**
 * Remove a single cached guide and its downloaded images.
 */
export async function removeCachedGuide(
  articleNumber: string
): Promise<void> {
  await ensureInitialized();
  const db = getDatabase();

  // Delete image files from disk
  const dir = guideDirectory(articleNumber);
  if (dir.exists) {
    dir.delete();
  }

  // SQLite cascade will handle cached_images rows
  await db.runAsync(
    "DELETE FROM cached_guides WHERE articleNumber = ?",
    [articleNumber]
  );
}

/**
 * List all cached guides with metadata for the management UI.
 */
export async function getCachedGuidesList(): Promise<CachedGuideMeta[]> {
  await ensureInitialized();
  const db = getDatabase();

  const guides = await db.getAllAsync<CachedGuideRow>(
    "SELECT * FROM cached_guides ORDER BY lastAccessedAt DESC"
  );

  const result: CachedGuideMeta[] = [];

  for (const g of guides) {
    const imageCount = await db.getFirstAsync<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM cached_images WHERE articleNumber = ?",
      [g.articleNumber]
    );

    result.push({
      articleNumber: g.articleNumber,
      title: g.title,
      difficulty: g.difficulty,
      totalSteps: g.totalSteps,
      cachedAt: g.cachedAt,
      imageCount: imageCount?.cnt ?? 0,
      storageBytes: g.storageBytes,
    });
  }

  return result;
}

/**
 * Remove all cached guides and images.
 */
export async function clearAllCaches(): Promise<void> {
  await ensureInitialized();
  const db = getDatabase();

  // Delete the entire guides directory
  if (guidesDir.exists) {
    guidesDir.delete();
  }

  await db.runAsync("DELETE FROM cached_images");
  await db.runAsync("DELETE FROM cached_guides");
}

/**
 * Total bytes used by all cached guides.
 */
export async function getStorageUsed(): Promise<number> {
  await ensureInitialized();
  const db = getDatabase();

  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(storageBytes), 0) as total FROM cached_guides"
  );

  return row?.total ?? 0;
}

/**
 * Evict the least-recently-accessed guide to free a slot.
 */
export async function evictOldest(): Promise<void> {
  await ensureInitialized();
  const db = getDatabase();

  const oldest = await db.getFirstAsync<{ articleNumber: string }>(
    "SELECT articleNumber FROM cached_guides ORDER BY lastAccessedAt ASC LIMIT 1"
  );

  if (oldest) {
    await removeCachedGuide(oldest.articleNumber);
  }
}
