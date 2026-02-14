import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/spacing';
import { fontFamily } from '../../theme/typography';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'default' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  style?: ViewStyle;
  children: React.ReactNode;
}

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 36 },
  default: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 4, minHeight: 44 },
  lg: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, minHeight: 52 },
};

export function Button({
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled,
  style,
  children,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
    primary: { bg: colors.primary, text: colors.primaryForeground },
    secondary: { bg: colors.muted, text: colors.foreground },
    ghost: { bg: 'transparent', text: colors.foreground },
    outline: { bg: 'transparent', text: colors.foreground, border: colors.border },
  };

  const v = variantStyles[variant];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : typeof children === 'string' ? (
        <Text
          variant="body"
          color={v.text}
          style={[styles.label, size === 'sm' && styles.labelSm]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    minWidth: 44,
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
  },
  labelSm: {
    fontSize: 14,
  },
});
