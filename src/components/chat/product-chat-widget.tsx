"use client";

import { useCallback, useState } from "react";
import { GreetingBubble } from "./greeting-bubble";
import { ChatPanel } from "./chat-panel";
import { useChat } from "./use-chat";
import type { ChatProductContext } from "./types";

interface ProductChatWidgetProps {
  product: ChatProductContext;
}

/**
 * Floating chat widget for product pages.
 *
 * Shows a GreetingBubble (FAB + proactive greeting), and when opened,
 * renders a ChatPanel in a fixed side panel (desktop) or bottom sheet (mobile).
 * Product context is pre-loaded, so diagnostic intake skips product identification.
 */
export function ProductChatWidget({ product }: ProductChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sessionId, isStreaming, limitReached, sendMessage, guideRedirect, dismissGuideRedirect } = useChat({
    productId: product.productId,
  });

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {/* Greeting bubble / FAB (hidden when chat panel is open) */}
      {!isOpen && (
        <GreetingBubble
          onOpen={handleOpen}
          productName={product.productName}
        />
      )}

      {/* Chat panel overlay */}
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-[69] bg-black/30 sm:hidden"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Panel container */}
          <div
            className="fixed bottom-0 right-0 z-[70] w-full sm:bottom-6 sm:right-6 sm:w-96 sm:max-h-[600px] h-[85vh] sm:h-auto"
          >
            <ChatPanel
              product={product}
              messages={messages}
              isStreaming={isStreaming}
              sessionId={sessionId}
              onSendMessage={sendMessage}
              onClose={handleClose}
              onMinimize={handleClose}
              limitReached={limitReached}
              guideRedirect={guideRedirect}
              onDismissGuideRedirect={dismissGuideRedirect}
            />
          </div>
        </>
      )}
    </>
  );
}
