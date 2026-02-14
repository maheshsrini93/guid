export type {
  MatchCandidate,
  MatchResult,
  FuzzyMatchCandidate,
  MatchRunSummary,
  ExactMatchField,
} from "./types";

export { runExactMatching, matchProductExact } from "./exact-matcher";
export {
  runFuzzyMatching,
  matchProductFuzzy,
  computeNameSimilarity,
  computeDimensionSimilarity,
} from "./fuzzy-matcher";
