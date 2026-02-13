import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/queue/product-search?q=<query>
 *
 * Search for products by name or article number for the single-enqueue UI.
 * Returns up to 10 matching products with their guide status and assembly doc availability.
 * Admin-only.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const role = (session.user as unknown as { role: string }).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ products: [] });
  }

  // Detect if query looks like an article number (mostly digits)
  const isArticleNumber = /^\d{3,}/.test(query);

  const products = await prisma.product.findMany({
    where: isArticleNumber
      ? { article_number: { startsWith: query } }
      : {
          OR: [
            { product_name: { contains: query, mode: "insensitive" } },
            { article_number: { startsWith: query } },
          ],
        },
    select: {
      id: true,
      product_name: true,
      article_number: true,
      guide_status: true,
      documents: {
        where: { document_type: "assembly" },
        select: { id: true },
        take: 1,
      },
    },
    take: 10,
    orderBy: { product_name: "asc" },
  });

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      product_name: p.product_name,
      article_number: p.article_number,
      guide_status: p.guide_status,
      hasAssemblyDoc: p.documents.length > 0,
    })),
  });
}
