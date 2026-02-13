"use client";

import { MessageSquare, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatProductContext } from "./types";

interface ChatHeaderProps {
  product?: ChatProductContext | null;
  /** Number of chat sessions remaining this month (null = unknown/loading) */
  chatsRemaining?: number | null;
  onMinimize?: () => void;
  onClose?: () => void;
}

export function ChatHeader({ product, chatsRemaining, onMinimize, onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
      {/* Avatar + title */}
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-hidden="true"
      >
        <MessageSquare className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-card-foreground">
          Guid Assistant
        </h2>
        {product ? (
          <p className="truncate text-xs text-muted-foreground">
            Helping with{" "}
            <span className="font-mono">{product.articleNumber}</span>{" "}
            {product.productName}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Product troubleshooting
          </p>
        )}
      </div>

      {/* Usage badge */}
      {chatsRemaining != null && chatsRemaining <= 3 && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            chatsRemaining === 0
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {chatsRemaining === 0
            ? "Limit reached"
            : `${chatsRemaining} left`}
        </span>
      )}

      {/* Actions */}
      <div className="flex gap-1">
        {onMinimize && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 cursor-pointer"
            onClick={onMinimize}
            aria-label="Minimize chat"
          >
            <Minimize2 className="size-4" aria-hidden="true" />
          </Button>
        )}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 cursor-pointer"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
