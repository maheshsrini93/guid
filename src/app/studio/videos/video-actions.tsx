"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { approveVideo, rejectVideo } from "@/lib/actions/videos";
import { Check, X, Loader2 } from "lucide-react";

interface VideoActionsProps {
  videoId: string;
  status: string;
}

export function VideoActions({ videoId, status }: VideoActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  function handleApprove() {
    setError("");
    startTransition(async () => {
      try {
        await approveVideo(videoId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to approve");
      }
    });
  }

  function handleReject() {
    if (!notesInput.trim()) return;
    setError("");
    startTransition(async () => {
      try {
        await rejectVideo(videoId, notesInput.trim());
        setShowRejectInput(false);
        setNotesInput("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reject");
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

  const errorBanner = error ? (
    <p className="text-sm text-destructive" role="alert">
      {error}
    </p>
  ) : null;

  if (status === "pending") {
    return (
      <div className="space-y-2">
        {errorBanner}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleApprove} className="cursor-pointer">
            <Check className="mr-1 h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowRejectInput(true)}
            className="cursor-pointer"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
        {showRejectInput && (
          <div className="flex items-center gap-2">
            <label htmlFor={`reject-notes-${videoId}`} className="sr-only">
              Rejection reason
            </label>
            <input
              id={`reject-notes-${videoId}`}
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Reason for rejection..."
              className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button size="sm" onClick={handleReject} className="cursor-pointer">
              Send
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowRejectInput(false);
                setNotesInput("");
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (status === "approved") {
    return (
      <span className="text-xs font-medium text-green-700 dark:text-green-400">
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="text-xs font-medium text-destructive">Rejected</span>
    );
  }

  return null;
}
