"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enqueueBatchAction } from "@/lib/actions/queue-actions";

interface BatchEnqueueProps {
  /** Total products with assembly docs but no active job and guide_status "none" */
  eligibleCount: number;
}

export function BatchEnqueueButton({ eligibleCount }: BatchEnqueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [batchSize, setBatchSize] = useState("50");
  const [priority, setPriority] = useState<"high" | "normal" | "low">("normal");
  const [result, setResult] = useState<{ queued: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const size = Math.min(Math.max(1, parseInt(batchSize, 10) || 50), 500);
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        // Fetch eligible product IDs from the API
        const response = await fetch(
          `/api/queue/eligible?limit=${size}`
        );
        if (!response.ok) {
          setError("Failed to fetch eligible products");
          return;
        }
        const { productIds } = await response.json();

        if (!productIds || productIds.length === 0) {
          setError("No eligible products found");
          return;
        }

        const res = await enqueueBatchAction(productIds, { priority });
        if (!res.success) {
          setError(res.error ?? "Batch enqueue failed");
          return;
        }
        setResult({ queued: res.queued, skipped: res.skipped });
        router.refresh();
      } catch {
        setError("Batch enqueue failed");
      }
    });
  }

  if (!showForm) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowForm(true)}
        disabled={eligibleCount === 0}
        className="cursor-pointer"
      >
        Batch Enqueue ({eligibleCount} eligible)
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold">Batch Enqueue Products</h3>
      <p className="text-xs text-muted-foreground">
        Enqueue products that have assembly PDFs but no active generation job.
      </p>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {result && (
        <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          Queued {result.queued} jobs, skipped {result.skipped}
        </div>
      )}

      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-1">
          <Label htmlFor="batch-size" className="text-xs">
            Batch Size (max 500)
          </Label>
          <Input
            id="batch-size"
            type="number"
            min="1"
            max="500"
            value={batchSize}
            onChange={(e) => setBatchSize(e.target.value)}
            className="w-24"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="batch-priority" className="text-xs">
            Priority
          </Label>
          <select
            id="batch-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as "high" | "normal" | "low")}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
        <Button type="submit" size="sm" disabled={isPending} className="cursor-pointer">
          {isPending ? "Queueing..." : "Enqueue"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setShowForm(false);
            setResult(null);
            setError(null);
          }}
          disabled={isPending}
          className="cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
