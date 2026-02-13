"use client";

import { ChatPanel } from "@/components/chat";
import { useChat } from "@/components/chat/use-chat";

export function ChatPageClient() {
  const { messages, sessionId, isStreaming, limitReached, sendMessage, guideRedirect, dismissGuideRedirect } = useChat();

  return (
    <main className="mx-auto flex h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Troubleshooting Chat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe your product and issue. Our assistant will help you
          troubleshoot, find parts, or walk you through a fix.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <ChatPanel
          messages={messages}
          isStreaming={isStreaming}
          sessionId={sessionId}
          onSendMessage={sendMessage}
          limitReached={limitReached}
          guideRedirect={guideRedirect}
          onDismissGuideRedirect={dismissGuideRedirect}
        />
      </div>
    </main>
  );
}
