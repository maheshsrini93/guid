import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme';

interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const { colors } = useTheme();
  const progress = total > 0 ? Math.min((current + 1) / total, 1) : 0;

  return (
    <View style={[styles.track, { backgroundColor: colors.muted }]}>
      <View
        style={[
          styles.fill,
          {
            backgroundColor: colors.primary,
            width: `${progress * 100}%`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    width: '100%',
  },
  fill: {
    height: '100%',
  },
});
