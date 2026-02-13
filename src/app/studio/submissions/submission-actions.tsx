"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  approveSubmission,
  rejectSubmission,
  requestMoreInfo,
  reApproveSubmission,
  generateFromSubmission,
} from "@/lib/actions/submissions";
import { Check, X, MessageSquare, Loader2, Sparkles } from "lucide-react";

interface SubmissionActionsProps {
  submissionId: string;
  status: string;
}

export function SubmissionActions({
  submissionId,
  status,
}: SubmissionActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [showNotesFor, setShowNotesFor] = useState<
    "reject" | "info" | null
  >(null);

  function handleApprove() {
    setError("");
    startTransition(async () => {
      try {
        await approveSubmission(submissionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to approve");
      }
    });
  }

  function handleReApprove() {
    setError("");
    startTransition(async () => {
      try {
        await reApproveSubmission(submissionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to re-approve");
      }
    });
  }

  function handleReject() {
    if (!notesInput.trim()) return;
    setError("");
    startTransition(async () => {
      try {
        await rejectSubmission(submissionId, notesInput.trim());
        setShowNotesFor(null);
        setNotesInput("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reject");
      }
    });
  }

  function handleRequestInfo() {
    if (!notesInput.trim()) return;
    setError("");
    startTransition(async () => {
      try {
        await requestMoreInfo(submissionId, notesInput.trim());
        setShowNotesFor(null);
        setNotesInput("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send request");
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
    <p className="text-sm text-destructive" role="alert">{error}</p>
  ) : null;

  if (status === "pending") {
    return (
      <div className="space-y-2">
        {errorBanner}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            className="cursor-pointer"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowNotesFor("reject")}
            className="cursor-pointer"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Reject
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNotesFor("info")}
            className="cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1" />
            Request Info
          </Button>
        </div>
        {showNotesFor && (
          <div className="flex items-center gap-2">
            <label htmlFor={`notes-${submissionId}`} className="sr-only">
              {showNotesFor === "reject" ? "Rejection reason" : "Information needed"}
            </label>
            <input
              id={`notes-${submissionId}`}
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder={
                showNotesFor === "reject"
                  ? "Reason for rejection..."
                  : "What info is needed..."
              }
              className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              size="sm"
              onClick={
                showNotesFor === "reject" ? handleReject : handleRequestInfo
              }
              className="cursor-pointer"
            >
              Send
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowNotesFor(null);
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
      <div className="space-y-2">
        {errorBanner}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setError("");
            startTransition(async () => {
              try {
                await generateFromSubmission(submissionId);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to generate");
              }
            });
          }}
          className="cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          Generate Guide
        </Button>
      </div>
    );
  }

  // rejected or needs_info — allow re-approval
  if (status === "rejected" || status === "needs_info") {
    return (
      <div className="space-y-2">
        {errorBanner}
        <Button
          size="sm"
          variant="outline"
          onClick={handleReApprove}
          className="cursor-pointer"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Re-approve
        </Button>
      </div>
    );
  }

  // processing — no actions
  return (
    <span className="text-xs text-muted-foreground">Processing...</span>
  );
}
