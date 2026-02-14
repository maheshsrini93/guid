import * as Notifications from "expo-notifications";
import * as Device from "expo-constants";
import { Platform } from "react-native";
import { API_URL, PLATFORM } from "./config";

/**
 * Configure how notifications behave when the app is in the foreground.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions from the user.
 * Returns true if permissions were granted.
 */
export async function requestPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Get the Expo push token and register it with the backend.
 * Returns the push token string on success, null on failure.
 */
export async function registerForPushNotifications(
  accessToken: string
): Promise<string | null> {
  const granted = await requestPermissions();
  if (!granted) return null;

  // Android needs a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#f59e0b",
    });
  }

  try {
    const projectId = Device.default.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const pushToken = tokenData.data;

    // Register token with backend
    await fetch(`${API_URL}/api/notifications/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        token: pushToken,
        platform: PLATFORM as "ios" | "android",
      }),
    });

    return pushToken;
  } catch (error) {
    console.error("Failed to register push notifications:", error);
    return null;
  }
}

/**
 * Process an incoming notification when the app is in the foreground.
 */
export function handleNotificationReceived(
  notification: Notifications.Notification
): { route: string | null; params: Record<string, string> } {
  const data = notification.request.content.data as Record<string, string> | undefined;
  if (!data?.route) return { route: null, params: {} };

  return {
    route: data.route,
    params: data,
  };
}
