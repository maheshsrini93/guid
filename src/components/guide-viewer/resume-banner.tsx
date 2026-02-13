"use client";

import { RotateCcw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumeBannerProps {
  stepNumber: number;
  onResume: () => void;
  onStartOver: () => void;
}

export function ResumeBanner({
  stepNumber,
  onResume,
  onStartOver,
}: ResumeBannerProps) {
  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-accent/10 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-foreground">
        Welcome back! Continue from{" "}
        <span className="font-semibold font-mono">Step {stepNumber}</span>?
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onStartOver}
          className="cursor-pointer"
        >
          <RotateCcw className="mr-1.5 size-4" aria-hidden="true" />
          Start Over
        </Button>
        <Button
          size="sm"
          onClick={onResume}
          className="cursor-pointer"
        >
          <Play className="mr-1.5 size-4" aria-hidden="true" />
          Resume
        </Button>
      </div>
    </div>
  );
}
