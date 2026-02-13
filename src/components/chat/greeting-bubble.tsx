"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "guid-chat-greeting-dismissed";
const SHOW_DELAY_MS = 3000;

interface GreetingBubbleProps {
  /** Called when the user clicks to open the chat */
  onOpen: () => void;
  /** Product name for contextual greeting (optional) */
  productName?: string;
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

function saveDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "true");
  } catch {
    // localStorage unavailable
  }
}

export function GreetingBubble({ onOpen, productName }: GreetingBubbleProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  // Check dismissal and start delay timer
  useEffect(() => {
    if (isDismissed()) return;
    setDismissed(false);

    const timer = setTimeout(() => {
      setVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    saveDismissed();
    setVisible(false);
    setDismissed(true);
  }, []);

  const handleOpen = useCallback(() => {
    saveDismissed();
    setVisible(false);
    setDismissed(true);
    onOpen();
  }, [onOpen]);

  if (dismissed && !visible) return null;

  const greeting = productName
    ? `Having trouble with your ${productName}? I can help you troubleshoot.`
    : "Need help? I can help you troubleshoot, find replacement parts, or walk you through a fix.";

  return (
    <div
      className="fixed bottom-6 right-6 z-[70]"
    >
      {/* Greeting card */}
      {visible && (
        <button
          type="button"
          onClick={handleOpen}
          className="mb-3 flex max-w-72 cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 shadow-lg motion-safe:animate-[chat-bubble-enter_200ms_ease-out]"
        >
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            aria-hidden="true"
          >
            <MessageSquare className="size-4" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="text-sm font-medium text-card-foreground">
              Guid Assistant
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {greeting}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 cursor-pointer"
            onClick={handleDismiss}
            aria-label="Dismiss chat greeting"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </button>
      )}

      {/* Floating chat trigger button (always visible after dismissal or before delay) */}
      {!visible && (
        <Button
          size="icon"
          className="size-14 rounded-full shadow-lg cursor-pointer"
          onClick={handleOpen}
          aria-label="Open chat assistant"
        >
          <MessageSquare className="size-6" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
