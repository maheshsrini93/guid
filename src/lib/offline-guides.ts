/**
 * Client-side utility for managing offline guide caching.
 * Uses localStorage to track which guides are saved offline,
 * and communicates with the service worker to cache/uncache resources.
 */

const STORAGE_KEY = 'guid:offline-guides';

export interface OfflineGuideEntry {
  articleNumber: string;
  productName: string;
  savedAt: string;
  urls: string[];
}

/** Get all offline-saved guides from localStorage. */
export function getOfflineGuides(): OfflineGuideEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Check if a specific guide is saved offline. */
export function isGuideSavedOffline(articleNumber: string): boolean {
  return getOfflineGuides().some((g) => g.articleNumber === articleNumber);
}

/** Save a guide for offline access (premium only — caller checks). */
export async function saveGuideOffline(
  articleNumber: string,
  productName: string,
  pageUrl: string,
  imageUrls: string[]
): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return false;
  }

  // Collect all URLs to cache: the guide page + step images
  const urls = [pageUrl, ...imageUrls.filter(Boolean)];

  // Tell the service worker to cache these URLs
  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_GUIDE',
    urls,
    articleNumber,
  });

  // Track in localStorage
  const guides = getOfflineGuides().filter(
    (g) => g.articleNumber !== articleNumber
  );
  guides.push({
    articleNumber,
    productName,
    savedAt: new Date().toISOString(),
    urls,
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(guides));

  return true;
}

/** Remove a guide from offline cache. */
export async function removeGuideOffline(
  articleNumber: string
): Promise<void> {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    return;
  }

  const guides = getOfflineGuides();
  const guide = guides.find((g) => g.articleNumber === articleNumber);

  if (guide) {
    // Tell the service worker to uncache these URLs
    navigator.serviceWorker.controller.postMessage({
      type: 'UNCACHE_GUIDE',
      urls: guide.urls,
    });
  }

  // Remove from localStorage
  const updated = guides.filter((g) => g.articleNumber !== articleNumber);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
