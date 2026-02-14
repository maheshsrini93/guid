import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ImagePlus, Menu, Send } from "lucide-react-native";
import { Text } from "../../components/ui/Text";
import { useTheme } from "../../theme";
import { spacing, borderRadius } from "../../theme/spacing";
import { fontFamily } from "../../theme/typography";
import { useChat, type ChatMessage } from "../../hooks/useChat";
import { useAuth } from "../../lib/AuthContext";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { TypingIndicator } from "../../components/chat/TypingIndicator";
import {
  IntakeChips,
  type ProblemCategory,
  type TimingOption,
} from "../../components/chat/IntakeChips";
import {
  ChatImagePicker,
  ChatImagePreview,
} from "../../components/chat/ChatImagePicker";
import { ChatHistoryDrawer } from "../../components/chat/ChatHistoryDrawer";

type IntakeStep = "problem" | "timing" | "chat";

/**
 * Standalone chat tab — no product context.
 * Starts with a guided intake flow (problem category + timing) before
 * entering the full AI chat.
 */
export default function ChatScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    messages,
    isStreaming,
    isLoading,
    error,
    sessionId,
    sendMessage,
    createSession,
    loadSession,
    clearError,
  } = useChat();

  const [intakeStep, setIntakeStep] = useState<IntakeStep>("problem");
  const [selectedProblem, setSelectedProblem] = useState<ProblemCategory | null>(null);
  const [selectedTiming, setSelectedTiming] = useState<TimingOption | null>(null);
  const [inputText, setInputText] = useState("");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    uri: string;
  } | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const enterPressedRef = useRef(false);

  const handleProblemSelect = useCallback((value: string) => {
    setSelectedProblem(value as ProblemCategory);
    setIntakeStep("timing");
  }, []);

  const handleTimingSelect = useCallback(
    (value: string) => {
      setSelectedTiming(value as TimingOption);
      setIntakeStep("chat");
      // Send an automatic first message with intake context
      const context = `I need help with: ${selectedProblem}. Timing: ${value}. I don't have a specific product — please help me identify it.`;
      sendMessage(context);
    },
    [selectedProblem, sendMessage]
  );

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text && !pendingImage) return;

    sendMessage(
      text || "Please look at this image",
      pendingImage?.base64,
      pendingImage?.uri
    );
    setInputText("");
    setPendingImage(null);
  }, [inputText, pendingImage, sendMessage]);

  // React Native's TextInput doesn't support preventDefault on key events,
  // so we use a ref flag: onKeyPress fires BEFORE onChangeText. We flag
  // the Enter press, then intercept the resulting text change.
  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key === "Enter") {
        enterPressedRef.current = true;
      }
    },
    []
  );

  const handleChangeText = useCallback(
    (newText: string) => {
      if (enterPressedRef.current) {
        enterPressedRef.current = false;
        // Enter was pressed — submit the current text instead of adding newline
        const text = inputText.trim();
        if (text || pendingImage) {
          sendMessage(
            text || "Please look at this image",
            pendingImage?.base64,
            pendingImage?.uri
          );
          setInputText("");
          setPendingImage(null);
        }
        return;
      }
      setInputText(newText);
    },
    [inputText, pendingImage, sendMessage]
  );

  const handleImageSelected = useCallback((base64: string, uri: string) => {
    setPendingImage({ base64, uri });
    setShowImagePicker(false);
  }, []);

  const handleSelectSession = useCallback(
    async (existingSessionId: string) => {
      setIntakeStep("chat");
      await loadSession(existingSessionId);
    },
    [loadSession]
  );

  const handleNewChat = useCallback(() => {
    createSession();
    setIntakeStep("problem");
    setSelectedProblem(null);
    setSelectedTiming(null);
    setInputText("");
  }, [createSession]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble message={item} />,
    []
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // Intake flow screens
  if (intakeStep !== "chat") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header with hamburger */}
        <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            onPress={() => setShowHistory(true)}
            style={styles.menuButton}
            accessibilityLabel="Chat history"
            accessibilityRole="button"
          >
            <Menu size={24} color={colors.foreground} />
          </Pressable>
          <Text variant="h4">Chat</Text>
          <View style={styles.menuButton} />
        </View>

        <View style={styles.intakeContainer}>
          <Text variant="h2" style={styles.intakeTitle}>
            How can I help?
          </Text>
          {intakeStep === "problem" && (
            <>
              <Text
                variant="body"
                color={colors.mutedForeground}
                style={styles.intakeSubtitle}
              >
                What type of issue are you experiencing?
              </Text>
              <IntakeChips
                type="problem"
                selected={selectedProblem}
                onSelect={handleProblemSelect}
              />
            </>
          )}
          {intakeStep === "timing" && (
            <>
              <Text
                variant="body"
                color={colors.mutedForeground}
                style={styles.intakeSubtitle}
              >
                Where are you in the process?
              </Text>
              <IntakeChips
                type="timing"
                selected={selectedTiming}
                onSelect={handleTimingSelect}
              />
            </>
          )}
        </View>

        <ChatHistoryDrawer
          visible={showHistory}
          onClose={() => setShowHistory(false)}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          currentSessionId={sessionId}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header with hamburger */}
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => setShowHistory(true)}
          style={styles.menuButton}
          accessibilityLabel="Chat history"
          accessibilityRole="button"
        >
          <Menu size={24} color={colors.foreground} />
        </Pressable>
        <Text variant="h4">Chat</Text>
        <View style={styles.menuButton} />
      </View>

      <FlatList
        ref={flatListRef}
        data={[...messages].reverse()}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        inverted
        contentContainerStyle={styles.messageList}
        ListHeaderComponent={
          isStreaming && messages[messages.length - 1]?.content === "" ? (
            <TypingIndicator />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {error && (
        <Pressable
          style={[styles.errorBanner, { backgroundColor: colors.destructive }]}
          onPress={clearError}
          accessibilityLabel="Dismiss error"
          accessibilityRole="button"
        >
          <Text variant="bodySmall" color={colors.destructiveForeground}>
            {error} — Tap to dismiss
          </Text>
        </Pressable>
      )}

      {showImagePicker && (
        <ChatImagePicker
          onImageSelected={handleImageSelected}
          onCancel={() => setShowImagePicker(false)}
        />
      )}

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        {pendingImage && (
          <ChatImagePreview
            uri={pendingImage.uri}
            onRemove={() => setPendingImage(null)}
          />
        )}
        <View style={styles.inputRow}>
          <Pressable
            onPress={() => setShowImagePicker((prev) => !prev)}
            style={styles.iconButton}
            accessibilityLabel="Add image"
            accessibilityRole="button"
          >
            <ImagePlus size={22} color={colors.mutedForeground} />
          </Pressable>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            placeholder="Describe your issue..."
            placeholderTextColor={colors.mutedForeground}
            value={inputText}
            onChangeText={handleChangeText}
            multiline
            maxLength={2000}
            editable={!isStreaming && !isLoading}
            onSubmitEditing={handleSend}
            onKeyPress={handleKeyPress}
            blurOnSubmit={false}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={isStreaming || isLoading || (!inputText.trim() && !pendingImage)}
            style={[
              styles.sendButton,
              {
                backgroundColor: colors.primary,
                opacity:
                  isStreaming || isLoading || (!inputText.trim() && !pendingImage)
                    ? 0.4
                    : 1,
              },
            ]}
            accessibilityLabel="Send message"
            accessibilityRole="button"
          >
            <Send size={18} color={colors.primaryForeground} />
          </Pressable>
        </View>
      </View>

      <ChatHistoryDrawer
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        currentSessionId={sessionId}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  intakeContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  intakeTitle: {
    textAlign: "center",
  },
  intakeSubtitle: {
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  messageList: {
    paddingVertical: spacing.sm,
  },
  errorBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  inputBar: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 20,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    maxHeight: 120,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
