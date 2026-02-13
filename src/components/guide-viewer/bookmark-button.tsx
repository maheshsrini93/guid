"use client";

import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: () => void;
  stepNumber: number;
}

export function BookmarkButton({
  isBookmarked,
  onToggle,
  stepNumber,
}: BookmarkButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className="size-11 shrink-0 cursor-pointer"
      aria-label={
        isBookmarked
          ? `Remove bookmark from step ${stepNumber}`
          : `Bookmark step ${stepNumber}`
      }
      aria-pressed={isBookmarked}
    >
      <Bookmark
        className={`size-4 transition-colors duration-200 ease-out ${
          isBookmarked
            ? "fill-primary text-primary"
            : "text-muted-foreground"
        }`}
        aria-hidden="true"
      />
    </Button>
  );
}
