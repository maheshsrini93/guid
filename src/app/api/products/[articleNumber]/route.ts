import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ articleNumber: string }> }
) {
  const { articleNumber } = await params;

  const product = await prisma.product.findUnique({
    where: { article_number: articleNumber },
    include: {
      images: {
        select: { id: true, url: true, alt_text: true },
        orderBy: { id: "asc" },
      },
      assemblyGuide: {
        select: {
          id: true,
          title: true,
          difficulty: true,
          timeMinutes: true,
          tools: true,
          published: true,
          steps: {
            select: {
              id: true,
              stepNumber: true,
              title: true,
              instruction: true,
              imageUrl: true,
              tip: true,
            },
            orderBy: { stepNumber: "asc" },
          },
        },
      },
      retailer: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: product.id,
    articleNumber: product.article_number,
    name: product.product_name,
    type: product.product_type,
    description: product.description,
    priceCurrency: product.price_currency,
    priceCurrent: product.price_current,
    priceOriginal: product.price_original,
    color: product.color,
    assemblyRequired: product.assembly_required,
    avgRating: product.avg_rating,
    reviewCount: product.review_count,
    categoryPath: product.category_path,
    materials: product.materials,
    dimensions: {
      width: product.product_width,
      height: product.product_height,
      depth: product.product_depth,
      length: product.product_length,
      weight: product.product_weight,
    },
    images: product.images,
    guide: product.assemblyGuide?.published ? product.assemblyGuide : null,
    retailer: product.retailer,
    sourceUrl: product.source_url,
  });
}
