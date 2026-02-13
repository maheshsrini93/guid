"use client";

import { useState, useEffect, useCallback } from "react";
import { loadBookmarks, persistBookmarks } from "./bookmark-storage";

export interface StepBookmark {
  /** Unique key: `${guideId}:${stepNumber}` */
  key: string;
  guideId: string;
  stepNumber: number;
  stepTitle: string;
  guideTitle: string;
  /** Article number for building link */
  articleNumber: string;
  productName: string;
  timestamp: number;
}

/**
 * Hook to manage step bookmarks across guides.
 * Stores bookmarks in localStorage (works for both signed-in and anonymous users).
 */
export function useStepBookmarks() {
  const [bookmarks, setBookmarks] = useState<StepBookmark[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setBookmarks(loadBookmarks());
  }, []);

  const isBookmarked = useCallback(
    (guideId: string, stepNumber: number) => {
      const key = `${guideId}:${stepNumber}`;
      return bookmarks.some((b) => b.key === key);
    },
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (bookmark: Omit<StepBookmark, "key" | "timestamp">) => {
      setBookmarks((prev) => {
        const key = `${bookmark.guideId}:${bookmark.stepNumber}`;
        const exists = prev.some((b) => b.key === key);

        let next: StepBookmark[];
        if (exists) {
          next = prev.filter((b) => b.key !== key);
        } else {
          next = [
            ...prev,
            { ...bookmark, key, timestamp: Date.now() },
          ];
        }

        persistBookmarks(next);
        return next;
      });
    },
    []
  );

  const removeBookmark = useCallback((key: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.key !== key);
      persistBookmarks(next);
      return next;
    });
  }, []);

  const clearAllBookmarks = useCallback(() => {
    setBookmarks([]);
    persistBookmarks([]);
  }, []);

  return {
    bookmarks,
    isBookmarked,
    toggleBookmark,
    removeBookmark,
    clearAllBookmarks,
  };
}
