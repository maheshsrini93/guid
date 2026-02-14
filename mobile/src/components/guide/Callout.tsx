import { AlertTriangle, Info, Lightbulb } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { borderRadius, spacing } from '../../theme/spacing';
import { Icon, Text } from '../ui';

type CalloutVariant = 'tip' | 'warning' | 'info';

interface CalloutProps {
  variant: CalloutVariant;
  children: string;
}

const variantConfig = {
  tip: { icon: Lightbulb, label: 'Tip' },
  warning: { icon: AlertTriangle, label: 'Warning' },
  info: { icon: Info, label: 'Info' },
};

export function Callout({ variant, children }: CalloutProps) {
  const { colors } = useTheme();

  const colorMap: Record<CalloutVariant, { bg: string; border: string; text: string }> = {
    tip: {
      bg: colors.warning + '15',
      border: colors.warning,
      text: colors.foreground,
    },
    warning: {
      bg: colors.destructive + '15',
      border: colors.destructive,
      text: colors.foreground,
    },
    info: {
      bg: colors.info + '15',
      border: colors.info,
      text: colors.foreground,
    },
  };

  const c = colorMap[variant];
  const config = variantConfig[variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.bg,
          borderLeftColor: c.border,
        },
      ]}
    >
      <View style={styles.header}>
        <Icon icon={config.icon} size={16} color={c.border} />
        <Text variant="bodySmall" color={c.border} style={styles.label}>
          {config.label}
        </Text>
      </View>
      <Text variant="bodySmall" color={c.text}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 4,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
});
