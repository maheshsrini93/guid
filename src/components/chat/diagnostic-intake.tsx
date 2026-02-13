"use client";

import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Camera } from "lucide-react";
import { IntakeChips } from "./intake-chips";
import {
  PROBLEM_CATEGORIES,
  TIMING_OPTIONS,
  type IntakePhase,
  type DiagnosticAnswers,
} from "./types";

interface DiagnosticIntakeProps {
  /** Initial phase — "category" if product is pre-loaded, "product" otherwise */
  initialPhase?: IntakePhase;
  /** Called when intake is complete with all collected answers */
  onComplete: (answers: DiagnosticAnswers) => void;
  /** Called when user wants to attach an image during intake */
  onImageRequest?: () => void;
  disabled?: boolean;
}

export function DiagnosticIntake({
  initialPhase = "product",
  onComplete,
  onImageRequest,
  disabled = false,
}: DiagnosticIntakeProps) {
  const [phase, setPhase] = useState<IntakePhase>(initialPhase);
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});
  const [productQuery, setProductQuery] = useState("");

  const handleProductSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = productQuery.trim();
      if (!trimmed) return;
      setAnswers((prev) => ({ ...prev, productQuery: trimmed }));
      setPhase("category");
    },
    [productQuery]
  );

  const handleCategorySelect = useCallback(
    (value: string) => {
      const updated = { ...answers, category: value };
      setAnswers(updated);
      setPhase("timing");
    },
    [answers]
  );

  const handleTimingSelect = useCallback(
    (value: string) => {
      const updated = { ...answers, timing: value };
      setAnswers(updated);
      setPhase("photo");
    },
    [answers]
  );

  const handleSkipPhoto = useCallback(() => {
    setPhase("complete");
    onComplete(answers);
  }, [answers, onComplete]);

  const handleAddPhoto = useCallback(() => {
    onImageRequest?.();
    // After image is attached, the parent will call onComplete
    setPhase("complete");
    onComplete(answers);
  }, [answers, onComplete, onImageRequest]);

  if (phase === "complete") return null;

  return (
    <div className="space-y-4 px-4 py-3">
      {/* Phase: Product identification */}
      {phase === "product" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5"
              aria-hidden="true"
            >
              1
            </div>
            <p className="text-sm text-secondary-foreground">
              What product do you need help with? Enter the name or article
              number.
            </p>
          </div>
          <form onSubmit={handleProductSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="e.g. KALLAX, 204.099.32..."
                className="pl-9 font-mono"
                disabled={disabled}
                aria-label="Product name or article number"
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!productQuery.trim() || disabled}
              className="cursor-pointer shrink-0"
              aria-label="Continue"
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      )}

      {/* Phase: Problem category */}
      {phase === "category" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5"
              aria-hidden="true"
            >
              2
            </div>
            <IntakeChips
              label="What kind of issue are you experiencing?"
              options={PROBLEM_CATEGORIES}
              onSelect={handleCategorySelect}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* Phase: Timing */}
      {phase === "timing" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5"
              aria-hidden="true"
            >
              3
            </div>
            <IntakeChips
              label="When did this start?"
              options={TIMING_OPTIONS}
              onSelect={handleTimingSelect}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* Phase: Photo (optional) */}
      {phase === "photo" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-0.5"
              aria-hidden="true"
            >
              4
            </div>
            <div className="space-y-2">
              <p className="text-sm text-secondary-foreground">
                Can you share a photo of the issue? This helps me diagnose the
                problem faster.
              </p>
              <div className="flex gap-2">
                {onImageRequest && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddPhoto}
                    disabled={disabled}
                    className="cursor-pointer"
                  >
                    <Camera className="size-4 mr-1.5" aria-hidden="true" />
                    Add photo
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkipPhoto}
                  disabled={disabled}
                  className="cursor-pointer text-muted-foreground"
                >
                  Skip
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
