"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImagePreviewProps {
  /** Object URL or data URL for the preview */
  previewUrl: string;
  /** Called when the user removes the attached image */
  onRemove: () => void;
}

export function ImagePreview({ previewUrl, onRemove }: ImagePreviewProps) {
  return (
    <div className="flex items-center gap-2 border-t bg-muted/50 px-3 py-2">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border">
        <img
          src={previewUrl}
          alt="Attached image preview"
          className="size-full object-cover"
        />
        <Button
          variant="destructive"
          size="icon"
          className="absolute -right-1 -top-1 size-5 cursor-pointer rounded-full"
          onClick={onRemove}
          aria-label="Remove attached image"
        >
          <X className="size-3" aria-hidden="true" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Image attached</p>
    </div>
  );
}
