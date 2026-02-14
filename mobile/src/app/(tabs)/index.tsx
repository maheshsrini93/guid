import { useRouter } from 'expo-router';
import {
  MessageCircle,
  Search,
  Sparkles,
  Package,
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

import { ProductCard } from '../../components/product/ProductCard';
import { Badge, Card, Icon, SafeArea, Text } from '../../components/ui';
import { useRecentProducts } from '../../hooks/useRecentProducts';
import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/spacing';
import { getPopularProducts, getProducts } from '../../services/products';

interface ProductListItem {
  id: number;
  articleNumber: string;
  name: string | null;
  type: string | null;
  priceCurrency: string | null;
  priceCurrent: number | null;
  avgRating: number | null;
  assemblyRequired: boolean | null;
  guideStatus: string;
  imageUrl: string | null;
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { recentProducts } = useRecentProducts();

  const [popular, setPopular] = useState<ProductListItem[]>([]);
  const [newProducts, setNewProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [popularRes, newRes] = await Promise.all([
        getPopularProducts(),
        getProducts({ sort: 'newest', limit: '10' }),
      ]);
      setPopular(popularRes.products);
      setNewProducts(newRes.products);
    } catch {
      // silent fail — sections just stay empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <SafeArea>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <ScrollView
        style={styles.scroll}
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
        {/* Search bar */}
        <Pressable
          onPress={() => router.push('/(tabs)/search')}
          accessibilityRole="search"
          accessibilityLabel="Search products"
        >
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Icon icon={Search} size={20} color={colors.mutedForeground} />
            <Text variant="body" color={colors.mutedForeground}>
              Search products and guides...
            </Text>
          </View>
        </Pressable>

        {/* Popular Guides */}
        {popular.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon icon={Sparkles} size={20} color={colors.primary} />
              <Text variant="h3">Popular Guides</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {popular.map((product) => (
                <ProductCard
                  key={product.articleNumber}
                  articleNumber={product.articleNumber}
                  name={product.name}
                  imageUrl={product.imageUrl}
                  priceCurrent={product.priceCurrent}
                  priceCurrency={product.priceCurrency}
                  guideStatus={product.guideStatus}
                  compact
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recently Viewed */}
        {recentProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon icon={Package} size={20} color={colors.primary} />
              <Text variant="h3">Recently Viewed</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {recentProducts.map((product) => (
                <ProductCard
                  key={product.articleNumber}
                  articleNumber={product.articleNumber}
                  name={product.name}
                  imageUrl={product.imageUrl}
                  priceCurrent={product.priceCurrent}
                  priceCurrency={product.priceCurrency}
                  guideStatus={product.guideStatus}
                  compact
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* New Products */}
        {newProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Badge variant="success">New</Badge>
              <Text variant="h3">New Products</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {newProducts.map((product) => (
                <ProductCard
                  key={product.articleNumber}
                  articleNumber={product.articleNumber}
                  name={product.name}
                  imageUrl={product.imageUrl}
                  priceCurrent={product.priceCurrent}
                  priceCurrency={product.priceCurrency}
                  guideStatus={product.guideStatus}
                  compact
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Chat prompt card */}
        <Pressable
          onPress={() => router.push('/(tabs)/chat')}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Open AI troubleshooting assistant"
        >
          <Card
            style={[
              styles.chatCard,
              { borderColor: colors.primary, borderWidth: 1 },
            ]}
          >
            <View style={styles.chatCardContent}>
              <View
                style={[
                  styles.chatIconWrap,
                  { backgroundColor: colors.primary + '18' },
                ]}
              >
                <Icon
                  icon={MessageCircle}
                  size={28}
                  color={colors.primary}
                />
              </View>
              <View style={styles.chatTextWrap}>
                <Text variant="h4">Need help?</Text>
                <Text variant="bodySmall" color={colors.mutedForeground}>
                  Ask our AI assistant about assembly, troubleshooting, or
                  product questions
                </Text>
              </View>
            </View>
          </Card>
        </Pressable>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minHeight: 48,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  horizontalList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chatCard: {
    padding: spacing.md,
  },
  chatCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chatIconWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTextWrap: {
    flex: 1,
    gap: spacing.xs,
  },
});
