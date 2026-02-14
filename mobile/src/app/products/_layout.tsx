import { Stack, useRouter } from "expo-router";
import { Pressable } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "../../theme";

export default function ProductsLayout() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerTitleStyle: { fontFamily: "IBMPlexSans_600SemiBold" },
        headerBackTitleStyle: { fontFamily: "IBMPlexSans_400Regular" },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
        headerLeft: () => (
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{ marginRight: 8 }}
          >
            <ChevronLeft size={28} color={colors.foreground} />
          </Pressable>
        ),
      }}
    />
  );
}
