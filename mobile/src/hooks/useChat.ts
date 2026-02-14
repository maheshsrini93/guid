import { useCallback, useRef, useState } from "react";
import { API_URL } from "../lib/config";
import { getToken } from "../lib/auth";
import { getSessionMessages } from "../services/chat";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
  createdAt: string;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  sendMessage: (content: string, imageBase64?: string, imageUri?: string) => Promise<void>;
  createSession: (productId?: number) => void;
  loadSession: (sessionId: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook that manages chat state and SSE streaming from the /api/chat endpoint.
 *
 * SSE event types from the backend:
 *   - {"type":"session","sessionId":"..."} — first event
 *   - {"type":"delta","content":"..."} — streamed text chunks
 *   - {"type":"done","messageId":"..."} — completion
 *   - {"type":"error","message":"..."} — errors
 */
export function useChat(initialProductId?: number): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const productIdRef = useRef<number | undefined>(initialProductId);
  const messageCounterRef = useRef(0);

  const createSession = useCallback((productId?: number) => {
    productIdRef.current = productId;
    setSessionId(null);
    setMessages([]);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const sendMessage = useCallback(
    async (content: string, imageBase64?: string, imageUri?: string) => {
      if (isStreaming) return;

      setError(null);
      setIsStreaming(true);

      // Add user message to list
      const userMsgId = `user-${++messageCounterRef.current}`;
      const userMessage: ChatMessage = {
        id: userMsgId,
        role: "user",
        content,
        imageUri,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add placeholder assistant message
      const assistantMsgId = `assistant-${++messageCounterRef.current}`;
      const assistantPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantPlaceholder]);

      try {
        const token = await getToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const body: Record<string, unknown> = {
          message: content,
          sessionId: sessionId ?? undefined,
          productId: productIdRef.current,
        };
        if (imageBase64) {
          body.imageBase64 = imageBase64;
          body.imageMimeType = "image/jpeg";
        }

        const res = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            (data as { error?: string }).error ?? `Chat request failed (${res.status})`
          );
        }

        // Process SSE events from the response.
        // Try ReadableStream first (works in dev builds with Hermes),
        // fall back to reading full text (works in Expo Go).
        const processEvent = (event: { type: string; content?: string; sessionId?: string; messageId?: string; message?: string }) => {
          switch (event.type) {
            case "session":
              setSessionId(event.sessionId ?? null);
              break;
            case "delta":
              if (event.content) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, content: msg.content + event.content }
                      : msg
                  )
                );
              }
              break;
            case "done":
              if (event.messageId) {
                const finalId = event.messageId;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMsgId
                      ? { ...msg, id: finalId }
                      : msg
                  )
                );
              }
              break;
            case "error":
              setError(event.message ?? "An error occurred");
              break;
          }
        };

        const parseSSELines = (text: string) => {
          const lines = text.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              processEvent(JSON.parse(jsonStr));
            } catch {
              // Skip malformed SSE data
            }
          }
        };

        if (res.body && typeof res.body.getReader === "function") {
          // Streaming path — live token-by-token updates
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            parseSSELines(lines.join("\n"));
          }
          // Process any remaining buffer
          if (buffer.trim()) parseSSELines(buffer);
        } else {
          // Fallback for Expo Go — read full response then parse all events at once
          const text = await res.text();
          parseSSELines(text);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to send message";
        setError(message);
        // Remove the empty assistant placeholder on error
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMsgId || msg.content.length > 0)
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, sessionId]
  );

  const loadSession = useCallback(async (existingSessionId: string) => {
    setIsLoading(true);
    setError(null);
    setSessionId(existingSessionId);
    try {
      const msgs = await getSessionMessages(existingSessionId);
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          imageUri: m.imageUrl ?? undefined,
          createdAt: m.createdAt,
        }))
      );
    } catch {
      setError("Failed to load chat history");
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    isStreaming,
    isLoading,
    error,
    sessionId,
    sendMessage,
    createSession,
    loadSession,
    clearError,
  };
}
