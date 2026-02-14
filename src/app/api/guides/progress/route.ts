import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";

const progressSchema = z.object({
  articleNumber: z.string().min(1),
  currentStep: z.number().int().min(0),
});

export async function POST(request: Request) {
  const user = await verifyMobileToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "articleNumber and currentStep are required" },
      { status: 400 }
    );
  }

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { article_number: parsed.data.articleNumber },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Upsert progress in database (persists across deploys)
  await prisma.guideProgress.upsert({
    where: {
      userId_articleNumber: {
        userId: user.userId,
        articleNumber: parsed.data.articleNumber,
      },
    },
    update: { currentStep: parsed.data.currentStep },
    create: {
      userId: user.userId,
      articleNumber: parsed.data.articleNumber,
      currentStep: parsed.data.currentStep,
    },
  });

  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const user = await verifyMobileToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const articleNumber = url.searchParams.get("articleNumber");

  if (articleNumber) {
    const progress = await prisma.guideProgress.findUnique({
      where: {
        userId_articleNumber: {
          userId: user.userId,
          articleNumber,
        },
      },
    });
    return NextResponse.json({
      articleNumber,
      currentStep: progress?.currentStep ?? 0,
    });
  }

  // Return all progress for the user
  const allProgress = await prisma.guideProgress.findMany({
    where: { userId: user.userId },
  });

  const progressMap: Record<string, number> = {};
  for (const p of allProgress) {
    progressMap[p.articleNumber] = p.currentStep;
  }

  return NextResponse.json({ progress: progressMap });
}
