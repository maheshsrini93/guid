import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChatUsage } from "@/lib/chat/chat-limits";

/**
 * GET /api/chat/usage
 *
 * Returns the current user's chat session usage for the current
 * billing period (calendar month). Used by the client to display
 * remaining chat count and determine if the upgrade prompt should show.
 */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const usage = await getChatUsage(userId);

  return NextResponse.json(usage);
}
