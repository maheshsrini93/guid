"use client";

import { track } from "@vercel/analytics";

/**
 * Search pattern tracking via Vercel Analytics custom events + database persistence.
 *
 * Events tracked:
 * - search_query: User submits a search (via Enter or filter navigation)
 * - search_autocomplete: User selects an autocomplete suggestion
 * - search_zero_results: Search returned no results (content gap signal)
 * - search_discovery: Tracks which discovery method was used (text/article_number/url/recent)
 */

/** Fire-and-forget POST to /api/analytics/search */
function sendSearchEvent(event: {
  eventType: string;
  query?: string;
  method?: string;
  resultCount?: number;
  clickedId?: number;
}) {
  fetch("/api/analytics/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...event,
      sessionId: getOrCreateSessionId(),
    }),
  }).catch(() => {}); // Silently fail — never block UI
}

function getOrCreateSessionId(): string {
  const key = "guid_session_id";
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    // sessionStorage unavailable (SSR, private browsing edge cases)
    return crypto.randomUUID();
  }
}

/** Track a search query submission */
export function trackSearchQuery(
  query: string,
  resultCount: number,
  detectedType: string | null
) {
  track("search_query", {
    query: query.slice(0, 100),
    resultCount,
    detectedType: detectedType ?? "text",
  });

  sendSearchEvent({
    eventType: "search_query",
    query: query.slice(0, 200),
    method: detectedType ?? "text",
    resultCount,
  });

  if (resultCount === 0) {
    track("search_zero_results", {
      query: query.slice(0, 100),
      detectedType: detectedType ?? "text",
    });

    sendSearchEvent({
      eventType: "search_zero_results",
      query: query.slice(0, 200),
      method: detectedType ?? "text",
      resultCount: 0,
    });
  }
}

/** Track when a user selects an autocomplete suggestion */
export function trackSearchAutocomplete(
  query: string,
  selectedArticleNumber: string,
  resultPosition: number,
  detectedType: string | null
) {
  track("search_autocomplete", {
    query: query.slice(0, 100),
    selectedArticleNumber,
    resultPosition,
    detectedType: detectedType ?? "text",
  });

  sendSearchEvent({
    eventType: "search_autocomplete",
    query: query.slice(0, 200),
    method: detectedType ?? "text",
  });
}

/** Track the discovery method used (which type of search input triggered results) */
export function trackSearchDiscovery(
  method: "text" | "article_number" | "url" | "recent"
) {
  track("search_discovery", { method });

  sendSearchEvent({
    eventType: "search_discovery",
    method,
  });
}
