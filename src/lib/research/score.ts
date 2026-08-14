// Deterministic recommendation scoring — NOT LLM-generated. A weighted
// composite of three independent axes (valuationScore from gap.ts,
// qualityScore from quality.ts, riskScore from risk.ts), damped by
// confidence, then derives the categorical recommendation from that score
// rather than letting the LLM pick a label independently — the label can
// never contradict the number this way.
//
// Kept deliberately separate from valuationScore: a stock can be cheap
// (high valuationScore) and still score low overall if it's a bad business
// or carries real risk — that gap between the two numbers is the value-trap
// signal, and collapsing them into one number would erase it.
export type ConfidenceRead = "low" | "medium" | "high";
export type RecommendationBucket = "watch" | "research_further" | "pass";

const CONFIDENCE_MULTIPLIER: Record<ConfidenceRead, number> = { high: 1, medium: 0.75, low: 0.5 };

const WEIGHT_VALUATION = 0.5;
const WEIGHT_QUALITY = 0.3;
const WEIGHT_RISK = 0.2;

// The two thresholds that turn a score into a recommendation bucket.
// Exported so the UI (filter presets, score-pill coloring) reuses these
// instead of retyping 65/35 elsewhere.
export const WATCH_THRESHOLD = 65;
export const RESEARCH_FURTHER_THRESHOLD = 35;

export function computeRecommendationScore(
  valuationScore: number | null,
  qualityScore: number | null,
  riskScore: number | null, // 1 (low risk) - 5 (high risk)
  confidenceRead: ConfidenceRead
): number | null {
  // Valuation is the primary axis — without it there's no basis for a
  // recommendation, same as the old gap-only version.
  if (valuationScore === null) return null;

  // Risk score inverted to a 0-100 "safety" component so all three axes
  // point the same direction (higher = better) before weighting.
  const riskComponent = riskScore === null ? null : ((5 - riskScore) / 4) * 100;

  const weighted: [number, number][] = [[valuationScore, WEIGHT_VALUATION]];
  if (qualityScore !== null) weighted.push([qualityScore, WEIGHT_QUALITY]);
  if (riskComponent !== null) weighted.push([riskComponent, WEIGHT_RISK]);

  const totalWeight = weighted.reduce((sum, [, w]) => sum + w, 0);
  const baseScore = weighted.reduce((sum, [s, w]) => sum + s * w, 0) / totalWeight;

  const adjusted = 50 + (baseScore - 50) * CONFIDENCE_MULTIPLIER[confidenceRead];

  return Math.round(Math.max(0, Math.min(100, adjusted)));
}

export function deriveRecommendation(score: number | null): RecommendationBucket {
  if (score === null) return "research_further";
  if (score >= WATCH_THRESHOLD) return "watch";
  if (score >= RESEARCH_FURTHER_THRESHOLD) return "research_further";
  return "pass";
}

// dataQuality is known for certain (computed from what was actually
// fetched); confidenceRead is the LLM's judgment. Thin data should never
// be allowed to produce a "high confidence" scorecard, so this caps it
// after the fact rather than trusting the model to self-limit.
export function capConfidenceByDataQuality(
  confidenceRead: ConfidenceRead,
  dataQuality: "thin" | "adequate" | "rich"
): ConfidenceRead {
  if (dataQuality === "thin" && confidenceRead === "high") return "medium";
  return confidenceRead;
}
