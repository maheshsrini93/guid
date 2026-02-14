import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { ImagePlus, Send } from "lucide-react-native";
import { Text } from "../../../components/ui/Text";
import { useTheme } from "../../../theme";
import { spacing, borderRadius } from "../../../theme/spacing";
import { fontFamily } from "../../../theme/typography";
import { useChat, type ChatMessage } from "../../../hooks/useChat";
import { MessageBubble } from "../../../components/chat/MessageBubble";
import { TypingIndicator } from "../../../components/chat/TypingIndicator";
import {
  ChatImagePicker,
  ChatImagePreview,
} from "../../../components/chat/ChatImagePicker";
import { getProduct } from "../../../services/products";

/**
 * Product-specific chat screen.
 * Product context is pre-loaded from the API, so the user can jump
 * straight into describing their problem without identification steps.
 */
export default function ProductChatScreen() {
  const { articleNumber } = useLocalSearchParams<{ articleNumber: string }>();
  const { colors } = useTheme();
  const [productName, setProductName] = useState<string | null>(null);
  const [productId, setProductId] = useState<number | undefined>();
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);

  // Fetch product to get the numeric ID for the chat session
  useEffect(() => {
    if (!articleNumber) return;
    getProduct(articleNumber)
      .then((product) => {
        setProductId(product.id);
        setProductName(product.name ?? articleNumber);
      })
      .catch(() => {
        setProductName(articleNumber);
      })
      .finally(() => setIsLoadingProduct(false));
  }, [articleNumber]);

  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    clearError,
  } = useChat(productId);

  const [inputText, setInputText] = useState("");
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    uri: string;
  } | null>(null);
  const flatListRef = useRef<FlatList>(null);

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

  const handleImageSelected = useCallback((base64: string, uri: string) => {
    setPendingImage({ base64, uri });
    setShowImagePicker(false);
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble message={item} />,
    []
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  if (isLoadingProduct) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: "Product Support",
            headerTitleStyle: { fontFamily: "IBMPlexSans_600SemiBold" },
          }}
        />
        <View style={[styles.centered, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: productName ?? "Product Support",
          headerTitleStyle: { fontFamily: "IBMPlexSans_600SemiBold" },
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {messages.length === 0 && !isStreaming && (
          <View style={styles.emptyState}>
            <Text variant="h3" style={styles.emptyTitle}>
              Need help with {productName}?
            </Text>
            <Text
              variant="body"
              color={colors.mutedForeground}
              style={styles.emptySubtitle}
            >
              Describe your issue or take a photo below
            </Text>
          </View>
        )}

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
          style={messages.length === 0 ? styles.hidden : undefined}
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
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              editable={!isStreaming}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={handleSend}
              disabled={isStreaming || (!inputText.trim() && !pendingImage)}
              style={[
                styles.sendButton,
                {
                  backgroundColor: colors.primary,
                  opacity:
                    isStreaming || (!inputText.trim() && !pendingImage)
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
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
  },
  hidden: {
    display: "none",
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
