import { NextResponse } from "next/server";
import { z } from "zod";
import { trackAffiliateClick } from "@/lib/affiliate";
import { auth } from "@/lib/auth";

const clickSchema = z.object({
  retailerSlug: z.string().min(1),
  productId: z.number().int().positive(),
  sessionId: z.string().optional(),
});

/**
 * POST /api/affiliate/click
 *
 * Fire-and-forget click tracking for affiliate links.
 * No auth required — tracks anonymous and signed-in users.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = clickSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const session = await auth();
    const userId = session?.user?.id as string | undefined;

    // Fire-and-forget — respond immediately
    trackAffiliateClick({
      retailerSlug: parsed.data.retailerSlug,
      productId: parsed.data.productId,
      userId,
      sessionId: parsed.data.sessionId,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
