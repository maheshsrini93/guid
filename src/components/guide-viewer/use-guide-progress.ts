"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY_PREFIX = "guid_guide_progress_";
const SAVE_DEBOUNCE_MS = 1000;

export interface SavedProgress {
  stepNumber: number;
  mobileStepIndex: number;
  timestamp: number;
}

function getStorageKey(userId: string, guideId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}_${guideId}`;
}

/**
 * Hook to auto-save and restore guide progress for signed-in users.
 *
 * Uses localStorage keyed by userId + guideId. Debounces saves to
 * avoid excessive writes during scrolling.
 */
export function useGuideProgress(
  userId: string | null | undefined,
  guideId: string | null | undefined
) {
  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(
    null
  );
  const [hasDismissedBanner, setHasDismissedBanner] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    if (!userId || !guideId) return;

    try {
      const key = getStorageKey(userId, guideId);
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: SavedProgress = JSON.parse(stored);
        // Only restore if progress is beyond step 1
        if (parsed.stepNumber > 1 || parsed.mobileStepIndex > 0) {
          setSavedProgress(parsed);
        }
      }
    } catch {
      // localStorage unavailable or corrupted — ignore
    }
  }, [userId, guideId]);

  // Save progress (debounced)
  const saveProgress = useCallback(
    (stepNumber: number, mobileStepIndex: number) => {
      if (!userId || !guideId) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        try {
          const key = getStorageKey(userId, guideId);
          const data: SavedProgress = {
            stepNumber,
            mobileStepIndex,
            timestamp: Date.now(),
          };
          localStorage.setItem(key, JSON.stringify(data));
        } catch {
          // localStorage full or unavailable — ignore
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [userId, guideId]
  );

  // Clear saved progress (e.g., on "Start Over" or guide completion)
  const clearProgress = useCallback(() => {
    if (!userId || !guideId) return;

    try {
      const key = getStorageKey(userId, guideId);
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setSavedProgress(null);
  }, [userId, guideId]);

  // Dismiss the resume banner without clearing progress
  const dismissBanner = useCallback(() => {
    setHasDismissedBanner(true);
  }, []);

  // Should show the resume banner?
  const showResumeBanner =
    !!savedProgress && !hasDismissedBanner && !!userId && !!guideId;

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    savedProgress,
    showResumeBanner,
    saveProgress,
    clearProgress,
    dismissBanner,
  };
}
