"use client";

import { useState } from "react";
import { ImageWithFallback } from "@/components/image-with-fallback";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: number;
  url: string;
  alt_text: string | null;
}

interface ProductImageGalleryProps {
  images: GalleryImage[];
  productName: string;
}

export function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        No image available
      </div>
    );
  }

  const selected = images[selectedIndex];

  return (
    <div className="space-y-2">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-50">
        <ImageWithFallback
          src={selected.url}
          alt={selected.alt_text || productName}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-contain"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.slice(0, 8).map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(i)}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md bg-gray-50 ring-offset-2 transition-all",
                i === selectedIndex
                  ? "ring-2 ring-primary"
                  : "hover:ring-2 hover:ring-muted-foreground/30"
              )}
            >
              <ImageWithFallback
                src={img.url}
                alt={img.alt_text || ""}
                fill
                sizes="(max-width: 768px) 25vw, 12vw"
                className="object-contain"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
