import { forwardRef } from "react";
import { StepCallout } from "./step-callout";
import type { GuideStep } from "./types";

interface StepSectionProps {
  step: GuideStep;
  totalSteps: number;
}

export const StepSection = forwardRef<HTMLElement, StepSectionProps>(
  function StepSection({ step, totalSteps }, ref) {
    const headingId = `step-heading-${step.stepNumber}`;

    return (
      <section
        ref={ref}
        id={`step-${step.stepNumber}`}
        aria-labelledby={headingId}
        className="scroll-mt-24"
      >
        {/* Step header */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono text-sm font-bold shrink-0"
            aria-hidden="true"
          >
            {step.stepNumber}
          </span>
          <div>
            <h3 id={headingId} className="font-semibold">
              {step.title}
            </h3>
            <span className="text-caption text-muted-foreground">
              Step {step.stepNumber} of {totalSteps}
            </span>
          </div>
        </div>

        {/* Instruction text */}
        <div className="prose-guide">
          <p className="whitespace-pre-line">{step.instruction}</p>
        </div>

        {/* Callouts */}
        <div className="mt-4 flex flex-col gap-3">
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
      </section>
    );
  }
);
