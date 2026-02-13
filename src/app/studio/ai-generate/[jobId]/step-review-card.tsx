"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateJobStep } from "@/lib/actions/ai-generation";
import type { GeneratedStep } from "@/lib/ai/types";

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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateJobStep(jobId, step.stepNumber, {
        title: title !== step.title ? title : undefined,
        instruction: instruction !== step.instruction ? instruction : undefined,
      });
      if (!result.success) {
        setError(result.error || "Failed to save");
      } else {
        setIsEditing(false);
      }
    });
  }

  function handleCancel() {
    setTitle(step.title);
    setInstruction(step.instruction);
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
                ? "text-green-600"
                : step.confidence >= 0.7
                  ? "text-amber-600"
                  : "text-red-600"
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

      {/* Callouts */}
      {step.callouts && step.callouts.length > 0 && !isEditing && (
        <div className="mt-2 space-y-1">
          {step.callouts.map((c, i) => (
            <div
              key={i}
              className={`text-xs rounded px-2 py-1 ${
                c.type === "warning"
                  ? "bg-red-50 text-red-700"
                  : c.type === "tip"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-blue-50 text-blue-700"
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
        <div className="mt-2 text-xs text-red-600">{error}</div>
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
