import type { Metadata } from "next";
import { ChatPageClient } from "./chat-page-client";

export const metadata: Metadata = {
  title: "Troubleshooting Chat",
  description:
    "Get help with any product issue. Describe your problem and our AI assistant will walk you through a fix, help identify parts, or connect you with support.",
  openGraph: {
    title: "Product Troubleshooting Chat | Guid",
    description:
      "AI-powered troubleshooting for any product. Describe your issue and get step-by-step help.",
  },
};

export default function ChatPage() {
  return <ChatPageClient />;
}
