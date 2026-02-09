"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface Step {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  tip: string | null;
  imageUrl: string | null;
}

interface AssemblyGuideViewerProps {
  title: string;
  description: string | null;
  difficulty: string;
  timeMinutes: number | null;
  tools: string | null;
  steps: Step[];
}

export function AssemblyGuideViewer({
  title,
  description,
  difficulty,
  timeMinutes,
  tools,
  steps,
}: AssemblyGuideViewerProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (steps.length === 0) {
    return (
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground">
          Assembly guide coming soon.
        </p>
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="p-6 pb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="outline" className="capitalize">
            {difficulty}
          </Badge>
          {timeMinutes && (
            <Badge variant="secondary">{timeMinutes} min</Badge>
          )}
          {tools && (
            <Badge variant="secondary">Tools: {tools}</Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Step content */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            {step.stepNumber}
          </span>
          <div>
            <h3 className="font-semibold">{step.title}</h3>
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
        </div>

        <p className="text-sm whitespace-pre-line mb-4">{step.instruction}</p>

        {step.tip && (
          <div className="text-sm text-blue-700 bg-blue-50 rounded-md p-3 mb-4">
            <span className="font-medium">Tip:</span> {step.tip}
          </div>
        )}

        {step.imageUrl && (
          <img
            src={step.imageUrl}
            alt={step.title}
            className="w-full rounded-md mb-4 max-h-64 object-contain bg-gray-50"
          />
        )}
      </div>

      {/* Navigation */}
      <Separator />
      <div className="p-4 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((s) => s - 1)}
        >
          Previous
        </Button>

        {/* Step indicators */}
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentStep
                  ? "w-6 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={currentStep === steps.length - 1}
          onClick={() => setCurrentStep((s) => s + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
