"use client";

import type { IntakeOption } from "./types";

interface IntakeChipsProps {
  label: string;
  options: IntakeOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export function IntakeChips({
  label,
  options,
  onSelect,
  disabled = false,
}: IntakeChipsProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-secondary-foreground">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            disabled={disabled}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full border bg-secondary px-4 py-2 text-sm text-secondary-foreground transition-colors duration-200 ease-out hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
