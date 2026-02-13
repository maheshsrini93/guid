"use client";

import { useState } from "react";
import { List, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { GuideStep } from "./types";

interface MobileTocSheetProps {
  steps: GuideStep[];
  activeStepNumber: number;
  completedSteps: Set<number>;
  onStepSelect: (stepNumber: number) => void;
}

export function MobileTocSheet({
  steps,
  activeStepNumber,
  completedSteps,
  onStepSelect,
}: MobileTocSheetProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (stepNumber: number) => {
    onStepSelect(stepNumber);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-6 right-6 z-[var(--z-sticky)] size-12 rounded-full shadow-lg"
          aria-label="Open table of contents"
        >
          <List className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh]">
        <SheetHeader>
          <SheetTitle>Steps</SheetTitle>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto">
          <ul className="space-y-1" role="list">
            {steps.map((step) => {
              const isActive = step.stepNumber === activeStepNumber;
              const isCompleted = completedSteps.has(step.stepNumber);

              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(step.stepNumber)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors cursor-pointer ${
                      isActive
                        ? "bg-primary/10 font-semibold text-primary"
                        : isCompleted
                          ? "text-muted-foreground"
                          : "text-foreground hover:bg-accent/10"
                    }`}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {/* State indicator */}
                    <span className="flex size-6 shrink-0 items-center justify-center" aria-hidden="true">
                      {isCompleted ? (
                        <Check className="size-4 text-[oklch(0.65_0.18_145)]" />
                      ) : isActive ? (
                        <span className="size-3 rounded-full bg-primary" />
                      ) : (
                        <span className="size-3 rounded-full border-2 border-muted-foreground/40" />
                      )}
                    </span>

                    <span className="flex-1 truncate">
                      Step {step.stepNumber}: {step.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
