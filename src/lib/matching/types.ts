// ─── Phase 5: Cross-Retailer Product Matching Types ───

/** Which field was used for the match. */
export type ExactMatchField = "manufacturerSku" | "upcEan" | "articleNumber";

/** A product candidate that participated in a match. */
export interface MatchCandidate {
  productId: number;
  articleNumber: string;
  productName: string | null;
  retailerSlug: string;
  retailerId: string | null;
}

/** Result of matching two products. */
export interface MatchResult {
  matchGroupId: string;
  matchType: "exact" | "fuzzy";
  confidence: number;
  matchField: string;
  products: MatchCandidate[];
}

/** A potential fuzzy match awaiting admin review. */
export interface FuzzyMatchCandidate {
  productA: MatchCandidate;
  productB: MatchCandidate;
  nameScore: number;
  dimensionScore: number;
  overallScore: number;
}

/** Summary of a matching run. */
export interface MatchRunSummary {
  exactMatches: number;
  fuzzyAutoMatches: number;
  fuzzyReviewMatches: number;
  totalProductsProcessed: number;
  durationMs: number;
}
