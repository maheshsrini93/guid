import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme";
import { borderRadius, shadows, spacing } from "../../theme/spacing";
import { fontFamily } from "../../theme/typography";
import { getSavedProducts, unsaveProduct } from "../../services/products";

interface SavedProduct {
  id: string;
  savedAt: string;
  product: {
    id: number;
    articleNumber: string;
    name: string | null;
    type: string | null;
    priceCurrency: string | null;
    priceCurrent: number | null;
    imageUrl: string | null;
  };
}

/**
 * Displays user's saved/bookmarked products in a scrollable list.
 * Each item is tappable to navigate to the product, with a remove button.
 */
export function SavedProductList() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [products, setProducts] = useState<SavedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    getSavedProducts()
      .then(setProducts)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleRemove = useCallback(
    async (item: SavedProduct) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setRemovingId(item.id);
      try {
        await unsaveProduct(item.product.articleNumber);
        setProducts((prev) => prev.filter((p) => p.id !== item.id));
      } catch {
        // Silently fail — product stays in list
      } finally {
        setRemovingId(null);
      }
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: SavedProduct }) => {
      const shadow = isDark ? shadows.dark.sm : shadows.light.sm;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
              ...shadow,
            },
          ]}
          onPress={() =>
            router.push(`/products/${item.product.articleNumber}`)
          }
          accessibilityRole="button"
          accessibilityLabel={`View ${item.product.name ?? item.product.articleNumber}`}
        >
          {item.product.imageUrl ? (
            <Image
              source={{ uri: item.product.imageUrl }}
              style={styles.image}
              accessibilityLabel={`${item.product.name} image`}
            />
          ) : (
            <View
              style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}
            />
          )}
          <View style={styles.info}>
            <Text variant="body" numberOfLines={1} style={styles.productName}>
              {item.product.name ?? "Unknown Product"}
            </Text>
            <Text variant="caption" color={colors.mutedForeground}>
              {item.product.articleNumber}
            </Text>
            {item.product.priceCurrent != null && (
              <Text variant="bodySmall" color={colors.primary} style={styles.price}>
                {item.product.priceCurrency ?? "$"}
                {item.product.priceCurrent.toFixed(2)}
              </Text>
            )}
          </View>
          <Pressable
            onPress={() => handleRemove(item)}
            disabled={removingId === item.id}
            style={styles.removeButton}
            accessibilityLabel={`Remove ${item.product.name ?? "product"} from saved`}
            accessibilityRole="button"
          >
            {removingId === item.id ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Trash2 size={18} color={colors.destructive} />
            )}
          </Pressable>
        </Pressable>
      );
    },
    [colors, isDark, router, handleRemove, removingId]
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodySmall" color={colors.mutedForeground}>
          No saved products yet
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontFamily: fontFamily.medium,
  },
  price: {
    fontFamily: fontFamily.semibold,
  },
  removeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: spacing.md,
    alignItems: "center",
  },
});
