"use client";

import { useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { castVideoVote } from "@/lib/actions/video-votes";

interface VideoVoteButtonsProps {
  videoSubmissionId: string;
  initialHelpfulVotes: number;
  initialUnhelpfulVotes: number;
  initialUserVote?: "up" | "down" | null;
}

export function VideoVoteButtons({
  videoSubmissionId,
  initialHelpfulVotes,
  initialUnhelpfulVotes,
  initialUserVote = null,
}: VideoVoteButtonsProps) {
  const [helpfulVotes, setHelpfulVotes] = useState(initialHelpfulVotes);
  const [unhelpfulVotes, setUnhelpfulVotes] = useState(initialUnhelpfulVotes);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(
    initialUserVote
  );
  const [isPending, startTransition] = useTransition();

  function handleVote(vote: "up" | "down") {
    startTransition(async () => {
      const result = await castVideoVote(videoSubmissionId, vote);
      if (result.success) {
        setHelpfulVotes(result.helpfulVotes ?? helpfulVotes);
        setUnhelpfulVotes(result.unhelpfulVotes ?? unhelpfulVotes);
        setUserVote(result.userVote ?? null);
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleVote("up")}
        disabled={isPending}
        aria-label={`Helpful (${helpfulVotes})`}
        aria-pressed={userVote === "up"}
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          userVote === "up"
            ? "bg-primary/10 text-primary dark:bg-primary/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-mono">{helpfulVotes}</span>
      </button>
      <button
        type="button"
        onClick={() => handleVote("down")}
        disabled={isPending}
        aria-label={`Not helpful (${unhelpfulVotes})`}
        aria-pressed={userVote === "down"}
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          userVote === "down"
            ? "bg-destructive/10 text-destructive dark:bg-destructive/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-mono">{unhelpfulVotes}</span>
      </button>
    </div>
  );
}
