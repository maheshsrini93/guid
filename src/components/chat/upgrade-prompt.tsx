"use client";

import { useCallback } from "react";
import Link from "next/link";
import { MessageSquare, Sparkles, Camera, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Callback to dismiss the modal */
  onDismiss: () => void;
}

const VALUE_PROPS = [
  {
    icon: MessageSquare,
    title: "Unlimited chats",
    description: "No monthly limits on troubleshooting conversations",
  },
  {
    icon: Zap,
    title: "Priority AI responses",
    description: "Faster response times with dedicated capacity",
  },
  {
    icon: Camera,
    title: "Photo diagnosis",
    description: "Unlimited photo-based part identification",
  },
  {
    icon: Sparkles,
    title: "Advanced troubleshooting",
    description: "Access to more detailed repair guides and solutions",
  },
];

/**
 * Modal shown when the user's free tier chat limit has been reached.
 * Presents the premium upgrade value proposition with a link to the
 * future /pricing page. Dismissible — doesn't block the entire UI.
 */
export function UpgradePrompt({ open, onDismiss }: UpgradePromptProps) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onDismiss();
    },
    [onDismiss]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <div className="relative w-full max-w-md rounded-xl border bg-background p-6 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground motion-safe:transition-colors cursor-pointer"
          aria-label="Dismiss upgrade prompt"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center">
          <div
            className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20"
            aria-hidden="true"
          >
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h2 id="upgrade-title" className="text-lg font-semibold">
            Monthly chat limit reached
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You've used all 3 free troubleshooting chats this month.
            Upgrade for unlimited access.
          </p>
        </div>

        {/* Value props */}
        <div className="mt-5 space-y-3">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title} className="flex items-start gap-3">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted"
                aria-hidden="true"
              >
                <prop.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{prop.title}</p>
                <p className="text-xs text-muted-foreground">
                  {prop.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild className="cursor-pointer">
            <Link href="/pricing">View Plans</Link>
          </Button>
          <Button
            variant="ghost"
            className="cursor-pointer text-muted-foreground"
            onClick={onDismiss}
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
