import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { type EventSubscription } from "expo-modules-core";
import { useRouter } from "expo-router";
import {
  registerForPushNotifications,
  handleNotificationReceived,
} from "../lib/notifications";

/**
 * Hook that manages push notification registration and incoming notification handling.
 *
 * @param accessToken - The current user's access JWT. Pass null when not authenticated.
 *
 * Behavior:
 * - Registers for push notifications when accessToken is non-null
 * - Listens for incoming notifications in the foreground
 * - Handles notification tap by navigating to the relevant screen
 */
export function useNotifications(accessToken: string | null) {
  const router = useRouter();
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    // Register push token with the backend
    registerForPushNotifications(accessToken);

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        handleNotificationReceived(notification);
      });

    // Handle notification tap (user tapped on notification)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | Record<string, string>
          | undefined;

        if (data?.route) {
          router.push(data.route as never);
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [accessToken, router]);
}
