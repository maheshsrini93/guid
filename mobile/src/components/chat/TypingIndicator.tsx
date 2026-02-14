import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme";
import { borderRadius, spacing } from "../../theme/spacing";

/**
 * Three pulsing dots that appear while the AI is generating a response.
 * Uses Animated API with staggered timing for a natural wave effect.
 */
export function TypingIndicator() {
  const { colors } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );

    const animation = Animated.parallel([
      createPulse(dot1, 0),
      createPulse(dot2, 150),
      createPulse(dot3, 300),
    ]);

    animation.start();
    return () => animation.stop();
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      {
        scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }),
      },
    ],
  });

  return (
    <View
      style={[styles.container, { backgroundColor: colors.muted }]}
      accessible
      accessibilityLabel="AI is thinking"
      accessibilityRole="progressbar"
    >
      <Animated.View
        style={[styles.dot, { backgroundColor: colors.mutedForeground }, dotStyle(dot1)]}
      />
      <Animated.View
        style={[styles.dot, { backgroundColor: colors.mutedForeground }, dotStyle(dot2)]}
      />
      <Animated.View
        style={[styles.dot, { backgroundColor: colors.mutedForeground }, dotStyle(dot3)]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
