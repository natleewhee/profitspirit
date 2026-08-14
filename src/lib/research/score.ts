// Deterministic recommendation scoring — NOT LLM-generated. Combines the
// valuation gap (gap.ts), risk level, and confidence (both from the
// Synthesizer, confidence capped by dataQuality) into a single 0-100 score,
// and derives the categorical recommendation from that score rather than
// letting the LLM pick a label independently — the label can never
// contradict the number this way.
import { computeValuationGapPct } from "./gap";

export type RiskLevel = "low" | "medium" | "high";
export type ConfidenceRead = "low" | "medium" | "high";
export type RecommendationBucket = "watch" | "research_further" | "pass";

const RISK_MULTIPLIER: Record<RiskLevel, number> = { low: 1, medium: 0.75, high: 0.5 };
const CONFIDENCE_MULTIPLIER: Record<ConfidenceRead, number> = { high: 1, medium: 0.75, low: 0.5 };

// Valuation gaps beyond +/-50% saturate the score at 0/100 rather than
// scaling further — a 200% gap isn't 4x more meaningful than a 50% one.
const GAP_SATURATION = 0.5;

// The two thresholds that turn a score into a recommendation bucket.
// Exported so the UI (filter presets, score-pill coloring) reuses these
// instead of retyping 65/35 elsewhere.
export const WATCH_THRESHOLD = 65;
export const RESEARCH_FURTHER_THRESHOLD = 35;

export function computeRecommendationScore(
  currentPrice: number | null,
  fairValueEstimate: number | null,
  riskLevel: RiskLevel,
  confidenceRead: ConfidenceRead
): number | null {
  const gapPct = computeValuationGapPct(currentPrice, fairValueEstimate);
  if (gapPct === null) return null;

  const clampedGap = Math.max(-GAP_SATURATION, Math.min(GAP_SATURATION, gapPct));
  const baseScore = 50 + (clampedGap / GAP_SATURATION) * 50;

  const damping = RISK_MULTIPLIER[riskLevel] * CONFIDENCE_MULTIPLIER[confidenceRead];
  const adjusted = 50 + (baseScore - 50) * damping;

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
