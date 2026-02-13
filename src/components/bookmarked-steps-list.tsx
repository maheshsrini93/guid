"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StepBookmark } from "@/components/guide-viewer/use-step-bookmarks";
import { loadBookmarks, persistBookmarks } from "@/components/guide-viewer/bookmark-storage";

export function BookmarkedStepsList() {
  const [bookmarks, setBookmarks] = useState<StepBookmark[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setBookmarks(loadBookmarks());
    setMounted(true);
  }, []);

  const removeBookmark = (key: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.key !== key);
      persistBookmarks(next);
      return next;
    });
  };

  const clearAll = () => {
    setBookmarks([]);
    persistBookmarks([]);
  };

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-16 rounded-lg bg-muted" />
        <div className="h-16 rounded-lg bg-muted" />
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Bookmark className="size-12 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">
          No bookmarked steps yet. Bookmark tricky steps in any guide for quick
          reference.
        </p>
      </div>
    );
  }

  // Group by guide
  const grouped = bookmarks.reduce<Record<string, StepBookmark[]>>(
    (acc, b) => {
      if (!acc[b.guideId]) acc[b.guideId] = [];
      acc[b.guideId].push(b);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {bookmarks.length} bookmarked step{bookmarks.length !== 1 ? "s" : ""}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="cursor-pointer text-destructive hover:text-destructive"
        >
          <Trash2 className="mr-1.5 size-3.5" aria-hidden="true" />
          Clear All
        </Button>
      </div>

      {Object.entries(grouped).map(([guideId, steps]) => {
        const sorted = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
        const first = sorted[0];

        return (
          <div key={guideId} className="rounded-lg border">
            <div className="border-b bg-muted/50 px-4 py-2">
              <Link
                href={`/products/${first.articleNumber}`}
                className="text-sm font-semibold hover:underline cursor-pointer"
              >
                {first.productName}
              </Link>
              <p className="text-xs text-muted-foreground">{first.guideTitle}</p>
            </div>
            <div className="divide-y">
              {sorted.map((bookmark) => (
                <div
                  key={bookmark.key}
                  className="flex items-center justify-between px-4 py-2"
                >
                  <Link
                    href={`/products/${bookmark.articleNumber}#step-${bookmark.stepNumber}`}
                    className="flex items-center gap-2 text-sm hover:underline cursor-pointer"
                  >
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary font-mono text-xs font-bold shrink-0">
                      {bookmark.stepNumber}
                    </span>
                    <span>{bookmark.stepTitle}</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBookmark(bookmark.key)}
                    className="size-8 shrink-0 cursor-pointer"
                    aria-label={`Remove bookmark for step ${bookmark.stepNumber}`}
                  >
                    <X className="size-3.5 text-muted-foreground" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
