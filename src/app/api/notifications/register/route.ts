import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

export async function POST(request: Request) {
  const user = await verifyMobileToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, platform } = parsed.data;

  // Upsert: if token already exists, reassign to this user
  await prisma.devicePushToken.upsert({
    where: { token },
    update: {
      userId: user.userId,
      platform,
    },
    create: {
      userId: user.userId,
      token,
      platform,
    },
  });

  return NextResponse.json({ success: true });
}
