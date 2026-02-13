"use client";

import { useState } from "react";
import { ZoomIn } from "lucide-react";
import type { GuideStep } from "./types";

interface IllustrationPanelProps {
  steps: GuideStep[];
  activeStepNumber: number;
  onImageClick?: (imageUrl: string, alt: string) => void;
}

export function IllustrationPanel({
  steps,
  activeStepNumber,
  onImageClick,
}: IllustrationPanelProps) {
  // Find the illustration to show: current step, or fall back to most recent step with an image
  const currentStep = steps.find((s) => s.stepNumber === activeStepNumber);
  let displayImageUrl = currentStep?.imageUrl;
  let displayStepNumber = activeStepNumber;

  if (!displayImageUrl) {
    // Walk backward to find the most recent illustration
    for (let i = activeStepNumber - 1; i >= 1; i--) {
      const prev = steps.find((s) => s.stepNumber === i);
      if (prev?.imageUrl) {
        displayImageUrl = prev.imageUrl;
        displayStepNumber = prev.stepNumber;
        break;
      }
    }
  }

  const alt = `Illustration for Step ${displayStepNumber}`;

  if (!displayImageUrl) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
        No illustration available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Illustration frame */}
      <button
        type="button"
        onClick={() => onImageClick?.(displayImageUrl!, alt)}
        className="group relative w-full cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow duration-200 ease-out hover:shadow-md"
        aria-label={`Zoom into illustration for step ${displayStepNumber}`}
      >
        <div className="relative aspect-[4/3]">
          <img
            src={displayImageUrl}
            alt={alt}
            className="h-full w-full object-contain transition-opacity duration-200 ease-out"
          />
          {/* Zoom overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 ease-out group-hover:bg-black/5 group-hover:opacity-100">
            <span className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-sm font-medium shadow-sm">
              <ZoomIn className="size-4" aria-hidden="true" />
              Click to zoom
            </span>
          </div>
        </div>
      </button>

      {/* Caption */}
      <p className="text-center text-caption text-muted-foreground">
        <span className="font-mono">
          Step {displayStepNumber} of {steps.length}
        </span>
      </p>
    </div>
  );
}
