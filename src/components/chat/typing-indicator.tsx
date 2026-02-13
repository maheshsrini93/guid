"use client";

import { MessageSquare } from "lucide-react";

export function TypingIndicator() {
  return (
    <div className="flex gap-2" role="status" aria-label="Assistant is typing">
      {/* Avatar */}
      <div
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-1"
        aria-hidden="true"
      >
        <MessageSquare className="size-3.5" />
      </div>

      {/* Dots bubble */}
      <div className="rounded-xl bg-secondary px-4 py-3">
        <div className="flex gap-1">
          <span
            className="size-2 rounded-full bg-muted-foreground motion-safe:animate-[chat-dot_1.4s_ease-in-out_infinite]"
            aria-hidden="true"
          />
          <span
            className="size-2 rounded-full bg-muted-foreground motion-safe:animate-[chat-dot_1.4s_ease-in-out_0.2s_infinite]"
            aria-hidden="true"
          />
          <span
            className="size-2 rounded-full bg-muted-foreground motion-safe:animate-[chat-dot_1.4s_ease-in-out_0.4s_infinite]"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
