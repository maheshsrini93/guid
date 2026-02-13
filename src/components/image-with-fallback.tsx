"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  className?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
}

export function ImageWithFallback({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  className,
  priority,
  loading: loadingProp,
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gray-100 text-gray-400 text-sm",
          className
        )}
      >
        No image
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      fill={fill}
      sizes={sizes}
      priority={priority}
      loading={loadingProp}
      className={cn(
        className,
        isLoading && "animate-pulse bg-gray-100"
      )}
      onLoad={() => setIsLoading(false)}
      onError={() => setError(true)}
    />
  );
}
