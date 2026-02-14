import { apiClient } from "../lib/api-client";

interface VerifyReceiptResponse {
  success: boolean;
  subscriptionTier: string;
  subscriptionSource: string;
}

interface RestoreResponse {
  success: boolean;
  subscriptionTier: string;
  subscriptionSource: string;
}

export function verifyReceipt(
  platform: "apple" | "google",
  receipt: string,
  productId: string
) {
  return apiClient.post<VerifyReceiptResponse>("/api/iap/verify", {
    platform,
    receipt,
    productId,
  });
}

export function restorePurchases(
  platform: "apple" | "google",
  receipt: string,
  productId: string
) {
  return apiClient.post<RestoreResponse>("/api/iap/restore", {
    platform,
    receipt,
    productId,
  });
}
