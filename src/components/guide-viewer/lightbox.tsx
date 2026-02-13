"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LightboxProps {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

export function Lightbox({ imageUrl, alt, onClose }: LightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Close lightbox"
        className="absolute right-4 top-4 z-10 text-white hover:bg-white/10"
      >
        <X className="size-6" />
      </Button>

      {/* Image */}
      <div className="relative z-10 max-h-[90vh] max-w-[90vw]">
        <img
          src={imageUrl}
          alt={alt}
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-xl"
        />
      </div>
    </div>
  );
}
