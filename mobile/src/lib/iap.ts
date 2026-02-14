import { Platform } from "react-native";
import { API_URL } from "./config";

/** Product IDs matching App Store Connect / Google Play Console */
export const PRODUCT_IDS = {
  monthly: "guid_premium_monthly",
  annual: "guid_premium_annual",
} as const;

const ALL_SKUS = [PRODUCT_IDS.monthly, PRODUCT_IDS.annual];

/**
 * Lazy-load react-native-iap to avoid crashing in Expo Go.
 * NitroModules (used by react-native-iap) are only available in development/production builds.
 */
function getRNIAP() {
  try {
    return require("react-native-iap") as typeof import("react-native-iap");
  } catch {
    return null;
  }
}

/** Check whether IAP is available in the current runtime (false in Expo Go). */
export function isIAPAvailable(): boolean {
  return getRNIAP() !== null;
}

/**
 * Initialize the IAP connection.
 * Must be called before any other IAP operations.
 */
export async function initIAP(): Promise<boolean> {
  const iap = getRNIAP();
  if (!iap) return false;
  try {
    await iap.initConnection();
    return true;
  } catch (error) {
    console.error("IAP init failed:", error);
    return false;
  }
}

/**
 * Disconnect from the IAP service.
 * Call when the subscription screen unmounts.
 */
export async function disconnectIAP(): Promise<void> {
  const iap = getRNIAP();
  if (!iap) return;
  try {
    await iap.endConnection();
  } catch {
    // Silently ignore disconnect errors
  }
}

/**
 * Fetch available subscription products from the store.
 */
export async function fetchSubscriptionProducts(): Promise<unknown[]> {
  const iap = getRNIAP();
  if (!iap) return [];
  try {
    const products = await iap.fetchProducts({ skus: ALL_SKUS, type: "subs" });
    return products ?? [];
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);
    return [];
  }
}

/**
 * Request a subscription purchase.
 * Returns the purchase object if successful.
 */
export async function purchaseSubscription(
  sku: string
): Promise<unknown | null> {
  const iap = getRNIAP();
  if (!iap) return null;
  try {
    const result = await iap.requestPurchase({
      request:
        Platform.OS === "ios"
          ? { apple: { sku } }
          : { google: { skus: [sku] } },
      type: "subs",
    });
    if (Array.isArray(result)) return result[0] ?? null;
    return result;
  } catch (error) {
    console.error("Purchase failed:", error);
    return null;
  }
}

/**
 * Restore previous purchases.
 * Returns all available purchases for this user/device.
 */
export async function restorePurchasesFromStore(): Promise<unknown[]> {
  const iap = getRNIAP();
  if (!iap) return [];
  try {
    const purchases = await iap.getAvailablePurchases();
    return purchases ?? [];
  } catch (error) {
    console.error("Restore failed:", error);
    return [];
  }
}

/**
 * Acknowledge/finish a transaction to prevent store re-delivery.
 */
export async function acknowledgeTransaction(
  purchase: { purchaseToken?: string } & Record<string, unknown>
): Promise<void> {
  const iap = getRNIAP();
  if (!iap) return;
  try {
    await iap.finishTransaction({ purchase: purchase as never, isConsumable: false });
  } catch (error) {
    console.error("Failed to finish transaction:", error);
  }
}

/**
 * Verify a purchase receipt with the backend.
 */
export async function verifyReceipt(
  purchaseToken: string,
  productId: string,
  accessToken: string
): Promise<{ success: boolean; subscriptionTier: string }> {
  const platform = Platform.OS === "ios" ? "apple" : "google";

  try {
    const res = await fetch(`${API_URL}/api/iap/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ platform, receipt: purchaseToken, productId }),
    });

    if (!res.ok) {
      return { success: false, subscriptionTier: "free" };
    }

    return await res.json();
  } catch {
    return { success: false, subscriptionTier: "free" };
  }
}

/**
 * Restore purchases via the backend.
 */
export async function restoreViaBackend(
  purchaseTokens: string[],
  accessToken: string
): Promise<{ restored: boolean; subscriptionTier: string }> {
  const platform = Platform.OS === "ios" ? "apple" : "google";

  try {
    const res = await fetch(`${API_URL}/api/iap/restore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ platform, receipts: purchaseTokens }),
    });

    if (!res.ok) {
      return { restored: false, subscriptionTier: "free" };
    }

    return await res.json();
  } catch {
    return { restored: false, subscriptionTier: "free" };
  }
}
