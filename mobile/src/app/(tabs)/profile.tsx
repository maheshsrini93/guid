import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Bookmark,
  ChevronRight,
  LogOut,
  Settings,
  User,
} from "lucide-react-native";
import { Text } from "../../components/ui/Text";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Separator } from "../../components/ui/Separator";
import { useTheme } from "../../theme";
import { borderRadius, spacing } from "../../theme/spacing";
import { useAuth } from "../../lib/AuthContext";
import { SavedProductList } from "../../components/profile/SavedProductList";
import { SubscriptionCard } from "../../components/profile/SubscriptionCard";

/**
 * Profile tab screen.
 *
 * Authenticated: user info, saved products, subscription card, settings/logout.
 * Unauthenticated: sign-in CTA with benefits explanation.
 */
export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  // Unauthenticated state
  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.unauthContainer}>
          <View
            style={[styles.avatarCircle, { backgroundColor: colors.muted }]}
          >
            <User size={40} color={colors.mutedForeground} />
          </View>
          <Text variant="h2" style={styles.centerText}>
            Sign in to Guid
          </Text>
          <Text
            variant="body"
            color={colors.mutedForeground}
            style={styles.centerText}
          >
            Save products, get personalized help, and access your guides
            anywhere
          </Text>
          <Button
            onPress={() => router.push("/login")}
            style={styles.authButton}
          >
            Sign In
          </Button>
          <Button
            variant="outline"
            onPress={() => router.push("/register")}
            style={styles.authButton}
          >
            Create Account
          </Button>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* User info header */}
      <View style={styles.userHeader}>
        <View
          style={[styles.avatarCircle, { backgroundColor: colors.primary }]}
        >
          <Text variant="h2" color={colors.primaryForeground}>
            {(user.name ?? user.email).charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          {user.name && (
            <Text variant="h3" numberOfLines={1}>
              {user.name}
            </Text>
          )}
          <Text variant="bodySmall" color={colors.mutedForeground} numberOfLines={1}>
            {user.email}
          </Text>
          {user.subscriptionTier === "premium" && (
            <Badge variant="default">Premium</Badge>
          )}
        </View>
      </View>

      <Separator style={styles.separator} />

      {/* Subscription */}
      <SubscriptionCard
        tier={user.subscriptionTier}
        subscriptionEndsAt={null}
      />

      <Separator style={styles.separator} />

      {/* Saved products */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Bookmark size={18} color={colors.foreground} />
          <Text variant="h4">Saved Products</Text>
        </View>
        <SavedProductList />
      </View>

      <Separator style={styles.separator} />

      {/* Settings link */}
      <Pressable
        style={({ pressed }) => [
          styles.menuItem,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={() => router.push("/settings")}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Settings size={20} color={colors.foreground} />
        <Text variant="body" style={styles.menuText}>
          Settings
        </Text>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </Pressable>

      {/* Logout */}
      <Pressable
        style={({ pressed }) => [
          styles.menuItem,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={logout}
        accessibilityRole="button"
        accessibilityLabel="Log out"
      >
        <LogOut size={20} color={colors.destructive} />
        <Text variant="body" color={colors.destructive} style={styles.menuText}>
          Log Out
        </Text>
      </Pressable>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  unauthContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    textAlign: "center",
  },
  authButton: {
    width: "100%",
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  separator: {
    marginVertical: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  menuText: {
    flex: 1,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
});
