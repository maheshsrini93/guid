import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '../../theme';
import { borderRadius, shadows, spacing } from '../../theme/spacing';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  const { colors, isDark } = useTheme();
  const shadow = isDark ? shadows.dark.md : shadows.light.md;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...shadow,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    overflow: 'hidden',
  },
});
