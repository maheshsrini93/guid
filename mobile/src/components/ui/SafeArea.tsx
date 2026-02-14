import React from 'react';
import { type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';

interface SafeAreaProps extends ViewProps {
  children: React.ReactNode;
}

export function SafeArea({ children, style, ...props }: SafeAreaProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
      {...props}
    >
      {children}
    </SafeAreaView>
  );
}
