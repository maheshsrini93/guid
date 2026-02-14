import { CheckCircle, Star } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/spacing';
import { Badge, Button, Icon, Text } from '../ui';

interface CompletionScreenProps {
  totalSteps: number;
  onBackToProduct: () => void;
  onRate?: (rating: number) => void;
}

export function CompletionScreen({
  totalSteps,
  onBackToProduct,
  onRate,
}: CompletionScreenProps) {
  const { colors } = useTheme();
  const [selectedRating, setSelectedRating] = useState(0);

  const handleRate = (rating: number) => {
    setSelectedRating(rating);
    onRate?.(rating);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.success + '20' },
        ]}
      >
        <Icon icon={CheckCircle} size={64} color={colors.success} />
      </View>

      <Text variant="h1" style={styles.heading}>
        Guide Complete
      </Text>

      <Badge variant="success">{`${totalSteps} steps completed`}</Badge>

      {/* Rating prompt */}
      <View style={styles.ratingSection}>
        <Text variant="body" color={colors.mutedForeground}>
          How helpful was this guide?
        </Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((rating) => (
            <Pressable
              key={rating}
              onPress={() => handleRate(rating)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${rating} star${rating > 1 ? 's' : ''}`}
            >
              <Star
                size={36}
                color={colors.warning}
                fill={rating <= selectedRating ? colors.warning : 'transparent'}
              />
            </Pressable>
          ))}
        </View>
        {selectedRating > 0 && (
          <Text variant="bodySmall" color={colors.success}>
            Thanks for your feedback!
          </Text>
        )}
      </View>

      <Button variant="primary" size="lg" onPress={onBackToProduct}>
        Back to Product
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  heading: {
    textAlign: 'center',
  },
  ratingSection: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
