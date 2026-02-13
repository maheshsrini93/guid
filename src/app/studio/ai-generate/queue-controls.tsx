"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  cancelJob,
  requeueJob,
} from "@/lib/actions/job-queue";

/**
 * "Process Next" button — triggers the queue worker API route once.
 */
export function ProcessNextButton({ queuedCount }: { queuedCount: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/queue/process", {
          method: "POST",
        });
        const result = await response.json();
        if (result.status === "no_jobs") {
          setMessage("No jobs in queue");
        } else if (result.status === "completed") {
          setMessage(`Processed: ${result.productName || result.jobId}`);
        } else if (result.status === "failed") {
          setMessage(`Failed: ${result.error}`);
        }
        router.refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Processing failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={handleClick}
        disabled={isPending || queuedCount === 0}
        className="cursor-pointer"
      >
        {isPending ? "Processing..." : "Process Next"}
      </Button>
      {message && (
        <span className="text-xs text-muted-foreground">{message}</span>
      )}
    </div>
  );
}

/**
 * "Process All" button — continuously processes the queue until empty or stopped.
 * Calls /api/queue/process in a loop with a delay between each call.
 */
export function ProcessAllButton({ queuedCount }: { queuedCount: number }) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, failed: 0 });
  const stopRef = useRef(false);

  const MAX_ITERATIONS = 500;

  const handleStart = useCallback(async () => {
    setIsRunning(true);
    setProgress({ completed: 0, failed: 0 });
    stopRef.current = false;

    let completed = 0;
    let failed = 0;
    let iterations = 0;

    while (!stopRef.current && iterations < MAX_ITERATIONS) {
      iterations++;
      try {
        const response = await fetch("/api/queue/process", {
          method: "POST",
        });
        const result = await response.json();

        if (result.status === "no_jobs") {
          break;
        }

        if (result.status === "at_capacity") {
          // Wait and retry when at capacity
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        if (result.status === "completed") {
          completed++;
        } else if (result.status === "failed") {
          failed++;
        }

        setProgress({ completed, failed });

        // Brief pause between jobs to avoid overwhelming the API
        await new Promise((r) => setTimeout(r, 1000));
      } catch {
        failed++;
        setProgress({ completed, failed });
        break;
      }
    }

    setIsRunning(false);
    router.refresh();
  }, [router]);

  function handleStop() {
    stopRef.current = true;
  }

  if (isRunning) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={handleStop}
          className="cursor-pointer"
        >
          Stop
        </Button>
        <span className="text-xs text-muted-foreground">
          {progress.completed} done{progress.failed > 0 && `, ${progress.failed} failed`}...
        </span>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleStart}
      disabled={queuedCount === 0}
      className="cursor-pointer"
    >
      Process All ({queuedCount})
    </Button>
  );
}

/**
 * Cancel button for a queued job.
 */
export function CancelJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    startTransition(async () => {
      await cancelJob(jobId);
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCancel}
      disabled={isPending}
      className="h-7 text-xs cursor-pointer"
    >
      {isPending ? "..." : "Cancel"}
    </Button>
  );
}

/**
 * Retry button for a failed job.
 */
export function RetryJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    startTransition(async () => {
      await requeueJob(jobId);
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRetry}
      disabled={isPending}
      className="h-7 text-xs cursor-pointer"
    >
      {isPending ? "..." : "Retry"}
    </Button>
  );
}
