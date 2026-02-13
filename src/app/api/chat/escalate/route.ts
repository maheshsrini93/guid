import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildEscalationSummary } from "@/lib/chat/escalation-summary";
import { z } from "zod";

const escalateSchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * POST /api/chat/escalate
 *
 * Generate a pre-filled support issue summary from a chat session.
 * Returns the formatted summary text that the user can copy to clipboard
 * or use in a support email.
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof escalateSchema>;
  try {
    const raw = await request.json();
    body = escalateSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Verify session exists and check ownership
  const session = await auth();
  const chatSession = await prisma.chatSession.findUnique({
    where: { id: body.sessionId },
    select: { id: true, userId: true },
  });

  if (!chatSession) {
    return NextResponse.json(
      { error: "Chat session not found" },
      { status: 404 }
    );
  }

  // Ownership: if session has an owner, only that owner may escalate.
  // Anonymous sessions (userId=null) are accessible by session-ID capability.
  const requestingUserId = session?.user?.id ?? null;
  if (chatSession.userId && chatSession.userId !== requestingUserId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const summary = await buildEscalationSummary(body.sessionId);
  if (!summary) {
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }

  return NextResponse.json(summary);
}
