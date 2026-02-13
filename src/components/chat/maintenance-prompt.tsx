"use client";

import { useCallback, useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  saveReminder,
  hasReminder,
  REMINDER_INTERVALS,
} from "@/lib/maintenance-reminders";
import type { ChatProductContext } from "./types";

interface MaintenancePromptProps {
  product: ChatProductContext;
  /** Optional maintenance type label derived from the chat topic */
  maintenanceType?: string;
  /** Callback when the user dismisses the prompt */
  onDismiss: () => void;
}

/**
 * Post-chat prompt suggesting the user set a periodic maintenance
 * reminder for the product they were troubleshooting. Saves to
 * localStorage for now; Phase 4 will add push notifications.
 */
export function MaintenancePrompt({
  product,
  maintenanceType = "General maintenance",
  onDismiss,
}: MaintenancePromptProps) {
  const [saved, setSaved] = useState(() => hasReminder(product.productId));
  const [selectedInterval, setSelectedInterval] = useState<number | null>(null);

  const handleSave = useCallback(() => {
    const days = selectedInterval ?? 90; // default to 3 months
    const now = new Date();
    const nextDue = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    saveReminder({
      productId: product.productId,
      productName: product.productName,
      articleNumber: product.articleNumber,
      intervalDays: days,
      createdAt: now.toISOString(),
      nextDueAt: nextDue.toISOString(),
      maintenanceType,
    });

    setSaved(true);
  }, [product, maintenanceType, selectedInterval]);

  // Already saved — show confirmation
  if (saved) {
    return (
      <div className="mx-3 my-2 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 dark:border-primary/50 dark:bg-primary/10 p-3">
        <Check
          className="h-5 w-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p className="flex-1 text-sm">
          Maintenance reminder saved for{" "}
          <strong className="font-medium">{product.productName}</strong>.
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground motion-safe:transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-3 my-2 rounded-lg border border-primary/30 bg-primary/5 dark:border-primary/50 dark:bg-primary/10 p-3">
      <div className="flex items-start gap-3">
        <Bell
          className="mt-0.5 h-5 w-5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            Set a maintenance reminder?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Get reminded to check on your{" "}
            <strong className="font-medium">{product.productName}</strong>{" "}
            periodically.
          </p>

          {/* Interval selection */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REMINDER_INTERVALS.map((interval) => (
              <button
                key={interval.days}
                type="button"
                onClick={() => setSelectedInterval(interval.days)}
                aria-label={`Set maintenance reminder every ${interval.label.toLowerCase()}`}
                className={`cursor-pointer rounded-full border px-4 py-2 text-xs min-h-[44px] motion-safe:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  selectedInterval === interval.days
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
              >
                {interval.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={handleSave}
              disabled={selectedInterval === null}
            >
              Save Reminder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="cursor-pointer"
            >
              No thanks
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground motion-safe:transition-colors cursor-pointer"
          aria-label="Dismiss maintenance reminder prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
