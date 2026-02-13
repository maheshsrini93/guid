"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RunSyncButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    newProducts?: number;
    jobsQueued?: number;
    errors?: number;
    error?: string;
  } | null>(null);

  async function handleSync() {
    setRunning(true);
    setResult(null);

    try {
      const res = await fetch("/api/cron/catalog-sync");
      const data = await res.json();

      if (!res.ok) {
        setResult({ success: false, error: data.error || "Sync failed" });
      } else {
        setResult({
          success: true,
          newProducts: data.newProducts,
          jobsQueued: data.jobsQueued,
          errors: data.errors,
        });
        router.refresh();
      }
    } catch {
      setResult({ success: false, error: "Network error" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span
          className={`text-xs ${
            result.success
              ? "text-green-600 dark:text-green-400"
              : "text-destructive"
          }`}
        >
          {result.success
            ? `Done: ${result.newProducts} new, ${result.jobsQueued} queued${result.errors ? `, ${result.errors} errors` : ""}`
            : result.error}
        </span>
      )}
      <Button
        onClick={handleSync}
        disabled={running}
        size="sm"
        className="cursor-pointer"
      >
        {running ? "Syncing..." : "Run Sync Now"}
      </Button>
    </div>
  );
}
