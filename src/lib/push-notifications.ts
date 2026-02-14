import Expo, {
  type ExpoPushMessage,
  type ExpoPushTicket,
} from "expo-server-sdk";
import { prisma } from "@/lib/prisma";

const expo = new Expo();

/**
 * Send a push notification to all of a user's registered devices.
 * Returns the number of successfully sent messages.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<number> {
  const tokens = await prisma.devicePushToken.findMany({
    where: { userId },
    select: { id: true, token: true },
  });

  if (tokens.length === 0) return 0;

  const messages: ExpoPushMessage[] = [];
  const validTokenIds: string[] = [];

  for (const { id, token } of tokens) {
    if (!Expo.isExpoPushToken(token)) {
      // Remove invalid token from DB
      await prisma.devicePushToken.delete({ where: { id } }).catch(() => {});
      continue;
    }

    messages.push({
      to: token,
      sound: "default",
      title,
      body,
      data: data ?? {},
    });
    validTokenIds.push(id);
  }

  if (messages.length === 0) return 0;

  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;

  for (const chunk of chunks) {
    try {
      const tickets: ExpoPushTicket[] =
        await expo.sendPushNotificationsAsync(chunk);

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === "ok") {
          sent++;
        } else if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered"
        ) {
          // Token is stale — remove it
          await prisma.devicePushToken
            .delete({ where: { id: validTokenIds[i] } })
            .catch(() => {});
        }
      }
    } catch (error) {
      console.error("Push notification chunk send error:", error);
    }
  }

  return sent;
}

/**
 * Send a push notification to multiple users at once.
 * Useful for broadcasting announcements.
 */
export async function sendBulkPushNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<number> {
  let totalSent = 0;
  for (const userId of userIds) {
    totalSent += await sendPushNotification(userId, title, body, data);
  }
  return totalSent;
}
