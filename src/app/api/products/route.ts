import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") ?? "newest";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const search = url.searchParams.get("q");
  const category = url.searchParams.get("category");
  const retailer = url.searchParams.get("retailer");

  const where: Prisma.ProductWhereInput = {};

  if (search) {
    where.OR = [
      { product_name: { contains: search, mode: "insensitive" } },
      { article_number: { contains: search, mode: "insensitive" } },
      { product_type: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category_path = { contains: category, mode: "insensitive" };
  }

  if (retailer) {
    where.retailer = { slug: retailer };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "rating-desc"
      ? { avg_rating: { sort: "desc", nulls: "last" } }
      : sort === "price-asc"
        ? { price_current: { sort: "asc", nulls: "last" } }
        : sort === "price-desc"
          ? { price_current: { sort: "desc", nulls: "last" } }
          : sort === "name-asc"
            ? { product_name: { sort: "asc", nulls: "last" } }
            : { scraped_at: "desc" }; // "newest" default

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
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
        images: {
          select: { url: true },
          take: 1,
          orderBy: { id: "asc" },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      articleNumber: p.article_number,
      name: p.product_name,
      type: p.product_type,
      priceCurrency: p.price_currency,
      priceCurrent: p.price_current,
      avgRating: p.avg_rating,
      assemblyRequired: p.assembly_required,
      guideStatus: p.guide_status,
      imageUrl: p.images[0]?.url ?? null,
    })),
    total,
  });
}
