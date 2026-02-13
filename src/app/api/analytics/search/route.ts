import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * POST /api/analytics/search — Record a search event.
 * No auth required (anonymous tracking). Validates shape only.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { eventType, query, method, resultCount, clickedId, sessionId } =
      body as {
        eventType?: string;
        query?: string;
        method?: string;
        resultCount?: number;
        clickedId?: number;
        sessionId?: string;
      };

    if (!eventType) {
      return NextResponse.json(
        { error: "eventType is required" },
        { status: 400 }
      );
    }

    const validTypes = [
      "search_query",
      "search_autocomplete",
      "search_zero_results",
      "search_discovery",
    ];
    if (!validTypes.includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid eventType" },
        { status: 400 }
      );
    }

    await prisma.searchEvent.create({
      data: {
        eventType,
        query: query?.slice(0, 200) ?? null,
        method: method ?? null,
        resultCount: resultCount != null ? Math.max(0, resultCount) : null,
        clickedId: clickedId ?? null,
        sessionId: sessionId?.slice(0, 100) ?? null,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to record event" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/search — Aggregated search analytics (admin only).
 * Dual auth: admin session OR CRON_SECRET Bearer token.
 */
export async function GET(request: NextRequest) {
  // Dual auth
  const session = await auth();
  const isAdmin =
    session?.user &&
    (session.user as unknown as { role: string }).role === "admin";

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const hasCronSecret =
    cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isAdmin && !hasCronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [allEvents, recentEvents] = await Promise.all([
    prisma.searchEvent.findMany({
      select: {
        eventType: true,
        query: true,
        method: true,
        resultCount: true,
        clickedId: true,
        createdAt: true,
      },
    }),
    prisma.searchEvent.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: {
        eventType: true,
        query: true,
        method: true,
        resultCount: true,
        clickedId: true,
        createdAt: true,
      },
    }),
  ]);

  // Top 20 queries
  const queryMap = new Map<
    string,
    { count: number; totalResults: number; clicks: number }
  >();
  for (const e of allEvents) {
    if (e.eventType === "search_query" && e.query) {
      const key = e.query.toLowerCase().trim();
      const entry = queryMap.get(key) || {
        count: 0,
        totalResults: 0,
        clicks: 0,
      };
      entry.count++;
      entry.totalResults += e.resultCount ?? 0;
      queryMap.set(key, entry);
    }
    if (e.eventType === "search_autocomplete" && e.query) {
      const key = e.query.toLowerCase().trim();
      const entry = queryMap.get(key);
      if (entry) entry.clicks++;
    }
  }
  // Also count click events (clickedId set on search_query events)
  for (const e of allEvents) {
    if (e.eventType === "search_query" && e.query && e.clickedId) {
      const key = e.query.toLowerCase().trim();
      const entry = queryMap.get(key);
      if (entry) entry.clicks++;
    }
  }

  const topQueries = [...queryMap.entries()]
    .map(([query, stats]) => ({
      query,
      count: stats.count,
      avgResults:
        stats.count > 0
          ? Math.round(stats.totalResults / stats.count)
          : 0,
      ctr:
        stats.count > 0
          ? Math.round((stats.clicks / stats.count) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Top 10 zero-result queries
  const zeroResultMap = new Map<string, { count: number; lastSearched: Date }>();
  for (const e of allEvents) {
    if (
      (e.eventType === "search_zero_results" ||
        (e.eventType === "search_query" && e.resultCount === 0)) &&
      e.query
    ) {
      const key = e.query.toLowerCase().trim();
      const entry = zeroResultMap.get(key) || {
        count: 0,
        lastSearched: e.createdAt,
      };
      entry.count++;
      if (e.createdAt > entry.lastSearched) {
        entry.lastSearched = e.createdAt;
      }
      zeroResultMap.set(key, entry);
    }
  }

  const zeroResultQueries = [...zeroResultMap.entries()]
    .map(([query, stats]) => ({
      query,
      count: stats.count,
      lastSearched: stats.lastSearched.toISOString(),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Overall CTR
  const totalSearches = allEvents.filter(
    (e) => e.eventType === "search_query"
  ).length;
  const totalClicks = allEvents.filter(
    (e) =>
      e.eventType === "search_autocomplete" ||
      (e.eventType === "search_query" && e.clickedId != null)
  ).length;
  const clickThroughRate =
    totalSearches > 0
      ? Math.round((totalClicks / totalSearches) * 100)
      : 0;

  // Zero-result rate
  const totalZeroResults = allEvents.filter(
    (e) =>
      e.eventType === "search_zero_results" ||
      (e.eventType === "search_query" && e.resultCount === 0)
  ).length;
  const zeroResultRate =
    totalSearches > 0
      ? Math.round((totalZeroResults / totalSearches) * 100)
      : 0;

  // Unique queries
  const uniqueQueries = new Set(
    allEvents
      .filter((e) => e.eventType === "search_query" && e.query)
      .map((e) => e.query!.toLowerCase().trim())
  ).size;

  // Daily volume (last 14 days)
  const dailyVolume: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const count = recentEvents.filter(
      (e) =>
        e.eventType === "search_query" &&
        e.createdAt >= dayStart &&
        e.createdAt <= dayEnd
    ).length;

    dailyVolume.push({ date: dayStr, count });
  }

  // Discovery method breakdown
  const methodMap = new Map<string, number>();
  for (const e of allEvents) {
    if (e.method) {
      methodMap.set(e.method, (methodMap.get(e.method) || 0) + 1);
    }
  }
  const discoveryMethods = [...methodMap.entries()]
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalSearches,
    uniqueQueries,
    clickThroughRate,
    zeroResultRate,
    topQueries,
    zeroResultQueries,
    dailyVolume,
    discoveryMethods,
  });
}
