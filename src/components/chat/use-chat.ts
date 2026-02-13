"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "./types";

interface UseChatOptions {
  /** Product ID for product-specific chat context */
  productId?: number;
  /** Existing session ID to resume */
  sessionId?: string | null;
}

export interface GuideRedirectSuggestion {
  articleNumber: string;
  productName: string | null;
  guideExists: boolean;
}

interface UseChatReturn {
  messages: ChatMessage[];
  sessionId: string | null;
  isStreaming: boolean;
  error: string | null;
  /** True when the free tier monthly chat limit has been reached */
  limitReached: boolean;
  /** If assembly intent detected on first message, contains guide redirect info */
  guideRedirect: GuideRedirectSuggestion | null;
  dismissGuideRedirect: () => void;
  sendMessage: (message: string, imageBase64?: string, imageMimeType?: string) => void;
  clearError: () => void;
  resetChat: () => void;
}

/**
 * Hook for managing chat state and streaming communication with /api/chat.
 *
 * Parses SSE events from the streaming endpoint:
 *   - {"type":"session","sessionId":"..."} — first event
 *   - {"type":"delta","content":"..."} — streamed text chunks
 *   - {"type":"done","messageId":"..."} — stream complete
 *   - {"type":"error","message":"..."} — error event
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(
    options.sessionId ?? null
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [guideRedirect, setGuideRedirect] =
    useState<GuideRedirectSuggestion | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message: string, imageBase64?: string, imageMimeType?: string) => {
      // Add user message to list immediately
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        imageUrl: imageBase64
          ? `data:${imageMimeType ?? "image/jpeg"};base64,${imageBase64.slice(0, 100)}...`
          : null,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setError(null);

      // Abort any previous stream
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            sessionId,
            productId: options.productId,
            ...(imageBase64 && imageMimeType
              ? { imageBase64, imageMimeType }
              : {}),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          if (body.code === "LIMIT_REACHED") {
            setLimitReached(true);
          }
          throw new Error(
            body.error ?? `Chat request failed (${response.status})`
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response stream");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let assistantMsgId = `assistant-${Date.now()}`;
        let assistantContent = "";
        let isFirstDelta = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              switch (event.type) {
                case "session":
                  setSessionId(event.sessionId);
                  break;

                case "intent":
                  if (event.guideRedirect) {
                    setGuideRedirect(event.guideRedirect);
                  }
                  break;

                case "delta":
                  assistantContent += event.content;
                  if (isFirstDelta) {
                    // Add new assistant message
                    isFirstDelta = false;
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: assistantMsgId,
                        role: "assistant",
                        content: assistantContent,
                        createdAt: new Date(),
                      },
                    ]);
                  } else {
                    // Update existing assistant message with accumulated content
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, content: assistantContent }
                          : m
                      )
                    );
                  }
                  break;

                case "done":
                  // Update the assistant message ID to the real DB ID
                  if (event.messageId) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, id: event.messageId }
                          : m
                      )
                    );
                  }
                  break;

                case "error":
                  setError(event.message ?? "An error occurred");
                  break;
              }
            } catch {
              // Malformed JSON line — skip
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User-initiated abort — not an error
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to send message"
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, options.productId]
  );

  const clearError = useCallback(() => setError(null), []);

  const dismissGuideRedirect = useCallback(
    () => setGuideRedirect(null),
    []
  );

  const resetChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setIsStreaming(false);
    setError(null);
    setLimitReached(false);
    setGuideRedirect(null);
  }, []);

  return {
    messages,
    sessionId,
    isStreaming,
    error,
    limitReached,
    guideRedirect,
    dismissGuideRedirect,
    sendMessage,
    clearError,
    resetChat,
  };
}
