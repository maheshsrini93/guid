import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Info, Moon, Bell, Trash2 } from "lucide-react-native";
import { Text } from "../components/ui/Text";
import { Separator } from "../components/ui/Separator";
import { useTheme } from "../theme";
import { spacing } from "../theme/spacing";

/**
 * Settings screen with dark mode toggle, notification preferences,
 * cache management, and app info.
 */
export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      "Clear Cache",
      "This will remove all cached data including offline guides. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            try {
              // Clear AsyncStorage except auth tokens (those are in SecureStore)
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter(
                (k) => !k.startsWith("guid_") && k !== "guid-theme-preference"
              );
              if (cacheKeys.length > 0) {
                await AsyncStorage.multiRemove(cacheKeys);
              }
              Alert.alert("Done", "Cache cleared successfully.");
            } catch {
              Alert.alert("Error", "Failed to clear cache.");
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  }, []);

  const appVersion =
    Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? "1.0.0";

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Settings",
          headerTitleStyle: { fontFamily: "IBMPlexSans_600SemiBold" },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
      >
        {/* Dark mode */}
        <View style={styles.row}>
          <Moon size={20} color={colors.foreground} />
          <Text variant="body" style={styles.rowLabel}>
            Dark Mode
          </Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor="#ffffff"
            accessibilityLabel="Toggle dark mode"
          />
        </View>

        <Separator />

        {/* Notifications */}
        <View style={styles.row}>
          <Bell size={20} color={colors.foreground} />
          <Text variant="body" style={styles.rowLabel}>
            Notifications
          </Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor="#ffffff"
            accessibilityLabel="Toggle notifications"
          />
        </View>

        <Separator />

        {/* Clear cache */}
        <Pressable
          style={({ pressed }) => [
            styles.row,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={handleClearCache}
          disabled={isClearing}
          accessibilityRole="button"
          accessibilityLabel="Clear cache"
        >
          <Trash2 size={20} color={colors.destructive} />
          <Text variant="body" color={colors.destructive} style={styles.rowLabel}>
            {isClearing ? "Clearing..." : "Clear Cache"}
          </Text>
        </Pressable>

        <Separator />

        {/* About */}
        <View style={styles.aboutSection}>
          <View style={styles.row}>
            <Info size={20} color={colors.foreground} />
            <Text variant="body" style={styles.rowLabel}>
              About Guid
            </Text>
          </View>
          <Text variant="bodySmall" color={colors.mutedForeground}>
            Guid provides step-by-step assembly, setup, and troubleshooting
            guides for products from any brand. Built with care for makers and
            fixers everywhere.
          </Text>
          <Text variant="caption" color={colors.mutedForeground}>
            Version {appVersion}
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  rowLabel: {
    flex: 1,
  },
  aboutSection: {
    gap: spacing.sm,
  },
});
