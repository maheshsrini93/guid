"use client";

import { useMemo } from "react";
import { MessageSquare } from "lucide-react";
import type { ChatMessage } from "./types";

/**
 * Lightweight inline markdown renderer for assistant messages.
 * Handles **bold**, bullet lists (- item), and numbered lists (1. item).
 * Avoids pulling in a full markdown library for chat bubbles.
 */
function renderSimpleMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Render bold markers: **text** -> <strong>text</strong>
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    // Bullet list item
    if (/^[-*]\s/.test(line)) {
      nodes.push(
        <div key={i} className="flex gap-1.5 pl-2">
          <span className="shrink-0 text-muted-foreground" aria-hidden="true">
            &bull;
          </span>
          <span>{rendered.map((r, ri) => (typeof r === "string" ? r.replace(/^[-*]\s/, "") : r))}</span>
        </div>
      );
      continue;
    }

    // Numbered list item
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      nodes.push(
        <div key={i} className="flex gap-1.5 pl-2">
          <span className="shrink-0 text-muted-foreground">{num}.</span>
          <span>{rendered.map((r, ri) => (typeof r === "string" ? r.replace(/^\d+\.\s/, "") : r))}</span>
        </div>
      );
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      nodes.push(<div key={i} className="h-2" />);
      continue;
    }

    // Regular line
    nodes.push(<div key={i}>{rendered}</div>);
  }

  return nodes;
}

interface MessageBubbleProps {
  message: ChatMessage;
  /** Whether to show the assistant avatar (first message in a group) */
  showAvatar?: boolean;
}

export function MessageBubble({ message, showAvatar = true }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const renderedContent = useMemo(
    () => (!isUser && message.content ? renderSimpleMarkdown(message.content) : null),
    [isUser, message.content]
  );

  return (
    <div
      className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      role="listitem"
    >
      {/* Avatar (assistant only) */}
      {!isUser && showAvatar ? (
        <div
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground mt-1"
          aria-hidden="true"
        >
          <MessageSquare className="size-3.5" />
        </div>
      ) : !isUser ? (
        <div className="size-6 shrink-0" aria-hidden="true" />
      ) : null}

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}
      >
        {/* Image attachment — uses <img> because src may be a data URI (base64 user upload) */}
        {message.imageUrl && (
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.imageUrl}
              alt="Attached image"
              className="max-h-48 rounded-lg object-cover"
            />
          </div>
        )}

        {/* Message text */}
        {message.content && (
          isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
          ) : (
            <div className="text-sm leading-relaxed space-y-0.5">
              {renderedContent}
            </div>
          )
        )}

        {/* Timestamp */}
        <time
          dateTime={message.createdAt.toISOString()}
          className={`mt-1 block text-[11px] ${
            isUser
              ? "text-primary-foreground/60"
              : "text-muted-foreground"
          }`}
        >
          {message.createdAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </div>
  );
}
