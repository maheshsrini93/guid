import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runCatalogSync } from "@/lib/catalog-sync";

/**
 * GET /api/cron/catalog-sync — Monthly catalog sync.
 *
 * Vercel Cron runs this on the 1st of each month at 3 AM UTC.
 * Also callable manually from the Studio dashboard.
 *
 * Dual auth: admin session OR CRON_SECRET Bearer token.
 */
export async function GET(request: Request) {
  // Dual auth: admin session OR CRON_SECRET
  const session = await auth();
  const isAdmin =
    (session?.user as unknown as { role: string })?.role === "admin";

  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const hasCronSecret =
    cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isAdmin && !hasCronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const triggeredBy = isAdmin ? "manual" : "cron";

  try {
    const result = await runCatalogSync(triggeredBy as "cron" | "manual");

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during catalog sync";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
