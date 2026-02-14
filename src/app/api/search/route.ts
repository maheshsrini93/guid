import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { detectRetailerUrl } from "@/lib/url-detection";

const PRODUCT_SELECT = {
  id: true,
  article_number: true,
  product_name: true,
  product_type: true,
  price_current: true,
  source_retailer: true,
  images: { take: 1, orderBy: { sort_order: "asc" as const }, select: { url: true } },
};

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

/**
 * GET /api/search?q=<query>
 * Returns top 5 matching products for autocomplete.
 * Supports article number detection, multi-retailer URL detection,
 * and general text search.
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
    const exactMatch = await prisma.product.findFirst({
      where: { article_number: q },
      select: PRODUCT_SELECT,
    });

    if (exactMatch) {
      return NextResponse.json(
        {
          results: [formatProduct(exactMatch)],
          detectedType: "article_number",
        },
        { headers: CACHE_HEADERS }
      );
    }
  }

  // Multi-retailer URL detection
  const detected = detectRetailerUrl(q);
  if (detected) {
    // Look up by article_number (each retailer's product ID is stored there)
    const product = await prisma.product.findFirst({
      where: {
        article_number: detected.productId,
        source_retailer: detected.retailer,
      },
      select: PRODUCT_SELECT,
    });

    if (product) {
      return NextResponse.json(
        {
          results: [formatProduct(product)],
          detectedType: "url",
          extractedArticleNumber: detected.productId,
          detectedRetailer: detected.retailer,
        },
        { headers: CACHE_HEADERS }
      );
    }

    // Product not in DB — return empty results with detection info
    // so the client can offer to queue a scrape
    return NextResponse.json(
      {
        results: [],
        detectedType: "url",
        extractedArticleNumber: detected.productId,
        detectedRetailer: detected.retailer,
        notFound: true,
      },
      { headers: CACHE_HEADERS }
    );
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
    select: PRODUCT_SELECT,
    orderBy: { avg_rating: "desc" },
    take: 5,
  });

  return NextResponse.json(
    {
      results: products.map(formatProduct),
      detectedType: "text",
    },
    { headers: CACHE_HEADERS }
  );
}

function formatProduct(p: {
  article_number: string;
  product_name: string | null;
  product_type: string | null;
  price_current: number | null;
  images: { url: string }[];
}) {
  return {
    articleNumber: p.article_number,
    name: p.product_name,
    type: p.product_type,
    price: p.price_current,
    imageUrl: p.images[0]?.url ?? null,
  };
}
