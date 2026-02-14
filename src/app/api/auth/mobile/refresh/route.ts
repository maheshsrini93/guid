import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  buildTokenPayload,
} from "@/lib/mobile-auth";

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`mobile-refresh:${ip}`, RATE_LIMITS.auth);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = refreshSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Refresh token is required" },
      { status: 400 }
    );
  }

  const decoded = verifyRefreshToken(parsed.data.refreshToken);
  if (!decoded) {
    return NextResponse.json(
      { error: "Invalid or expired refresh token" },
      { status: 401 }
    );
  }

  // Verify user still exists and fetch latest subscription data
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  // Issue fresh tokens with latest user data
  const payload = buildTokenPayload(user);
  const token = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return NextResponse.json({ token, refreshToken });
}
