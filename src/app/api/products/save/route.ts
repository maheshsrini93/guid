import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";

const saveSchema = z.object({
  articleNumber: z.string().min(1),
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

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "articleNumber is required" },
      { status: 400 }
    );
  }

  const product = await prisma.product.findUnique({
    where: { article_number: parsed.data.articleNumber },
    select: { id: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  // Toggle: if already saved, unsave; otherwise save
  const existing = await prisma.savedProduct.findUnique({
    where: {
      userId_productId: {
        userId: user.userId,
        productId: product.id,
      },
    },
  });

  if (existing) {
    await prisma.savedProduct.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.savedProduct.create({
    data: {
      userId: user.userId,
      productId: product.id,
    },
  });

  return NextResponse.json({ saved: true }, { status: 201 });
}
