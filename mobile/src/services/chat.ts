import { apiClient } from "../lib/api-client";

export interface ChatSessionPreview {
  id: string;
  status: string;
  createdAt: string;
  productName: string | null;
  articleNumber: string | null;
  preview: string;
}

export interface ChatMessageRecord {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl: string | null;
  createdAt: string;
}

/** Fetch all chat sessions for the authenticated user. */
export function getSessions() {
  return apiClient.get<ChatSessionPreview[]>("/api/chat/sessions");
}

/** Fetch all messages for a specific chat session. */
export function getSessionMessages(sessionId: string) {
  return apiClient.get<ChatMessageRecord[]>(
    `/api/chat/${sessionId}/messages`
  );
}
