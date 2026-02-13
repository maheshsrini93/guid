import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

/**
 * GET /api/search?q=<query>
 * Returns top 5 matching products for autocomplete.
 * Supports article number detection (numbers-only -> exact match first).
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const rl = rateLimit(`search:${ip}`, RATE_LIMITS.api);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Article number detection: numbers and dots only (e.g., "702.758.14")
  const isArticleNumber = /^[\d.]+$/.test(q);

  if (isArticleNumber) {
    // Exact article number match first
    const exactMatch = await prisma.product.findFirst({
      where: { article_number: q },
      select: {
        id: true,
        article_number: true,
        product_name: true,
        product_type: true,
        price_current: true,
        images: { take: 1, orderBy: { sort_order: "asc" }, select: { url: true } },
      },
    });

    if (exactMatch) {
      return NextResponse.json(
        {
          results: [
            {
              articleNumber: exactMatch.article_number,
              name: exactMatch.product_name,
              type: exactMatch.product_type,
              price: exactMatch.price_current,
              imageUrl: exactMatch.images[0]?.url ?? null,
            },
          ],
          detectedType: "article_number",
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        }
      );
    }
  }

  // URL paste detection: extract article number from IKEA URL
  if (q.includes("ikea.com") || q.startsWith("http")) {
    // IKEA URLs contain article numbers in format: /12345678/ or S12345678 or with dots
    const urlMatch = q.match(/(\d{3}\.\d{3}\.\d{2})|\/(\d{8})\/?|S(\d{8})/);
    if (urlMatch) {
      const extracted = urlMatch[1] || urlMatch[2] || urlMatch[3];
      // Format as xxx.xxx.xx if it's 8 digits
      const formatted =
        extracted && extracted.length === 8
          ? `${extracted.slice(0, 3)}.${extracted.slice(3, 6)}.${extracted.slice(6)}`
          : extracted;

      if (formatted) {
        const product = await prisma.product.findFirst({
          where: { article_number: formatted },
          select: {
            id: true,
            article_number: true,
            product_name: true,
            product_type: true,
            price_current: true,
            images: { take: 1, orderBy: { sort_order: "asc" }, select: { url: true } },
          },
        });

        if (product) {
          return NextResponse.json(
            {
              results: [
                {
                  articleNumber: product.article_number,
                  name: product.product_name,
                  type: product.product_type,
                  price: product.price_current,
                  imageUrl: product.images[0]?.url ?? null,
                },
              ],
              detectedType: "url",
              extractedArticleNumber: formatted,
            },
            {
              headers: {
                "Cache-Control":
                  "public, s-maxage=60, stale-while-revalidate=300",
              },
            }
          );
        }
      }
    }
  }

  // General text search: top 5 matches
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { product_name: { contains: q, mode: "insensitive" } },
        { article_number: { contains: q, mode: "insensitive" } },
        { product_type: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      article_number: true,
      product_name: true,
      product_type: true,
      price_current: true,
      images: { take: 1, orderBy: { sort_order: "asc" }, select: { url: true } },
    },
    orderBy: { avg_rating: "desc" },
    take: 5,
  });

  return NextResponse.json(
    {
      results: products.map((p) => ({
        articleNumber: p.article_number,
        name: p.product_name,
        type: p.product_type,
        price: p.price_current,
        imageUrl: p.images[0]?.url ?? null,
      })),
      detectedType: "text",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
