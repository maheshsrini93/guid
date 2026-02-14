import type { LucideIcon, LucideProps } from 'lucide-react-native';
import React from 'react';

import { useTheme } from '../../theme';

interface IconProps extends Omit<LucideProps, 'ref'> {
  /** Pass the imported Lucide icon component, e.g. `icon={Search}` */
  icon: LucideIcon;
  size?: number;
  color?: string;
}

/**
 * Themed wrapper around Lucide icons.
 *
 * Usage:
 *   import { Search } from 'lucide-react-native';
 *   <Icon icon={Search} size={20} />
 */
export function Icon({ icon: LucideComponent, size = 24, color, ...props }: IconProps) {
  const { colors } = useTheme();

  return <LucideComponent size={size} color={color ?? colors.foreground} {...props} />;
}
