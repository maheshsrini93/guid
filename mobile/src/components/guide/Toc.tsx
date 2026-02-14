import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/spacing';
import { Text } from '../ui';

interface TocStep {
  stepNumber: number;
  title: string;
}

interface TocProps {
  steps: TocStep[];
  currentStep: number;
  onStepPress: (index: number) => void;
  onClose: () => void;
}

export function Toc({ steps, currentStep, onStepPress, onClose }: TocProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text variant="h4">Table of Contents</Text>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close table of contents"
        >
          <Text variant="body" color={colors.primary}>
            Done
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={steps}
        keyExtractor={(item) => item.stepNumber.toString()}
        renderItem={({ item, index }) => {
          const isActive = index === currentStep;
          return (
            <Pressable
              onPress={() => onStepPress(index)}
              style={({ pressed }) => [
                styles.tocItem,
                {
                  backgroundColor: isActive
                    ? colors.primary + '18'
                    : pressed
                      ? colors.muted
                      : 'transparent',
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Go to step ${item.stepNumber}: ${item.title}`}
              accessibilityState={{ selected: isActive }}
            >
              <View
                style={[
                  styles.tocNumber,
                  {
                    backgroundColor: isActive
                      ? colors.primary
                      : colors.muted,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  color={
                    isActive ? colors.primaryForeground : colors.mutedForeground
                  }
                  style={styles.tocNumberText}
                >
                  {item.stepNumber}
                </Text>
              </View>
              <Text
                variant="body"
                color={isActive ? colors.primary : colors.foreground}
                style={isActive ? styles.activeTocTitle : undefined}
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  tocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tocNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tocNumberText: {
    fontWeight: '700',
  },
  activeTocTitle: {
    fontWeight: '600',
  },
});
