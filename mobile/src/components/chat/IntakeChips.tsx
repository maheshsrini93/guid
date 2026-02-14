import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Text } from "../ui/Text";
import { useTheme } from "../../theme";
import { borderRadius, spacing } from "../../theme/spacing";

const PROBLEM_CATEGORIES = [
  "Assembly Help",
  "Missing Part",
  "Broken Part",
  "General Question",
] as const;

const TIMING_OPTIONS = [
  "Just started",
  "Midway",
  "Almost done",
  "After assembly",
] as const;

export type ProblemCategory = (typeof PROBLEM_CATEGORIES)[number];
export type TimingOption = (typeof TIMING_OPTIONS)[number];

interface IntakeChipsProps {
  /** Which chip group to display */
  type: "problem" | "timing";
  /** Currently selected value */
  selected: string | null;
  /** Callback when a chip is tapped */
  onSelect: (value: string) => void;
}

/**
 * Tappable chip selectors for the chat intake flow.
 * "problem" shows category chips; "timing" shows assembly progress chips.
 */
export function IntakeChips({ type, selected, onSelect }: IntakeChipsProps) {
  const { colors } = useTheme();
  const options = type === "problem" ? PROBLEM_CATEGORIES : TIMING_OPTIONS;

  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <Pressable
            key={option}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : "transparent",
                borderColor: isSelected ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(option);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option}
          >
            <Text
              variant="bodySmall"
              color={isSelected ? colors.primaryForeground : colors.foreground}
              style={styles.chipText}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    minHeight: 44,
    justifyContent: "center",
  },
  chipText: {
    fontWeight: "500",
  },
});
