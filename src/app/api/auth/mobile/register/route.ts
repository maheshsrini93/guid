import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import {
  signAccessToken,
  signRefreshToken,
  buildTokenPayload,
} from "@/lib/mobile-auth";

const registerSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`mobile-register:${ip}`, RATE_LIMITS.register);
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const sanitizedName = name?.trim() || null;

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: sanitizedName,
      email: normalizedEmail,
      hashedPassword,
      role: "user",
    },
  });

  const payload = buildTokenPayload(user);
  const token = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return NextResponse.json(
    {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      },
    },
    { status: 201 }
  );
}
