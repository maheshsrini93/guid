import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/spacing';
import { Badge, Card, Text } from '../ui';

interface ProductCardProps {
  articleNumber: string;
  name: string | null;
  imageUrl: string | null;
  priceCurrent: number | null;
  priceCurrency: string | null;
  guideStatus: string;
  /** Render as a compact horizontal card (for horizontal ScrollViews) */
  compact?: boolean;
}

export function ProductCard({
  articleNumber,
  name,
  imageUrl,
  priceCurrent,
  priceCurrency,
  guideStatus,
  compact = false,
}: ProductCardProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const hasGuide = guideStatus === 'published';
  const priceStr =
    priceCurrent != null
      ? `${priceCurrency ?? '$'}${priceCurrent.toFixed(2)}`
      : null;

  return (
    <Pressable
      onPress={() => router.push(`/products/${articleNumber}`)}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`View ${name ?? 'product'}`}
    >
      <Card style={compact ? styles.compactCard : styles.card}>
        <View
          style={[
            compact ? styles.compactImageWrap : styles.imageWrap,
            { backgroundColor: colors.muted },
          ]}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={compact ? styles.compactImage : styles.image}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <View
              style={[
                compact ? styles.compactImage : styles.image,
                styles.placeholder,
              ]}
            >
              <Text variant="caption" color={colors.mutedForeground}>
                No image
              </Text>
            </View>
          )}
        </View>

        <View style={compact ? styles.compactInfo : styles.info}>
          <Text
            variant="bodySmall"
            numberOfLines={compact ? 2 : 1}
            style={styles.productName}
          >
            {name ?? 'Untitled Product'}
          </Text>

          <View style={styles.row}>
            {priceStr && (
              <Text variant="body" style={styles.price}>
                {priceStr}
              </Text>
            )}
          </View>

          {hasGuide && <Badge variant="success">Guide Available</Badge>}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  compactCard: {
    padding: 0,
    overflow: 'hidden',
    width: 160,
  },
  imageWrap: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactImageWrap: {
    width: 160,
    height: 120,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  compactImage: {
    width: 160,
    height: 120,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  compactInfo: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  productName: {
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  price: {
    fontWeight: '600',
  },
});
