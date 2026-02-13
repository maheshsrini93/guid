"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepCallout } from "./step-callout";
import { ProgressBar } from "./progress-bar";
import type { GuideStep } from "./types";

interface MobileStepCardProps {
  step: GuideStep;
  totalSteps: number;
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onImageClick?: (imageUrl: string, alt: string) => void;
}

export function MobileStepCard({
  step,
  totalSteps,
  currentIndex,
  onPrevious,
  onNext,
  onImageClick,
}: MobileStepCardProps) {
  const progressPercent = ((currentIndex + 1) / totalSteps) * 100;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;

  return (
    <div className="flex h-full flex-col">
      {/* Progress bar at very top */}
      <ProgressBar percent={progressPercent} />

      <div className="flex-1 overflow-y-auto p-4">
        {/* Illustration */}
        {step.imageUrl && (
          <button
            type="button"
            onClick={() => onImageClick?.(step.imageUrl!, `Step ${step.stepNumber} illustration`)}
            className="mb-4 w-full cursor-pointer overflow-hidden rounded-lg border bg-white"
            aria-label={`Zoom into illustration for step ${step.stepNumber}`}
          >
            <div className="aspect-[4/3]">
              <img
                src={step.imageUrl}
                alt={`Step ${step.stepNumber} illustration`}
                className="h-full w-full object-contain"
              />
            </div>
          </button>
        )}

        {/* Step header */}
        <div className="mb-4 flex items-center gap-3">
          <span
            className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono text-sm font-bold shrink-0"
            aria-hidden="true"
          >
            {step.stepNumber}
          </span>
          <div>
            <h3 className="font-semibold text-lg">{step.title}</h3>
            <span className="text-caption text-muted-foreground">
              Step {step.stepNumber} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Instruction */}
        <div className="prose-guide mb-4">
          <p className="whitespace-pre-line">{step.instruction}</p>
        </div>

        {/* Callouts */}
        <div className="flex flex-col gap-3">
          {step.tip && (
            <StepCallout type="tip">{step.tip}</StepCallout>
          )}
          {step.warning && (
            <StepCallout type="warning">{step.warning}</StepCallout>
          )}
          {step.info && (
            <StepCallout type="info">{step.info}</StepCallout>
          )}
        </div>
      </div>

      {/* Navigation buttons — always at bottom */}
      <div className="flex gap-2 border-t p-4">
        <Button
          variant="outline"
          size="lg"
          disabled={isFirst}
          onClick={onPrevious}
          className="flex-1"
          aria-label="Previous step"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
          Previous
        </Button>
        <Button
          size="lg"
          disabled={isLast}
          onClick={onNext}
          className="flex-1"
          aria-label={isLast ? "Last step" : "Next step"}
        >
          Next Step
          <ChevronRight className="size-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
