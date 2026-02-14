import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../theme";
import { spacing, borderRadius } from "../theme";

export default function RegisterScreen() {
  const { register } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + spacing.md },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>

        <View style={styles.header}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            accessibilityRole="header"
          >
            Create Account
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Join Guid to save products and access premium features
          </Text>
        </View>

        {error && (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: colors.destructive + "15" },
            ]}
            accessibilityRole="alert"
          >
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text
              style={[styles.label, { color: colors.foreground }]}
              nativeID="name-label"
            >
              Name (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              editable={!loading}
              accessibilityLabelledBy="name-label"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text
              style={[styles.label, { color: colors.foreground }]}
              nativeID="email-label"
            >
              Email
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="you@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!loading}
              accessibilityLabelledBy="email-label"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text
              style={[styles.label, { color: colors.foreground }]}
              nativeID="password-label"
            >
              Password
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              editable={!loading}
              accessibilityLabelledBy="password-label"
              onSubmitEditing={handleRegister}
            />
          </View>

          <Pressable
            style={[
              styles.button,
              { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 },
            ]}
            onPress={handleRegister}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.primaryForeground },
                ]}
              >
                Create Account
              </Text>
            )}
          </Pressable>
        </View>

        <Link href="/login" style={styles.link}>
          <Text style={[styles.linkText, { color: colors.primary }]}>
            Already have an account? Sign in
          </Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.sm,
  },
  header: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: "IBMPlexSans_700Bold",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "IBMPlexSans_400Regular",
    lineHeight: 22,
  },
  errorBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "IBMPlexSans_500Medium",
  },
  form: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontFamily: "IBMPlexSans_500Medium",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontFamily: "IBMPlexSans_400Regular",
  },
  button: {
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "IBMPlexSans_600SemiBold",
  },
  link: {
    marginTop: spacing.lg,
    alignSelf: "center",
  },
  linkText: {
    fontSize: 14,
    fontFamily: "IBMPlexSans_500Medium",
  },
});
