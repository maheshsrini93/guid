import { Platform } from "react-native";

/**
 * API base URL for the Guid backend.
 * In development, use your local network IP (not localhost) so the device can reach it.
 * Set via EXPO_PUBLIC_API_URL in .env
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://guid.how";

/** Current platform: "ios" | "android" | "web" */
export const PLATFORM = Platform.OS;

/** Whether running in development mode */
export const IS_DEV = __DEV__;

/** Request timeout in milliseconds */
export const REQUEST_TIMEOUT_MS = 10_000;

/** Max offline actions to queue */
export const MAX_OFFLINE_QUEUE = 100;

/** Max cached guides (offline storage) */
export const MAX_CACHED_GUIDES = 20;
