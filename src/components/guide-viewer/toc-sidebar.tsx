"use client";

import { Check } from "lucide-react";
import type { GuideStep } from "./types";

interface TocSidebarProps {
  steps: GuideStep[];
  activeStepNumber: number;
  completedSteps: Set<number>;
  progressPercent: number;
}

export function TocSidebar({
  steps,
  activeStepNumber,
  completedSteps,
  progressPercent,
}: TocSidebarProps) {
  return (
    <nav
      aria-label="Guide table of contents"
      className="flex h-full flex-col"
    >
      <div className="flex-1 overflow-y-auto py-2">
        <ul className="space-y-0.5" role="list">
          {steps.map((step) => {
            const isActive = step.stepNumber === activeStepNumber;
            const isCompleted = completedSteps.has(step.stepNumber);

            return (
              <li key={step.id}>
                <a
                  href={`#step-${step.stepNumber}`}
                  aria-current={isActive ? "step" : undefined}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors duration-200 ease-out cursor-pointer ${
                    isActive
                      ? "border-l-[3px] border-primary bg-accent/10 font-semibold text-primary"
                      : isCompleted
                        ? "text-muted-foreground"
                        : "text-foreground hover:bg-accent/5 hover:text-primary"
                  }`}
                >
                  {/* Step state icon */}
                  <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
                    {isCompleted ? (
                      <Check className="size-4 text-[oklch(0.65_0.18_145)]" />
                    ) : isActive ? (
                      <span className="size-2.5 rounded-full bg-primary" />
                    ) : (
                      <span className="size-2.5 rounded-full border-2 border-muted-foreground/40" />
                    )}
                  </span>

                  {/* Step label */}
                  <span className="truncate">
                    Step {step.stepNumber}
                    {step.title ? `: ${step.title}` : ""}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Progress bar at bottom of TOC */}
      <div className="border-t px-3 py-3">
        <div className="mb-1 flex items-center justify-between text-caption text-muted-foreground">
          <span>Progress</span>
          <span className="font-mono">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Guide progress: ${Math.round(progressPercent)}%`}
          />
        </div>
      </div>
    </nav>
  );
}
