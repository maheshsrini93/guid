/**
 * Design tokens ported from the web app's globals.css.
 * oklch values converted to hex using the fallback values from design-guidelines.md.
 */

export const colors = {
  light: {
    background: '#fdfcfb',
    foreground: '#1f1a14',
    card: '#fdfcfb',
    cardForeground: '#1f1a14',
    popover: '#fdfcfb',
    popoverForeground: '#1f1a14',
    primary: '#e5932c',
    primaryForeground: '#1f1a14',
    secondary: '#f6f3f0',
    secondaryForeground: '#3b3228',
    muted: '#f2efec',
    mutedForeground: '#6b5e52',
    accent: '#f0c07a',
    accentForeground: '#2d261e',
    destructive: '#d93636',
    destructiveForeground: '#faf8f6',
    border: '#e0d8d0',
    input: '#d1c8be',
    ring: '#e5932c',
    // Semantic colors
    success: '#3d9a50',
    warning: '#d4a739',
    info: '#4a80c4',
  },
  dark: {
    background: '#1a1714',
    foreground: '#f4f0ec',
    card: '#282320',
    cardForeground: '#f4f0ec',
    popover: '#282320',
    popoverForeground: '#f4f0ec',
    primary: '#e5932c',
    primaryForeground: '#1f1a14',
    secondary: '#2e2924',
    secondaryForeground: '#e0d8d0',
    muted: '#2e2924',
    mutedForeground: '#9c8e80',
    accent: '#4a3d2e',
    accentForeground: '#e0d8d0',
    destructive: '#d93636',
    destructiveForeground: '#f4f0ec',
    border: '#3e3730',
    input: '#3e3730',
    ring: '#e5932c',
    // Semantic colors
    success: '#4aad5e',
    warning: '#dab544',
    info: '#5a90d4',
  },
} as const;

export interface ColorTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  success: string;
  warning: string;
  info: string;
}

export type ColorScheme = 'light' | 'dark';
