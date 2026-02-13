"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateJobStep } from "@/lib/actions/ai-generation";
import type { GeneratedStep, CorrectionCategory } from "@/lib/ai/types";
import { CORRECTION_CATEGORIES } from "@/lib/ai/types";

interface StepReviewCardProps {
  jobId: string;
  step: GeneratedStep;
  isEditable: boolean;
}

export function StepReviewCard({
  jobId,
  step,
  isEditable,
}: StepReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(step.title);
  const [instruction, setInstruction] = useState(step.instruction);
  const [category, setCategory] = useState<CorrectionCategory>("other");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSavedMessage(null);
    const hasChanges =
      title !== step.title || instruction !== step.instruction;
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await updateJobStep(jobId, step.stepNumber, {
        title: title !== step.title ? title : undefined,
        instruction: instruction !== step.instruction ? instruction : undefined,
        correctionCategory: category,
        correctionNotes: notes || undefined,
      });
      if (!result.success) {
        setError(result.error || "Failed to save");
      } else {
        setIsEditing(false);
        setNotes("");
        setSavedMessage(
          result.correctionsSaved
            ? `Saved with ${result.correctionsSaved} correction(s) logged`
            : "Saved"
        );
        setTimeout(() => setSavedMessage(null), 3000);
      }
    });
  }

  function handleCancel() {
    setTitle(step.title);
    setInstruction(step.instruction);
    setCategory("other");
    setNotes("");
    setIsEditing(false);
    setError(null);
  }

  return (
    <div className="rounded-lg border p-4">
      {/* Step header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
            {step.stepNumber}
          </span>
          {isEditing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium text-sm border rounded px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <span className="font-medium text-sm">{step.title}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`font-mono text-xs font-medium ${
              step.confidence >= 0.9
                ? "text-green-600 dark:text-green-400"
                : step.confidence >= 0.7
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-destructive"
            }`}
          >
            {(step.confidence * 100).toFixed(0)}%
          </span>
          <Badge variant="outline" className="text-[10px] capitalize">
            {step.complexity}
          </Badge>
        </div>
      </div>

      {/* Instruction text */}
      {isEditing ? (
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          className="w-full text-sm border rounded px-3 py-2 min-h-[80px] mt-1 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <p className="text-sm text-muted-foreground whitespace-pre-line mt-1">
          {step.instruction}
        </p>
      )}

      {/* Correction category + notes (visible only in edit mode) */}
      {isEditing && (
        <div className="mt-3 space-y-2 rounded-md border border-dashed p-3 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">
            What type of correction is this?
          </p>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as CorrectionCategory)
            }
            className="w-full text-sm border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          >
            {CORRECTION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional note about this correction..."
            className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

      {/* Callouts */}
      {step.callouts && step.callouts.length > 0 && !isEditing && (
        <div className="mt-2 space-y-1">
          {step.callouts.map((c, i) => (
            <div
              key={i}
              className={`text-xs rounded px-2 py-1 ${
                c.type === "warning"
                  ? "bg-destructive/10 text-destructive"
                  : c.type === "tip"
                    ? "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    : "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
              }`}
            >
              <span className="font-medium capitalize">{c.type}:</span>{" "}
              {c.text}
            </div>
          ))}
        </div>
      )}

      {/* Parts and tools */}
      {!isEditing && (step.parts?.length > 0 || step.tools?.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {step.parts?.map((p) => (
            <Badge
              key={p.partNumber}
              variant="outline"
              className="text-[10px]"
            >
              {p.partName} ({p.partNumber}) x{p.quantity}
            </Badge>
          ))}
          {step.tools?.map((t) => (
            <Badge
              key={t.toolName}
              variant="secondary"
              className="text-[10px]"
            >
              {t.toolName}
            </Badge>
          ))}
        </div>
      )}

      {/* Source page */}
      <div className="mt-2 text-[10px] text-muted-foreground">
        PDF page {step.sourcePdfPage}
        {step.screwDirection !== "none" && (
          <span className="ml-2">
            Screw: {step.screwDirection === "clockwise" ? "CW" : "CCW"}
          </span>
        )}
      </div>

      {/* Edit controls */}
      {error && (
        <div className="mt-2 text-xs text-destructive">{error}</div>
      )}
      {savedMessage && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400">{savedMessage}</div>
      )}

      {isEditable && (
        <div className="mt-2 flex gap-1">
          {isEditing ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={isPending}
                className="h-7 text-xs cursor-pointer"
              >
                {isPending ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
                className="h-7 text-xs cursor-pointer"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-7 text-xs cursor-pointer"
            >
              Edit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
