"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  approveGenerationJob,
  rejectGenerationJob,
} from "@/lib/actions/ai-generation";

interface JobReviewActionsProps {
  jobId: string;
}

export function JobReviewActions({ jobId }: JobReviewActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveGenerationJob(jobId);
      if (!result.success) {
        setError(result.error || "Failed to approve");
      } else {
        router.push("/studio/ai-generate");
      }
    });
  }

  function handleReject() {
    if (!rejectNotes.trim()) {
      setError("Please provide rejection notes");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectGenerationJob(jobId, rejectNotes);
      if (!result.success) {
        setError(result.error || "Failed to reject");
      } else {
        router.push("/studio/ai-generate");
      }
    });
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">Review Actions</h2>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {showRejectForm ? (
        <div className="space-y-3">
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Explain why this guide is being rejected..."
            className="w-full rounded-md border px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReject}
              disabled={isPending}
            >
              {isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowRejectForm(false);
                setRejectNotes("");
                setError(null);
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <Button
            onClick={handleApprove}
            disabled={isPending}
            className="cursor-pointer"
          >
            {isPending ? "Approving..." : "Approve & Publish"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowRejectForm(true)}
            disabled={isPending}
            className="cursor-pointer"
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
