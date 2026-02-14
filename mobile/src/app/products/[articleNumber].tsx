import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  BookOpen,
  Heart,
  MessageCircle,
  Star,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ImageGallery } from '../../components/product/ImageGallery';
import { RetailerSection } from '../../components/product/RetailerSection';
import { SpecTable } from '../../components/product/SpecTable';
import { Badge, Button, Separator, Text } from '../../components/ui';
import { useRecentProducts } from '../../hooks/useRecentProducts';
import { useTheme } from '../../theme';
import { spacing } from '../../theme/spacing';
import { getProduct, saveProduct, unsaveProduct } from '../../services/products';

interface ProductDetail {
  id: number;
  articleNumber: string;
  name: string | null;
  type: string | null;
  description: string | null;
  priceCurrency: string | null;
  priceCurrent: number | null;
  priceOriginal: number | null;
  color: string | null;
  assemblyRequired: boolean | null;
  avgRating: number | null;
  reviewCount: number | null;
  categoryPath: string | null;
  materials: string | null;
  dimensions: {
    width: string | null;
    height: string | null;
    depth: string | null;
    length: string | null;
    weight: string | null;
  };
  images: { id: number; url: string; alt_text: string | null }[];
  guide: {
    id: string;
    title: string;
    difficulty: string;
    timeMinutes: number | null;
    tools: string | null;
    published: boolean;
    steps: {
      id: string;
      stepNumber: number;
      title: string;
      instruction: string;
      imageUrl: string | null;
      tip: string | null;
      warning: string | null;
    }[];
  } | null;
  retailer: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  } | null;
  sourceUrl: string | null;
}

function RatingStars({ rating, count }: { rating: number; count: number | null }) {
  const { colors } = useTheme();
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <View style={ratingStyles.container}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={16}
          color={colors.warning}
          fill={
            i < fullStars
              ? colors.warning
              : i === fullStars && hasHalf
                ? colors.warning
                : 'transparent'
          }
        />
      ))}
      <Text variant="bodySmall" color={colors.mutedForeground}>
        {rating.toFixed(1)}{count != null ? ` (${count})` : ''}
      </Text>
    </View>
  );
}

const ratingStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default function ProductDetailScreen() {
  const { articleNumber } = useLocalSearchParams<{ articleNumber: string }>();
  const { colors } = useTheme();
  const router = useRouter();
  const { addRecentProduct } = useRecentProducts();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!articleNumber) return;
    try {
      setError(null);
      const data = (await getProduct(articleNumber)) as ProductDetail;
      setProduct(data);

      // Track as recently viewed
      addRecentProduct({
        id: data.id,
        articleNumber: data.articleNumber,
        name: data.name,
        imageUrl: data.images?.[0]?.url ?? null,
        priceCurrent: data.priceCurrent,
        priceCurrency: data.priceCurrency,
        guideStatus: data.guide?.published ? 'published' : 'none',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [articleNumber, addRecentProduct]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProduct();
  }, [fetchProduct]);

  const toggleSave = useCallback(async () => {
    if (!articleNumber || savingToggle) return;
    setSavingToggle(true);
    try {
      if (saved) {
        await unsaveProduct(articleNumber);
        setSaved(false);
      } else {
        await saveProduct(articleNumber);
        setSaved(true);
      }
    } catch {
      // ignore
    } finally {
      setSavingToggle(false);
    }
  }, [articleNumber, saved, savingToggle]);

  // Build spec table rows from product dimensions + materials
  const specs = product
    ? [
        product.dimensions.width && { label: 'Width', value: product.dimensions.width },
        product.dimensions.height && { label: 'Height', value: product.dimensions.height },
        product.dimensions.depth && { label: 'Depth', value: product.dimensions.depth },
        product.dimensions.length && { label: 'Length', value: product.dimensions.length },
        product.dimensions.weight && { label: 'Weight', value: product.dimensions.weight },
        product.materials && { label: 'Materials', value: product.materials },
        product.color && { label: 'Color', value: product.color },
      ].filter((s): s is { label: string; value: string } => Boolean(s))
    : [];

  const headerTitle = product?.name
    ? product.name.length > 25
      ? product.name.slice(0, 25) + '...'
      : product.name
    : `Product ${articleNumber}`;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: headerTitle }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.centered}>
          <Text variant="body" color={colors.destructive}>
            {error ?? 'Product not found'}
          </Text>
          <Button variant="outline" onPress={fetchProduct}>
            Retry
          </Button>
        </View>
      </>
    );
  }

  const hasGuide = product.guide?.published;
  const priceStr =
    product.priceCurrent != null
      ? `${product.priceCurrency ?? '$'}${product.priceCurrent.toFixed(2)}`
      : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerRight: () => (
            <Pressable
              onPress={toggleSave}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Unsave product' : 'Save product'}
            >
              <Heart
                size={24}
                color={saved ? colors.destructive : colors.foreground}
                fill={saved ? colors.destructive : 'transparent'}
              />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Image gallery */}
        <ImageGallery images={product.images} />

        <View style={styles.body}>
          {/* Product info */}
          <View style={styles.infoSection}>
            <Text variant="h2">{product.name ?? 'Untitled Product'}</Text>
            <Text variant="mono" color={colors.mutedForeground}>
              {product.articleNumber}
            </Text>

            <View style={styles.priceRow}>
              {priceStr && <Text variant="h3">{priceStr}</Text>}
              {product.priceOriginal != null &&
                product.priceOriginal !== product.priceCurrent && (
                  <Text
                    variant="bodySmall"
                    color={colors.mutedForeground}
                    style={styles.strikethrough}
                  >
                    {product.priceCurrency ?? '$'}
                    {product.priceOriginal.toFixed(2)}
                  </Text>
                )}
            </View>

            {product.avgRating != null && (
              <RatingStars
                rating={product.avgRating}
                count={product.reviewCount}
              />
            )}

            <View style={styles.badgeRow}>
              {product.assemblyRequired && (
                <Badge variant="warning">Assembly Required</Badge>
              )}
              {hasGuide && <Badge variant="success">Guide Available</Badge>}
            </View>

            {product.description && (
              <Text variant="body" color={colors.mutedForeground}>
                {product.description}
              </Text>
            )}
          </View>

          <Separator />

          {/* Actions */}
          <View style={styles.actions}>
            {hasGuide && (
              <Button
                variant="primary"
                size="lg"
                onPress={() =>
                  router.push(`/products/${articleNumber}/guide`)
                }
              >
                <View style={styles.buttonContent}>
                  <BookOpen size={20} color={colors.primaryForeground} />
                  <Text variant="body" color={colors.primaryForeground} style={styles.buttonLabel}>
                    View Assembly Guide
                  </Text>
                </View>
              </Button>
            )}

            <Button
              variant="outline"
              size="lg"
              onPress={() =>
                router.push(`/products/${articleNumber}/chat`)
              }
            >
              <View style={styles.buttonContent}>
                <MessageCircle size={20} color={colors.foreground} />
                <Text variant="body" style={styles.buttonLabel}>
                  Ask AI Assistant
                </Text>
              </View>
            </Button>
          </View>

          {/* Spec table */}
          {specs.length > 0 && (
            <View style={styles.specSection}>
              <Text variant="h4">Specifications</Text>
              <SpecTable specs={specs} />
            </View>
          )}

          {/* Retailer section */}
          {product.retailer && (
            <RetailerSection
              retailer={product.retailer}
              sourceUrl={product.sourceUrl}
              price={product.priceCurrent}
              currency={product.priceCurrency}
            />
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  body: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  infoSection: {
    gap: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.sm,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  buttonLabel: {
    fontWeight: '600',
  },
  specSection: {
    gap: spacing.sm,
  },
});
