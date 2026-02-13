"use client";

import { useState } from "react";
import { CheckCircle, Copy, Share2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompletionScreenProps {
  totalSteps: number;
  guideTitle: string;
}

export function CompletionScreen({
  totalSteps,
  guideTitle,
}: CompletionScreenProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <section
      className="mx-auto max-w-lg rounded-xl border-2 border-primary/30 bg-gradient-to-b from-primary/5 to-transparent p-8 text-center"
      aria-label="Guide complete"
    >
      {/* Checkmark */}
      <div className="mb-4 inline-flex size-16 items-center justify-center rounded-full bg-[oklch(0.65_0.18_145/0.15)]">
        <CheckCircle
          className="size-8 text-[oklch(0.65_0.18_145)]"
          aria-hidden="true"
        />
      </div>

      <h2 className="mb-2">Guide Complete</h2>
      <p className="text-body-sm text-muted-foreground">
        You finished all {totalSteps} steps of &quot;{guideTitle}&quot;.
      </p>

      {/* Rating prompt */}
      <div className="mt-6">
        <p className="mb-3 text-sm font-medium">Was this guide helpful?</p>
        <div className="flex items-center justify-center gap-1" role="radiogroup" aria-label="Rate this guide">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="cursor-pointer p-1 transition-transform duration-200 ease-out hover:scale-110"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            >
              <Star
                className={`size-8 ${
                  star <= (hoveredStar || rating)
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="mt-2 text-caption text-muted-foreground">
            Thanks for your feedback!
          </p>
        )}
      </div>

      {/* Share buttons */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyLink}
          className="gap-1.5"
        >
          <Copy className="size-4" aria-hidden="true" />
          {copied ? "Copied!" : "Copy link"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          asChild
        >
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just assembled my ${guideTitle} using Guid!`)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Share2 className="size-4" aria-hidden="true" />
            Share
          </a>
        </Button>
      </div>
    </section>
  );
}
