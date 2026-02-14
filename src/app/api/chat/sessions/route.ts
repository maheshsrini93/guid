import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";
import { auth } from "@/lib/auth";

/**
 * GET /api/chat/sessions
 *
 * List chat sessions for the authenticated user.
 * Returns sessions ordered by most recent first, with the first
 * user message as a preview and an optional product name.
 */
export async function GET(request: NextRequest) {
  // Try mobile JWT first, fall back to web session
  const mobileUser = await verifyMobileToken(request);
  const webSession = !mobileUser ? await auth() : null;
  const userId = mobileUser?.userId ?? webSession?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      product: {
        select: {
          product_name: true,
          article_number: true,
        },
      },
      messages: {
        where: { role: "user" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  const result = sessions.map((s) => ({
    id: s.id,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    productName: s.product?.product_name ?? null,
    articleNumber: s.product?.article_number ?? null,
    preview: s.messages[0]?.content?.slice(0, 100) ?? "New conversation",
  }));

  return NextResponse.json(result);
}
