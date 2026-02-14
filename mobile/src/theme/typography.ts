import { StyleSheet } from 'react-native';

/**
 * Font family constants matching the keys loaded via useFonts() in _layout.tsx.
 * These exact strings are what React Native uses as fontFamily values.
 */
export const fontFamily = {
  regular: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

/**
 * Type scale from design-guidelines.md, adapted for React Native.
 * Mobile-first sizes — no clamp() needed since RN uses fixed dp.
 */
export const textStyles = StyleSheet.create({
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 38,
  },
  h2: {
    fontFamily: fontFamily.semibold,
    fontSize: 24,
    lineHeight: 30,
  },
  h3: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 26,
  },
  h4: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 26,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  mono: {
    fontFamily: fontFamily.monoRegular,
    fontSize: 14,
    lineHeight: 21,
  },
});
