import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';
import { spacing } from '../../theme/spacing';
import { Text } from '../ui';

interface SpecRow {
  label: string;
  value: string;
}

interface SpecTableProps {
  specs: SpecRow[];
}

export function SpecTable({ specs }: SpecTableProps) {
  const { colors } = useTheme();

  if (specs.length === 0) return null;

  return (
    <View style={styles.container}>
      {specs.map((spec, i) => (
        <View
          key={spec.label}
          style={[
            styles.row,
            {
              backgroundColor:
                i % 2 === 0 ? colors.muted : 'transparent',
            },
          ]}
        >
          <Text variant="bodySmall" color={colors.mutedForeground} style={styles.label}>
            {spec.label}
          </Text>
          <Text variant="mono" style={styles.value}>
            {spec.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  label: {
    flex: 1,
  },
  value: {
    flex: 1,
    textAlign: 'right',
  },
});
