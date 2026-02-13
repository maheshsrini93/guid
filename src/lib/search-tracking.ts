"use client";

import { track } from "@vercel/analytics";

/**
 * Search pattern tracking via Vercel Analytics custom events.
 *
 * Events tracked:
 * - search_query: User submits a search (via Enter or filter navigation)
 * - search_autocomplete: User selects an autocomplete suggestion
 * - search_zero_results: Search returned no results (content gap signal)
 * - search_discovery: Tracks which discovery method was used (text/article_number/url/recent)
 */

/** Track a search query submission */
export function trackSearchQuery(
  query: string,
  resultCount: number,
  detectedType: string | null
) {
  track("search_query", {
    query: query.slice(0, 100), // Truncate very long queries
    resultCount,
    detectedType: detectedType ?? "text",
  });

  if (resultCount === 0) {
    track("search_zero_results", {
      query: query.slice(0, 100),
      detectedType: detectedType ?? "text",
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
}

/** Track the discovery method used (which type of search input triggered results) */
export function trackSearchDiscovery(
  method: "text" | "article_number" | "url" | "recent"
) {
  track("search_discovery", { method });
}
