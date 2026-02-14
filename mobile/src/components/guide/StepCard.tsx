import { Image } from 'expo-image';
import React from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/spacing';
import { Text } from '../ui';
import { Callout } from './Callout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StepCardProps {
  stepNumber: number;
  title: string;
  instruction: string;
  imageUrl: string | null;
  tip: string | null;
  warning: string | null;
}

export function StepCard({
  stepNumber,
  title,
  instruction,
  imageUrl,
  tip,
  warning,
}: StepCardProps) {
  const { colors } = useTheme();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
      } else if (scale.value > 3) {
        scale.value = withTiming(3);
        savedScale.value = 3;
      } else {
        savedScale.value = scale.value;
      }
    });

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ScrollView
      style={{ width: SCREEN_WIDTH }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Step number badge */}
      <View style={styles.stepBadgeRow}>
        <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
          <Text variant="body" color={colors.primaryForeground} style={styles.stepNumber}>
            {stepNumber}
          </Text>
        </View>
        <Text variant="h3" style={styles.stepTitle}>
          {title}
        </Text>
      </View>

      {/* Step image with pinch-to-zoom */}
      {imageUrl && (
        <GestureDetector gesture={pinchGesture}>
          <Animated.View style={animatedImageStyle}>
            <View
              style={[
                styles.imageContainer,
                { backgroundColor: colors.muted },
              ]}
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="contain"
                transition={200}
              />
            </View>
          </Animated.View>
        </GestureDetector>
      )}

      {/* Instruction text */}
      <Text variant="body" style={styles.instruction}>
        {instruction}
      </Text>

      {/* Callouts */}
      {tip && <Callout variant="tip">{tip}</Callout>}
      {warning && <Callout variant="warning">{warning}</Callout>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  stepBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontWeight: '700',
    fontSize: 16,
  },
  stepTitle: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  instruction: {
    lineHeight: 26,
  },
});
