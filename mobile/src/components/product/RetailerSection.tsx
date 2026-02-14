import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/spacing';
import { Card, Icon, Text } from '../ui';
import { ExternalLink, Store } from 'lucide-react-native';

interface Retailer {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

interface RetailerSectionProps {
  retailer: Retailer;
  sourceUrl: string | null;
  price: number | null;
  currency: string | null;
}

export function RetailerSection({
  retailer,
  sourceUrl,
  price,
  currency,
}: RetailerSectionProps) {
  const { colors } = useTheme();

  const priceStr =
    price != null ? `${currency ?? '$'}${price.toFixed(2)}` : null;

  const openRetailer = async () => {
    if (sourceUrl) {
      await WebBrowser.openBrowserAsync(sourceUrl);
    }
  };

  return (
    <View style={styles.section}>
      <Text variant="h4">Also Available At</Text>
      <Pressable
        onPress={openRetailer}
        disabled={!sourceUrl}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        accessibilityRole="link"
        accessibilityLabel={`View on ${retailer.name}`}
      >
        <Card style={styles.card}>
          <View style={styles.retailerRow}>
            <View
              style={[
                styles.logoWrap,
                { backgroundColor: colors.muted },
              ]}
            >
              {retailer.logoUrl ? (
                <Image
                  source={{ uri: retailer.logoUrl }}
                  style={styles.logo}
                  contentFit="contain"
                />
              ) : (
                <Icon icon={Store} size={24} color={colors.mutedForeground} />
              )}
            </View>

            <View style={styles.retailerInfo}>
              <Text variant="body" style={styles.retailerName}>
                {retailer.name}
              </Text>
              {priceStr && (
                <Text variant="bodySmall" color={colors.primary}>
                  {priceStr}
                </Text>
              )}
            </View>

            {sourceUrl && (
              <Icon
                icon={ExternalLink}
                size={18}
                color={colors.mutedForeground}
              />
            )}
          </View>
        </Card>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
  },
  retailerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 44,
    height: 44,
  },
  retailerInfo: {
    flex: 1,
    gap: 2,
  },
  retailerName: {
    fontWeight: '600',
  },
});
