import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Crown,
  Download,
  MessageCircle,
  Wifi,
  Video,
  Check,
} from "lucide-react-native";
import { useTheme } from "../../theme";
import { fontFamily } from "../../theme/typography";
import { useAuth } from "../../lib/AuthContext";
import { getToken } from "../../lib/auth";
import {
  isIAPAvailable,
  initIAP,
  disconnectIAP,
  fetchSubscriptionProducts,
  purchaseSubscription,
  acknowledgeTransaction,
  verifyReceipt,
  restorePurchasesFromStore,
  restoreViaBackend,
  PRODUCT_IDS,
} from "../../lib/iap";

const FEATURES = [
  { icon: Download, label: "Download guides for offline access" },
  { icon: MessageCircle, label: "Unlimited AI chat sessions" },
  { icon: Video, label: "Premium video guides" },
  { icon: Wifi, label: "No ads, ever" },
] as const;

export default function UpgradeScreen() {
  const { colors, isDark } = useTheme();
  const { user, refreshAuth } = useAuth();
  const [selectedSku, setSelectedSku] = useState<string>(PRODUCT_IDS.annual);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [iapAvailable, setIapAvailable] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!isIAPAvailable()) {
        if (mounted) {
          setIapAvailable(false);
          setLoading(false);
        }
        return;
      }
      const ok = await initIAP();
      if (!ok || !mounted) {
        setLoading(false);
        return;
      }
      await fetchSubscriptionProducts();
      if (mounted) {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      disconnectIAP();
    };
  }, []);

  const handlePurchase = useCallback(async () => {
    if (purchasing) return;
    setPurchasing(true);

    try {
      const purchase = await purchaseSubscription(selectedSku);
      if (!purchase) {
        Alert.alert("Purchase Failed", "The purchase could not be completed.");
        return;
      }

      // Get the purchase token to send to the backend for verification
      const purchaseToken = (purchase as { purchaseToken?: string }).purchaseToken ?? "";

      const token = await getToken();
      if (token && purchaseToken) {
        const result = await verifyReceipt(purchaseToken, selectedSku, token);
        if (result.success) {
          await acknowledgeTransaction(purchase as { purchaseToken?: string } & Record<string, unknown>);
          await refreshAuth();
          Alert.alert("Welcome to Premium!", "Your subscription is now active.");
        } else {
          Alert.alert("Verification Failed", "Please try again or contact support.");
        }
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setPurchasing(false);
    }
  }, [selectedSku, purchasing, refreshAuth]);

  const handleRestore = useCallback(async () => {
    setPurchasing(true);
    try {
      const purchases = await restorePurchasesFromStore();
      const tokens = purchases
        .map((p) => (p as { purchaseToken?: string }).purchaseToken)
        .filter(Boolean) as string[];

      if (tokens.length === 0) {
        Alert.alert("No Purchases Found", "No previous purchases were found on this account.");
        return;
      }

      const token = await getToken();
      if (token) {
        const result = await restoreViaBackend(tokens, token);
        if (result.restored) {
          await refreshAuth();
          Alert.alert("Restored!", "Your subscription has been restored.");
        } else {
          Alert.alert("No Active Subscription", "No active subscription was found.");
        }
      }
    } catch {
      Alert.alert("Error", "Could not restore purchases. Please try again.");
    } finally {
      setPurchasing(false);
    }
  }, [refreshAuth]);

  const isPremium = user?.subscriptionTier === "premium";

  if (isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Crown size={48} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          You're Premium
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Thank you for your support! You have access to all premium features.
        </Text>
      </View>
    );
  }

  if (!iapAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Crown size={48} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          Guid Premium
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          In-App Purchases are not available in Expo Go. Use a development build
          (eas build) to test subscriptions.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Crown size={40} color={colors.primary} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          Guid Premium
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Unlock the full experience
        </Text>
      </View>

      <View
        style={[
          styles.featuresCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {FEATURES.map(({ icon: Icon, label }) => (
          <View key={label} style={styles.featureRow}>
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: isDark ? colors.accent : "#fef3c7" },
              ]}
            >
              <Icon size={18} color={colors.primary} />
            </View>
            <Text style={[styles.featureLabel, { color: colors.foreground }]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : (
        <View style={styles.plansContainer}>
          <Pressable
            style={[
              styles.planCard,
              {
                backgroundColor: colors.card,
                borderColor:
                  selectedSku === PRODUCT_IDS.annual
                    ? colors.primary
                    : colors.border,
                borderWidth: selectedSku === PRODUCT_IDS.annual ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedSku(PRODUCT_IDS.annual)}
          >
            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: colors.foreground }]}>
                Annual
              </Text>
              <View
                style={[
                  styles.saveBadge,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.saveBadgeText}>Save 40%</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, { color: colors.foreground }]}>
              $59.99
              <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}>
                /year
              </Text>
            </Text>
            <Text style={[styles.planDetail, { color: colors.mutedForeground }]}>
              $5.00/month, billed annually
            </Text>
            {selectedSku === PRODUCT_IDS.annual && (
              <View style={[styles.selectedCheck, { backgroundColor: colors.primary }]}>
                <Check size={14} color="#fff" />
              </View>
            )}
          </Pressable>

          <Pressable
            style={[
              styles.planCard,
              {
                backgroundColor: colors.card,
                borderColor:
                  selectedSku === PRODUCT_IDS.monthly
                    ? colors.primary
                    : colors.border,
                borderWidth: selectedSku === PRODUCT_IDS.monthly ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedSku(PRODUCT_IDS.monthly)}
          >
            <Text style={[styles.planName, { color: colors.foreground }]}>
              Monthly
            </Text>
            <Text style={[styles.planPrice, { color: colors.foreground }]}>
              $7.99
              <Text style={[styles.planPeriod, { color: colors.mutedForeground }]}>
                /month
              </Text>
            </Text>
            <Text style={[styles.planDetail, { color: colors.mutedForeground }]}>
              Cancel anytime
            </Text>
            {selectedSku === PRODUCT_IDS.monthly && (
              <View style={[styles.selectedCheck, { backgroundColor: colors.primary }]}>
                <Check size={14} color="#fff" />
              </View>
            )}
          </Pressable>
        </View>
      )}

      <Pressable
        style={[
          styles.purchaseButton,
          { backgroundColor: colors.primary, opacity: purchasing ? 0.6 : 1 },
        ]}
        onPress={handlePurchase}
        disabled={purchasing || loading}
      >
        {purchasing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.purchaseButtonText}>Subscribe Now</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={purchasing}
      >
        <Text
          style={[styles.restoreButtonText, { color: colors.mutedForeground }]}
        >
          Restore Purchases
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamily.bold,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
    textAlign: "center",
  },
  featuresCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: {
    fontSize: 15,
    fontFamily: fontFamily.medium,
    flex: 1,
  },
  loader: {
    marginVertical: 32,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    borderRadius: 12,
    padding: 16,
    position: "relative",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planName: {
    fontSize: 18,
    fontFamily: fontFamily.semibold,
  },
  saveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  saveBadgeText: {
    fontSize: 12,
    fontFamily: fontFamily.semibold,
    color: "#fff",
  },
  planPrice: {
    fontSize: 24,
    fontFamily: fontFamily.bold,
    marginTop: 4,
  },
  planPeriod: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
  },
  planDetail: {
    fontSize: 13,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  selectedCheck: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseButton: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontFamily: fontFamily.semibold,
    color: "#fff",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  restoreButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
  },
});
