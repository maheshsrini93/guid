import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/queue/eligible?limit=50
 * Returns product IDs eligible for batch enqueue:
 * - Has assembly PDF
 * - guide_status is "none"
 * - No active (queued/processing) generation job
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

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50", 10)), 500);

  // Products with assembly docs, guide_status "none", no active jobs
  const products = await prisma.product.findMany({
    where: {
      guide_status: "none",
      documents: {
        some: { document_type: "assembly" },
      },
      aiGenerationJobs: {
        none: { status: { in: ["queued", "processing"] } },
      },
    },
    select: { id: true },
    take: limit,
    orderBy: { id: "asc" },
  });

  return NextResponse.json({
    productIds: products.map((p) => p.id),
    count: products.length,
  });
}
