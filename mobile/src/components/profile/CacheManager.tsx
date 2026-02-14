import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Database,
  HardDrive,
  Trash2,
  WifiOff,
} from "lucide-react-native";

import { useTheme } from "../../theme";
import { borderRadius, spacing } from "../../theme/spacing";
import { fontFamily } from "../../theme/typography";
import { Text } from "../ui/Text";
import {
  clearAllCaches,
  getCachedGuidesList,
  getStorageUsed,
  removeCachedGuide,
  type CachedGuideMeta,
} from "../../lib/offline-storage";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CacheManager() {
  const { colors, isDark } = useTheme();
  const [guides, setGuides] = useState<CachedGuideMeta[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [list, bytes] = await Promise.all([
      getCachedGuidesList(),
      getStorageUsed(),
    ]);
    setGuides(list);
    setTotalBytes(bytes);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const handleRemove = useCallback(
    (guide: CachedGuideMeta) => {
      Alert.alert(
        "Remove Offline Guide",
        `Remove "${guide.title}" from offline storage?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              await removeCachedGuide(guide.articleNumber);
              await refresh();
            },
          },
        ]
      );
    },
    [refresh]
  );

  const handleClearAll = useCallback(() => {
    if (guides.length === 0) return;

    Alert.alert(
      "Clear All Offline Guides",
      `This will remove ${guides.length} cached guide${guides.length === 1 ? "" : "s"} and free ${formatBytes(totalBytes)} of storage.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await clearAllCaches();
            await refresh();
          },
        },
      ]
    );
  }, [guides.length, totalBytes, refresh]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Storage summary header */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <HardDrive size={20} color={colors.mutedForeground} />
          <Text variant="bodySmall" color={colors.mutedForeground}>
            Storage Used
          </Text>
        </View>
        <Text
          variant="h3"
          style={styles.summaryValue}
        >
          {formatBytes(totalBytes)}
        </Text>
        <Text variant="caption" color={colors.mutedForeground}>
          {guides.length} of 20 guide slots used
        </Text>
      </View>

      {/* Clear all button */}
      {guides.length > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.clearButton,
            {
              backgroundColor: colors.destructive,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={handleClearAll}
          accessibilityRole="button"
          accessibilityLabel="Clear all cached guides"
        >
          <Trash2 size={16} color={colors.destructiveForeground} />
          <Text
            variant="bodySmall"
            color={colors.destructiveForeground}
            style={{ fontFamily: fontFamily.semibold }}
          >
            Clear All
          </Text>
        </Pressable>
      )}

      {/* Guide list */}
      {guides.length === 0 ? (
        <View style={styles.emptyState}>
          <WifiOff size={48} color={colors.mutedForeground} />
          <Text
            variant="h4"
            color={colors.mutedForeground}
            style={styles.emptyTitle}
          >
            No guides saved for offline use
          </Text>
          <Text
            variant="bodySmall"
            color={colors.mutedForeground}
            style={styles.emptySubtitle}
          >
            Download guides from the product page to access them without internet.
          </Text>
        </View>
      ) : (
        <View style={styles.guideList}>
          {guides.map((guide) => (
            <View
              key={guide.articleNumber}
              style={[
                styles.guideItem,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.guideInfo}>
                <View style={styles.guideHeader}>
                  <Database size={16} color={colors.primary} />
                  <Text
                    variant="body"
                    style={{ fontFamily: fontFamily.medium, flex: 1 }}
                    numberOfLines={1}
                  >
                    {guide.title}
                  </Text>
                </View>
                <View style={styles.guideMeta}>
                  <Text variant="caption" color={colors.mutedForeground}>
                    {guide.totalSteps} steps
                  </Text>
                  <View
                    style={[styles.dot, { backgroundColor: colors.mutedForeground }]}
                  />
                  <Text variant="caption" color={colors.mutedForeground}>
                    {guide.imageCount} images
                  </Text>
                  <View
                    style={[styles.dot, { backgroundColor: colors.mutedForeground }]}
                  />
                  <Text variant="caption" color={colors.mutedForeground}>
                    {formatBytes(guide.storageBytes)}
                  </Text>
                </View>
                <Text variant="caption" color={colors.mutedForeground}>
                  Cached {formatDate(guide.cachedAt)}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.removeButton,
                  {
                    backgroundColor: isDark
                      ? "rgba(217, 54, 54, 0.15)"
                      : "rgba(217, 54, 54, 0.08)",
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
                onPress={() => handleRemove(guide)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${guide.title} from offline storage`}
                hitSlop={8}
              >
                <Trash2 size={18} color={colors.destructive} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  summaryCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  summaryValue: {
    marginTop: spacing.xs,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    minHeight: 44,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  guideList: {
    gap: spacing.sm,
  },
  guideItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  guideInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  guideMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
