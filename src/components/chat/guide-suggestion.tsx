"use client";

import Link from "next/link";
import { BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuideRedirectSuggestion } from "./use-chat";

interface GuideSuggestionProps {
  redirect: GuideRedirectSuggestion;
  onDismiss: () => void;
}

/**
 * Inline banner shown in the chat when assembly intent is detected
 * and a published guide exists for the product. Offers a direct link
 * to the step-by-step guide instead of troubleshooting chat.
 */
export function GuideSuggestion({ redirect, onDismiss }: GuideSuggestionProps) {
  return (
    <div
      role="status"
      className="mx-3 my-2 flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 dark:border-primary/50 dark:bg-primary/10 p-3"
    >
      <BookOpen
        className="mt-0.5 h-5 w-5 shrink-0 text-primary"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          It looks like you need assembly help
          {redirect.productName ? ` with ${redirect.productName}` : ""}.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Would you like to view the step-by-step guide instead?
        </p>
        <div className="mt-2 flex gap-2">
          <Button asChild size="sm" className="cursor-pointer">
            <Link href={`/products/${redirect.articleNumber}`}>
              View Guide
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="cursor-pointer"
          >
            Continue chatting
          </Button>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-muted-foreground hover:text-foreground motion-safe:transition-colors cursor-pointer"
        aria-label="Dismiss guide suggestion"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
