"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import type { ChatMessage } from "./types";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  /** Called when user scrolls to top (for loading older messages) */
  onScrollTop?: () => void;
}

export function MessageList({
  messages,
  isStreaming = false,
  onScrollTop,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(messages.length);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current || isStreaming) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, messages[messages.length - 1]?.content, isStreaming]);

  // Detect scroll to top for infinite history loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onScrollTop) return;

    const handleScroll = () => {
      if (container.scrollTop === 0) {
        onScrollTop();
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [onScrollTop]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3" role="list">
        {messages.map((msg, idx) => {
          // Show avatar for first assistant message or when role changes
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const showAvatar =
            msg.role === "assistant" &&
            (!prevMsg || prevMsg.role !== "assistant");

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              showAvatar={showAvatar}
            />
          );
        })}

        {/* Typing indicator while streaming and no content yet */}
        {isStreaming &&
          (messages.length === 0 ||
            messages[messages.length - 1]?.role === "user") && (
            <TypingIndicator />
          )}
      </div>

      {/* Scroll anchor */}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
