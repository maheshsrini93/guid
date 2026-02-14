import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme";
import { borderRadius, spacing } from "../../theme/spacing";
import { fontFamily } from "../../theme/typography";
import type { ChatMessage } from "../../hooks/useChat";

interface MessageBubbleProps {
  message: ChatMessage;
}

/**
 * Renders a single chat message bubble.
 * - User: amber background, right-aligned, rounded (no bottom-right radius)
 * - Assistant: muted background, left-aligned, rounded (no bottom-left radius)
 * - Supports inline **bold** and `code` formatting
 * - Displays attached images
 */
export function MessageBubble({ message }: MessageBubbleProps) {
  const { colors } = useTheme();
  const isUser = message.role === "user";

  return (
    <View
      style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${isUser ? "You" : "Assistant"}: ${message.content}`}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? {
                backgroundColor: colors.primary,
                borderBottomRightRadius: 4,
              }
            : {
                backgroundColor: colors.muted,
                borderBottomLeftRadius: 4,
              },
        ]}
      >
        {message.imageUri && (
          <Image
            source={{ uri: message.imageUri }}
            style={styles.image}
            accessibilityLabel="Attached image"
          />
        )}
        {message.content ? (
          <FormattedText
            text={message.content}
            color={isUser ? colors.primaryForeground : colors.foreground}
          />
        ) : null}
      </View>
    </View>
  );
}

/**
 * Simple markdown-like text renderer.
 * Handles **bold** and `inline code` within a message.
 */
function FormattedText({ text, color }: { text: string; color: string }) {
  const { colors } = useTheme();

  // Split by bold (**...**) and code (`...`) patterns
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <Text variant="body" color={color} style={styles.messageText}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Text
              key={i}
              variant="body"
              color={color}
              style={styles.bold}
            >
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <Text
              key={i}
              variant="mono"
              color={color}
              style={{
                backgroundColor: colors.secondary,
                paddingHorizontal: 4,
              }}
            >
              {part.slice(1, -1)}
            </Text>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  rowRight: {
    alignItems: "flex-end",
  },
  rowLeft: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: borderRadius.md,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bold: {
    fontFamily: fontFamily.semibold,
  },
});
