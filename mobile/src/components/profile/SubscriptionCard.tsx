import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Crown, ChevronRight } from "lucide-react-native";
import { Text } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { useTheme } from "../../theme";
import { borderRadius, shadows, spacing } from "../../theme/spacing";

interface SubscriptionCardProps {
  tier: string;
  subscriptionEndsAt?: string | null;
}

/**
 * Shows the user's subscription status with tier badge, expiry, and upgrade/manage CTA.
 */
export function SubscriptionCard({ tier, subscriptionEndsAt }: SubscriptionCardProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const shadow = isDark ? shadows.dark.md : shadows.light.md;

  const isPremium = tier === "premium";
  const expiryDate = subscriptionEndsAt
    ? new Date(subscriptionEndsAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isPremium ? colors.primary : colors.border,
          opacity: pressed ? 0.85 : 1,
          ...shadow,
        },
      ]}
      onPress={() => router.push("/subscription")}
      accessibilityRole="button"
      accessibilityLabel={
        isPremium
          ? `Premium subscription, expires ${expiryDate ?? "unknown"}`
          : "Upgrade to premium"
      }
    >
      <View style={styles.header}>
        <Crown
          size={20}
          color={isPremium ? colors.primary : colors.mutedForeground}
        />
        <Text variant="h4" style={styles.title}>
          {isPremium ? "Premium" : "Free Plan"}
        </Text>
        {isPremium && <Badge variant="default">Active</Badge>}
      </View>

      {isPremium && expiryDate && (
        <Text variant="bodySmall" color={colors.mutedForeground}>
          Renews {expiryDate}
        </Text>
      )}

      {!isPremium && (
        <Text variant="bodySmall" color={colors.mutedForeground}>
          Upgrade for offline guides, unlimited chat, and more
        </Text>
      )}

      <View style={styles.cta}>
        <Text variant="bodySmall" color={colors.primary} style={styles.ctaText}>
          {isPremium ? "Manage subscription" : "Upgrade to Premium"}
        </Text>
        <ChevronRight size={16} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  ctaText: {
    fontWeight: "600",
  },
});
