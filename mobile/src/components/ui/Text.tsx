import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';

import { useTheme } from '../../theme';
import { textStyles } from '../../theme/typography';

type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodySmall' | 'caption' | 'mono';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
}

export function Text({
  variant = 'body',
  color,
  style,
  ...props
}: TextProps) {
  const { colors } = useTheme();

  return (
    <RNText
      style={[
        textStyles[variant],
        { color: color ?? colors.foreground },
        style,
      ]}
      {...props}
    />
  );
}
