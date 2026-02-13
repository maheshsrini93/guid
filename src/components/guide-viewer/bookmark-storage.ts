import type { StepBookmark } from "./use-step-bookmarks";

export const BOOKMARK_STORAGE_KEY = "guid_step_bookmarks";

export function loadBookmarks(): StepBookmark[] {
  try {
    const stored = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function persistBookmarks(bookmarks: StepBookmark[]) {
  try {
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // localStorage full or unavailable
  }
}
