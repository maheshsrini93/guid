import { useCallback, useEffect, useState } from "react";

import { useAuth } from "../lib/AuthContext";
import {
  cacheGuide,
  getCachedGuide,
  isGuideCached,
  removeCachedGuide,
  type DownloadProgress,
} from "../lib/offline-storage";
import { getGuide } from "../services/guides";

interface UseOfflineGuideReturn {
  /** Whether this guide is available offline */
  isCached: boolean;
  /** Whether a download is currently in progress */
  isDownloading: boolean;
  /** Image download progress: current/total */
  downloadProgress: DownloadProgress;
  /** Download a guide for offline use. Returns false if not premium. */
  downloadGuide: (articleNumber: string) => Promise<boolean>;
  /** Remove a cached guide */
  removeGuide: (articleNumber: string) => Promise<void>;
  /** Load a cached guide (returns null if not cached) */
  loadCachedGuide: (articleNumber: string) => ReturnType<typeof getCachedGuide>;
  /** Whether the user needs to upgrade (free tier tried to download) */
  needsUpgrade: boolean;
}

/**
 * React hook for offline guide caching.
 * Automatically checks cache status for a given articleNumber
 * and gates downloads behind premium subscription.
 */
export function useOfflineGuide(
  articleNumber?: string
): UseOfflineGuideReturn {
  const { user } = useAuth();
  const [isCached, setIsCached] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    current: 0,
    total: 0,
  });
  const [needsUpgrade, setNeedsUpgrade] = useState(false);

  const isPremium = user?.subscriptionTier === "premium";

  // Check cache status on mount and when articleNumber changes
  useEffect(() => {
    if (!articleNumber) return;

    let cancelled = false;

    isGuideCached(articleNumber).then((cached) => {
      if (!cancelled) setIsCached(cached);
    });

    return () => {
      cancelled = true;
    };
  }, [articleNumber]);

  const downloadGuide = useCallback(
    async (an: string): Promise<boolean> => {
      // Premium gate
      if (!isPremium) {
        setNeedsUpgrade(true);
        return false;
      }

      setNeedsUpgrade(false);
      setIsDownloading(true);
      setDownloadProgress({ current: 0, total: 0 });

      try {
        // Fetch guide data from the API
        const response = await getGuide(an);
        if (!response.guide) {
          throw new Error("No guide available for this product");
        }

        await cacheGuide(an, response.guide, (progress) => {
          setDownloadProgress(progress);
        });

        setIsCached(true);
        return true;
      } catch {
        return false;
      } finally {
        setIsDownloading(false);
      }
    },
    [isPremium]
  );

  const removeGuide = useCallback(
    async (an: string) => {
      await removeCachedGuide(an);
      if (an === articleNumber) {
        setIsCached(false);
      }
    },
    [articleNumber]
  );

  const loadCachedGuide = useCallback(
    (an: string) => getCachedGuide(an),
    []
  );

  return {
    isCached,
    isDownloading,
    downloadProgress,
    downloadGuide,
    removeGuide,
    loadCachedGuide,
    needsUpgrade,
  };
}
