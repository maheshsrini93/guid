"use client";

import { useCallback, useRef, useState } from "react";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { ImagePreview } from "./image-preview";
import { DiagnosticIntake } from "./diagnostic-intake";
import { GuideSuggestion } from "./guide-suggestion";
import { EscalationCard } from "./escalation-card";
import { MaintenancePrompt } from "./maintenance-prompt";
import { useChatUsage } from "./use-chat-usage";
import { UpgradePrompt } from "./upgrade-prompt";
import type {
  ChatMessage,
  ChatProductContext,
  DiagnosticAnswers,
  IntakePhase,
} from "./types";
import type { GuideRedirectSuggestion } from "./use-chat";

/** Minimum number of messages before showing the escalation option */
const ESCALATION_THRESHOLD = 4;

interface ChatPanelProps {
  /** Pre-loaded product context (from product page widget) */
  product?: ChatProductContext | null;
  /** External message list (from ChatProvider) — if not provided, uses internal state */
  messages?: ChatMessage[];
  /** External streaming state */
  isStreaming?: boolean;
  /** Chat session ID for escalation summary generation */
  sessionId?: string | null;
  /** External send handler — if not provided, panel is "disconnected" (presentational only) */
  onSendMessage?: (message: string, imageBase64?: string, imageMimeType?: string) => void;
  /** Called when user scrolls to top for loading older messages */
  onLoadHistory?: () => void;
  /** Called to minimize the chat panel */
  onMinimize?: () => void;
  /** Called to close the chat panel */
  onClose?: () => void;
  /** Whether the user's free tier limit has been reached */
  limitReached?: boolean;
  /** Guide redirect suggestion from intent detection */
  guideRedirect?: GuideRedirectSuggestion | null;
  /** Dismiss the guide redirect suggestion */
  onDismissGuideRedirect?: () => void;
}

export function ChatPanel({
  product,
  messages: externalMessages,
  isStreaming = false,
  sessionId,
  onSendMessage,
  onLoadHistory,
  onMinimize,
  onClose,
  limitReached = false,
  guideRedirect,
  onDismissGuideRedirect,
}: ChatPanelProps) {
  // Internal state for when no external provider is connected
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const messages = externalMessages ?? internalMessages;

  // Diagnostic intake state
  const initialPhase: IntakePhase = product ? "category" : "product";
  const [intakeComplete, setIntakeComplete] = useState(false);
  const [intakeAnswers, setIntakeAnswers] = useState<DiagnosticAnswers | null>(null);

  // Chat usage tracking
  const { usage } = useChatUsage();

  // Upgrade prompt modal (shown when free tier limit reached)
  const [upgradePromptDismissed, setUpgradePromptDismissed] = useState(false);

  // Maintenance reminder prompt
  const [maintenanceDismissed, setMaintenanceDismissed] = useState(false);

  // Image attachment
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIntakeComplete = useCallback(
    (answers: DiagnosticAnswers) => {
      setIntakeAnswers(answers);
      setIntakeComplete(true);

      // Build the initial message from intake answers
      const parts: string[] = [];
      if (answers.productQuery) {
        parts.push(`Product: ${answers.productQuery}`);
      }
      if (product) {
        parts.push(`Product: ${product.productName} (${product.articleNumber})`);
      }
      if (answers.category) {
        const categoryLabel =
          { wobbling: "Wobbling/unstable", missing_part: "Missing part", broke: "Something broke", wont_move: "Won't close/open", other: "Other issue" }[answers.category] ?? answers.category;
        parts.push(`Issue: ${categoryLabel}`);
      }
      if (answers.timing) {
        const timingLabel =
          { just_happened: "Just happened", gradual: "Gradual over time", after_move: "After a move", unknown: "Not sure when it started" }[answers.timing] ?? answers.timing;
        parts.push(`When: ${timingLabel}`);
      }

      const initialMessage = parts.join("\n");
      if (initialMessage && onSendMessage) {
        onSendMessage(initialMessage);
      }
    },
    [product, onSendMessage]
  );

  const handleSend = useCallback(
    (message: string) => {
      if (!onSendMessage) {
        // Disconnected mode — add to internal messages for preview
        setInternalMessages((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            role: "user" as const,
            content: message,
            imageUrl: attachedPreview,
            createdAt: new Date(),
          },
        ]);
      } else if (attachedImage) {
        // Convert image to base64 and send
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          onSendMessage(message, base64, attachedImage.type);
        };
        reader.readAsDataURL(attachedImage);
      } else {
        onSendMessage(message);
      }

      // Clear attachment
      setAttachedImage(null);
      if (attachedPreview) {
        URL.revokeObjectURL(attachedPreview);
        setAttachedPreview(null);
      }
    },
    [onSendMessage, attachedImage, attachedPreview]
  );

  const handleImageSelect = useCallback((file: File) => {
    // Revoke previous preview URL
    setAttachedPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setAttachedImage(file);
  }, []);

  const handleRemoveImage = useCallback(() => {
    if (attachedPreview) {
      URL.revokeObjectURL(attachedPreview);
    }
    setAttachedImage(null);
    setAttachedPreview(null);
  }, [attachedPreview]);

  const handleImageRequest = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleImageSelect(file);
      e.target.value = "";
    },
    [handleImageSelect]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-background shadow-xl">
      <ChatHeader
        product={product}
        chatsRemaining={usage?.sessionsRemaining ?? null}
        onMinimize={onMinimize}
        onClose={onClose}
      />

      {/* Diagnostic intake (shown before free chat) */}
      {!intakeComplete && messages.length === 0 && (
        <DiagnosticIntake
          initialPhase={initialPhase}
          onComplete={handleIntakeComplete}
          onImageRequest={handleImageRequest}
          disabled={isStreaming}
        />
      )}

      {/* Guide redirect suggestion (assembly intent detected) */}
      {guideRedirect && onDismissGuideRedirect && (
        <GuideSuggestion
          redirect={guideRedirect}
          onDismiss={onDismissGuideRedirect}
        />
      )}

      {/* Message area */}
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        onScrollTop={onLoadHistory}
      />

      {/* Escalation card (shown after enough conversation) */}
      {messages.length >= ESCALATION_THRESHOLD && sessionId && (
        <EscalationCard sessionId={sessionId} />
      )}

      {/* Maintenance reminder prompt (shown when product known and enough conversation) */}
      {product && messages.length >= ESCALATION_THRESHOLD && !maintenanceDismissed && (
        <MaintenancePrompt
          product={product}
          onDismiss={() => setMaintenanceDismissed(true)}
        />
      )}

      {/* Image preview (when image is attached) */}
      {attachedPreview && (
        <ImagePreview previewUrl={attachedPreview} onRemove={handleRemoveImage} />
      )}

      {/* Chat input */}
      {intakeComplete && (
        <ChatInput
          onSend={handleSend}
          onImageSelect={handleImageSelect}
          disabled={isStreaming}
          placeholder={
            messages.length === 0
              ? "Describe your issue in more detail..."
              : "Type a message..."
          }
        />
      )}

      {/* Hidden file input for intake photo requests */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Upgrade prompt modal (when free tier limit reached) */}
      <UpgradePrompt
        open={limitReached && !upgradePromptDismissed}
        onDismiss={() => setUpgradePromptDismissed(true)}
      />
    </div>
  );
}
