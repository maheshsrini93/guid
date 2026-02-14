import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMobileToken } from "@/lib/mobile-auth";

export async function GET(request: Request) {
  const user = await verifyMobileToken(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saved = await prisma.savedProduct.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true,
          article_number: true,
          product_name: true,
          product_type: true,
          price_currency: true,
          price_current: true,
          avg_rating: true,
          assembly_required: true,
          guide_status: true,
        },
      },
    },
  });

  // Fetch first image for each product
  const productIds = saved.map((s) => s.productId);
  const images = await prisma.productImage.findMany({
    where: { product_id: { in: productIds } },
    select: { product_id: true, url: true },
    distinct: ["product_id"],
    orderBy: { id: "asc" },
  });
  const imageMap = new Map(images.map((img) => [img.product_id, img.url]));

  return NextResponse.json(
    saved.map((s) => ({
      id: s.id,
      savedAt: s.createdAt,
      product: {
        id: s.product.id,
        articleNumber: s.product.article_number,
        name: s.product.product_name,
        type: s.product.product_type,
        priceCurrency: s.product.price_currency,
        priceCurrent: s.product.price_current,
        avgRating: s.product.avg_rating,
        assemblyRequired: s.product.assembly_required,
        guideStatus: s.product.guide_status,
        imageUrl: imageMap.get(s.product.id) ?? null,
      },
    }))
  );
}
