import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LogIn, MessageSquare, Plus, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme";
import { spacing, borderRadius } from "../../theme/spacing";
import { fontFamily } from "../../theme/typography";
import { useAuth } from "../../lib/AuthContext";
import { getSessions, type ChatSessionPreview } from "../../services/chat";

interface ChatHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  currentSessionId: string | null;
}

const DRAWER_WIDTH = Dimensions.get("window").width * 0.8;

export function ChatHistoryDrawer({
  visible,
  onClose,
  onSelectSession,
  onNewChat,
  currentSessionId,
}: ChatHistoryDrawerProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSessionPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [slideAnim] = useState(() => new Animated.Value(-DRAWER_WIDTH));
  const [backdropAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      if (user) loadSessions();
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await getSessions();
      setSessions(data);
    } catch {
      // Silently fail — user just sees empty list
    } finally {
      setLoading(false);
    }
  };

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, []);

  const renderSession = useCallback(
    ({ item }: { item: ChatSessionPreview }) => {
      const isActive = item.id === currentSessionId;
      return (
        <Pressable
          style={[
            styles.sessionItem,
            {
              backgroundColor: isActive
                ? isDark
                  ? colors.accent
                  : colors.muted
                : "transparent",
              borderColor: isActive ? colors.primary : "transparent",
            },
          ]}
          onPress={() => {
            onSelectSession(item.id);
            onClose();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Open chat: ${item.preview}`}
        >
          <MessageSquare
            size={16}
            color={isActive ? colors.primary : colors.mutedForeground}
          />
          <View style={styles.sessionText}>
            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={{
                color: isActive ? colors.foreground : colors.foreground,
                fontFamily: isActive ? fontFamily.semibold : fontFamily.regular,
              }}
            >
              {item.productName ?? item.preview}
            </Text>
            <Text variant="caption" color={colors.mutedForeground} numberOfLines={1}>
              {item.productName ? item.preview : formatDate(item.createdAt)}
            </Text>
          </View>
          <Text variant="caption" color={colors.mutedForeground}>
            {formatDate(item.createdAt)}
          </Text>
        </Pressable>
      );
    },
    [colors, isDark, currentSessionId, onSelectSession, onClose, formatDate]
  );

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropAnim }]}>
        <Pressable
          style={[styles.backdrop]}
          onPress={onClose}
          accessibilityLabel="Close chat history"
          accessibilityRole="button"
        />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          {
            backgroundColor: colors.card,
            borderRightColor: colors.border,
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View
          style={[styles.drawerHeader, { borderBottomColor: colors.border }]}
        >
          <Text variant="h4">Chats</Text>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <X size={22} color={colors.foreground} />
          </Pressable>
        </View>

        {/* New Chat button */}
        <Pressable
          style={[
            styles.newChatButton,
            { backgroundColor: colors.primary },
          ]}
          onPress={() => {
            onNewChat();
            onClose();
          }}
          accessibilityLabel="Start new chat"
          accessibilityRole="button"
        >
          <Plus size={18} color={colors.primaryForeground} />
          <Text
            variant="bodySmall"
            style={{
              color: colors.primaryForeground,
              fontFamily: fontFamily.semibold,
            }}
          >
            New Chat
          </Text>
        </Pressable>

        {/* Session list */}
        {!user ? (
          <View style={styles.centered}>
            <LogIn size={32} color={colors.border} />
            <Text variant="bodySmall" color={colors.mutedForeground} style={{ textAlign: "center" }}>
              Sign in to save and view{"\n"}your chat history
            </Text>
            <Pressable
              style={[styles.signInButton, { borderColor: colors.primary }]}
              onPress={() => {
                onClose();
                router.push("/login");
              }}
              accessibilityLabel="Sign in"
              accessibilityRole="button"
            >
              <Text variant="bodySmall" style={{ color: colors.primary, fontFamily: fontFamily.semibold }}>
                Sign In
              </Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.centered}>
            <MessageSquare size={32} color={colors.border} />
            <Text variant="bodySmall" color={colors.mutedForeground}>
              No chat history yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            renderItem={renderSession}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.sessionList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRightWidth: 1,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  newChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    margin: spacing.md,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  sessionList: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: 2,
  },
  sessionText: {
    flex: 1,
    gap: 2,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  signInButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
});
