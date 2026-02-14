import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Text } from "../components/ui";
import { useTheme } from "../theme";
import { spacing } from "../theme/spacing";

export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text variant="h3" color={colors.foreground}>
          Page not found
        </Text>
        <Link href="/" style={styles.link}>
          <Text variant="body" color={colors.primary}>
            Go back home
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  link: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
