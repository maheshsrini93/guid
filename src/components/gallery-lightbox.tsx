"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GalleryLightboxProps {
  images: { url: string; alt: string }[];
  initialIndex: number;
  onClose: () => void;
}

export function GalleryLightbox({
  images,
  initialIndex,
  onClose,
}: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : i));
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  // Keyboard navigation + focus trap + inert background
  useEffect(() => {
    const mainContent = document.querySelector("main");
    if (mainContent) mainContent.setAttribute("inert", "");

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (mainContent) mainContent.removeAttribute("inert");
    };
  }, [onClose, goNext, goPrev]);

  // Swipe on touch
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 50) {
        if (dx < 0) goNext();
        else goPrev();
      }
    },
    [goNext, goPrev]
  );

  const current = images[currentIndex];
  if (!current) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${currentIndex + 1} of ${images.length}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Close */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        autoFocus
        aria-label="Close lightbox"
        className="absolute right-4 top-4 z-20 text-white hover:bg-white/10 cursor-pointer"
      >
        <X className="size-6" />
      </Button>

      {/* Previous */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={goPrev}
          aria-label="Previous image"
          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 size-12 text-white hover:bg-white/10 cursor-pointer"
        >
          <ChevronLeft className="size-8" />
        </Button>
      )}

      {/* Next */}
      {currentIndex < images.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={goNext}
          aria-label="Next image"
          className="absolute right-4 top-1/2 z-20 -translate-y-1/2 size-12 text-white hover:bg-white/10 cursor-pointer"
        >
          <ChevronRight className="size-8" />
        </Button>
      )}

      {/* Image */}
      <div className="relative z-10 max-h-[90vh] max-w-[90vw]">
        <img
          src={current.url}
          alt={current.alt}
          className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain shadow-xl"
        />
        {/* Counter */}
        {images.length > 1 && (
          <p className="mt-3 text-center text-sm text-white/70 font-mono">
            {currentIndex + 1} / {images.length}
          </p>
        )}
      </div>
    </div>
  );
}
