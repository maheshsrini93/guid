import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "guid_access_token";
const REFRESH_TOKEN_KEY = "guid_refresh_token";

/** Retrieve the stored access token. */
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/** Retrieve the stored refresh token. */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/** Store both access and refresh tokens securely. */
export async function setTokens(
  token: string,
  refreshToken: string
): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

/** Remove all stored tokens (logout). */
export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

/** Check if we have a stored access token. */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}

/**
 * Decode the JWT payload without verification (client-side only).
 * Used to read expiry time for auto-refresh scheduling.
 */
export function decodeTokenPayload(token: string): {
  exp?: number;
  userId?: string;
  email?: string;
  role?: string;
  subscriptionTier?: string;
  subscriptionEndsAt?: string | null;
} | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Handle base64url encoding (JWTs use - and _ instead of + and /)
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch {
    return null;
  }
}
