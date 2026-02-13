import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { buildSystemPrompt } from "@/lib/chat/system-prompt";
import { detectIntent } from "@/lib/chat/intent-detection";
import { canUserStartChat } from "@/lib/chat/chat-limits";
import { z } from "zod";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_PRO_MODEL = "gemini-2.5-pro";

const chatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  sessionId: z.string().optional(),
  productId: z.coerce.number().int().positive().optional(),
  imageBase64: z.string().optional(),
  imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
});

/**
 * POST /api/chat
 *
 * Streaming chat endpoint using Server-Sent Events.
 * Sends user message to Gemini 2.5 Flash and streams the response.
 *
 * Request body:
 *   - message: string (user's message text)
 *   - sessionId?: string (existing session to continue)
 *   - productId?: number (product context, used when starting from a product page)
 *   - imageBase64?: string (base64-encoded image for photo diagnosis)
 *   - imageMimeType?: string (MIME type of the image)
 *
 * Response: SSE stream with events:
 *   - data: {"type":"session","sessionId":"..."} (first event, provides session ID)
 *   - data: {"type":"delta","content":"..."} (streamed text chunks)
 *   - data: {"type":"done","messageId":"..."} (stream complete)
 *   - data: {"type":"error","message":"..."} (on error)
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIp(request);
  const session = await auth();
  const rateLimitKey = session?.user?.id
    ? `chat:user:${session.user.id}`
    : `chat:ip:${ip}`;

  const rl = rateLimit(rateLimitKey, RATE_LIMITS.chat);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  // Parse and validate request body
  let body: z.infer<typeof chatRequestSchema>;
  try {
    const raw = await request.json();
    body = chatRequestSchema.parse(raw);
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { message, sessionId, productId, imageBase64, imageMimeType } = body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat service is not configured" },
      { status: 503 }
    );
  }

  // Resolve or create chat session
  let chatSessionId: string;
  let resolvedProductId: number | undefined = productId;
  try {
    if (sessionId) {
      // Verify session exists and get its productId
      const existing = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: { id: true, status: true, productId: true, userId: true },
      });
      if (!existing || existing.status !== "active") {
        return NextResponse.json(
          { error: "Chat session not found or closed" },
          { status: 404 }
        );
      }
      // Ownership check: if session has a userId, it must match the requesting user
      if (existing.userId && existing.userId !== (session?.user?.id ?? null)) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }
      chatSessionId = existing.id;
      resolvedProductId = resolvedProductId ?? existing.productId ?? undefined;
    } else {
      // Check free tier limit before creating a new session
      const userId = session?.user?.id ?? null;
      if (userId) {
        const allowed = await canUserStartChat(userId);
        if (!allowed) {
          return NextResponse.json(
            { error: "Monthly chat limit reached. Upgrade for unlimited chats.", code: "LIMIT_REACHED" },
            { status: 403 }
          );
        }
      }

      // Create a new session
      const newSession = await prisma.chatSession.create({
        data: {
          userId: session?.user?.id ?? null,
          productId: productId ?? null,
          status: "active",
        },
      });
      chatSessionId = newSession.id;
    }
  } catch (error) {
    console.error("Failed to manage chat session:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to create chat session" },
      { status: 500 }
    );
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      sessionId: chatSessionId,
      role: "user",
      content: message,
      imageUrl: imageBase64 && imageMimeType ? `image:${imageMimeType}` : null,
    },
  });

  // Load conversation history for context
  const previousMessages = await prisma.chatMessage.findMany({
    where: { sessionId: chatSessionId },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  // Build Gemini request body
  const contents = previousMessages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // If image is provided with the current message, add it to the last user message
  if (imageBase64 && imageMimeType) {
    const lastContent = contents[contents.length - 1];
    if (lastContent && lastContent.role === "user") {
      lastContent.parts.unshift({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }
  }

  // Build system prompt with product context
  const systemPrompt = await buildSystemPrompt({
    productId: resolvedProductId,
    userName: session?.user?.name ?? undefined,
    hasImage: !!imageBase64,
  });

  // Determine model — use Pro for image analysis, Flash for text
  const model = imageBase64 ? GEMINI_PRO_MODEL : GEMINI_MODEL;

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

  // Create SSE stream
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send session ID as first event
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "session", sessionId: chatSessionId })}\n\n`
        )
      );

      // Intent detection on first message of a session
      if (previousMessages.length <= 1 && resolvedProductId) {
        const intentResult = await detectIntent(message, resolvedProductId);
        if (intentResult.intent === "assembly" && intentResult.guideRedirect?.guideExists) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "intent",
                intent: intentResult.intent,
                confidence: intentResult.confidence,
                guideRedirect: intentResult.guideRedirect,
              })}\n\n`
            )
          );
        }
      }

      let fullResponse = "";

      try {
        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          }),
        });

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error("Gemini API error:", geminiResponse.status);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Failed to generate response" })}\n\n`
            )
          );
          controller.close();
          return;
        }

        const reader = geminiResponse.body?.getReader();
        if (!reader) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "No response stream" })}\n\n`
            )
          );
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Gemini SSE format: "data: {json}\n\n"
          const lines = buffer.split("\n");
          buffer = "";

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              try {
                const chunk = JSON.parse(jsonStr);
                const text =
                  chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  fullResponse += text;
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: "delta", content: text })}\n\n`
                    )
                  );
                }
              } catch {
                // Incomplete JSON — re-buffer this line and everything after it
                buffer = lines.slice(i).join("\n");
                break;
              }
            }
          }
        }

        // Save assistant message
        const assistantMessage = await prisma.chatMessage.create({
          data: {
            sessionId: chatSessionId,
            role: "assistant",
            content: fullResponse || "(no response)",
          },
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "done", messageId: assistantMessage.id })}\n\n`
          )
        );
      } catch (error) {
        console.error("Chat stream error:", error instanceof Error ? error.message : String(error));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "Stream interrupted" })}\n\n`
          )
        );

        // Still save partial response if we have one
        if (fullResponse) {
          await prisma.chatMessage.create({
            data: {
              sessionId: chatSessionId,
              role: "assistant",
              content: fullResponse,
            },
          });
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
