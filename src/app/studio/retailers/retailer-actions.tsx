"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  toggleRetailerActive,
  triggerRetailerSync,
  updateRetailerConfig,
} from "@/lib/actions/retailers";
import {
  Power,
  RefreshCw,
  Loader2,
  Settings,
  X,
} from "lucide-react";

interface RetailerActionsProps {
  retailerId: string;
  isActive: boolean;
  rateLimitConfig: { requestsPerMinute: number; requestsPerDay: number } | null;
}

export function RetailerActions({
  retailerId,
  isActive,
  rateLimitConfig,
}: RetailerActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [rpm, setRpm] = useState(
    rateLimitConfig?.requestsPerMinute?.toString() ?? "60"
  );
  const [rpd, setRpd] = useState(
    rateLimitConfig?.requestsPerDay?.toString() ?? "10000"
  );

  function handleToggle() {
    setError("");
    setSyncMessage("");
    startTransition(async () => {
      try {
        await toggleRetailerActive(retailerId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to toggle status");
      }
    });
  }

  function handleSync() {
    setError("");
    setSyncMessage("");
    startTransition(async () => {
      try {
        await triggerRetailerSync(retailerId);
        setSyncMessage("Sync triggered successfully.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to trigger sync");
      }
    });
  }

  function handleSaveConfig() {
    setError("");
    const rpmNum = parseInt(rpm, 10);
    const rpdNum = parseInt(rpd, 10);
    if (isNaN(rpmNum) || rpmNum < 1) {
      setError("Requests per minute must be a positive number");
      return;
    }
    if (isNaN(rpdNum) || rpdNum < 1) {
      setError("Requests per day must be a positive number");
      return;
    }
    startTransition(async () => {
      try {
        await updateRetailerConfig(retailerId, {
          rateLimitConfig: {
            requestsPerMinute: rpmNum,
            requestsPerDay: rpdNum,
          },
        });
        setShowSettings(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save config");
      }
    });
  }

  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
        Updating...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {syncMessage && (
        <p className="text-sm text-green-700 dark:text-green-400">
          {syncMessage}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={isActive ? "outline" : "default"}
          onClick={handleToggle}
          className="cursor-pointer"
          aria-label={isActive ? "Deactivate retailer" : "Activate retailer"}
        >
          <Power className="h-3.5 w-3.5 mr-1" />
          {isActive ? "Deactivate" : "Activate"}
        </Button>

        {isActive && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            className="cursor-pointer"
            aria-label="Trigger manual sync"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Sync Now
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowSettings(!showSettings)}
          className="cursor-pointer"
          aria-label="Edit rate limit settings"
        >
          {showSettings ? (
            <X className="h-3.5 w-3.5" />
          ) : (
            <Settings className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {showSettings && (
        <div className="rounded-md border p-3 space-y-3 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">Rate Limits</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`rpm-${retailerId}`}
                className="text-xs text-muted-foreground"
              >
                Requests/min
              </label>
              <input
                id={`rpm-${retailerId}`}
                type="number"
                min="1"
                value={rpm}
                onChange={(e) => setRpm(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label
                htmlFor={`rpd-${retailerId}`}
                className="text-xs text-muted-foreground"
              >
                Requests/day
              </label>
              <input
                id={`rpd-${retailerId}`}
                type="number"
                min="1"
                value={rpd}
                onChange={(e) => setRpd(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-2 py-1 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSaveConfig}
            className="cursor-pointer"
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
