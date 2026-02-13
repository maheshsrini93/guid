"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, SendHorizontal } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onImageSelect?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onImageSelect,
  disabled = false,
  placeholder = "Describe your issue...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      // Auto-resize textarea up to 120px
      const el = e.target;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    },
    []
  );

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onImageSelect) {
        onImageSelect(file);
      }
      // Reset so same file can be selected again
      e.target.value = "";
    },
    [onImageSelect]
  );

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="flex items-end gap-2 border-t bg-background p-3">
      {/* Image attach button */}
      {onImageSelect && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 cursor-pointer"
            onClick={handleImageClick}
            disabled={disabled}
            aria-label="Attach image"
          >
            <Camera className="size-5" aria-hidden="true" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}

      {/* Text input */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border bg-background px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Chat message"
      />

      {/* Send button */}
      <Button
        type="button"
        size="icon"
        className="size-10 shrink-0 cursor-pointer"
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
      >
        <SendHorizontal className="size-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
