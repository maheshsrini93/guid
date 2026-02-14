import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/spacing';
import { Text } from './Text';

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  children: string;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  const { colors } = useTheme();

  const variantStyles: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
    default: { bg: colors.primary, text: colors.primaryForeground },
    success: { bg: colors.success, text: '#ffffff' },
    warning: { bg: colors.warning, text: '#1f1a14' },
    destructive: { bg: colors.destructive, text: colors.destructiveForeground },
    outline: { bg: 'transparent', text: colors.foreground, border: colors.border },
  };

  const v = variantStyles[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
        },
      ]}
    >
      <Text variant="caption" color={v.text} style={styles.text}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs - 1,
    borderRadius: borderRadius.full,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
});
