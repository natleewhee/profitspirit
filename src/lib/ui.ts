// Shared pill styles, score/gap formatting, and date formatting used by
// ScorecardCard and CandidateTable. Extracted per docs/dashboard-ux-review.md
// §4(b) — the score thresholds and gap formula used to exist in more than
// one place, which is a correctness risk (not just a style inconsistency)
// in a tool whose entire job is telling you whether a number is good.
import {
  ConfidenceRead,
  Recommendation,
  DataQuality,
  RiskLevel,
  ValuationVerdict,
} from "@prisma/client";
import { WATCH_THRESHOLD, RESEARCH_FURTHER_THRESHOLD } from "@/lib/research/score";
import { computeValuationGapPct } from "@/lib/research/gap";

export const CONFIDENCE_STYLES: Record<ConfidenceRead, string> = {
  LOW: "bg-gray-200 text-gray-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-green-100 text-green-800",
};

export const RECOMMENDATION_BORDER: Record<Recommendation, string> = {
  WATCH: "border-l-blue-500",
  RESEARCH_FURTHER: "border-l-purple-500",
  PASS: "border-l-gray-400",
};

export const DATA_QUALITY_STYLES: Record<DataQuality, string> = {
  THIN: "bg-red-50 text-red-700",
  ADEQUATE: "bg-slate-100 text-slate-700",
  RICH: "bg-slate-100 text-slate-700",
};

export const RISK_LEVEL_STYLES: Record<RiskLevel, string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-red-100 text-red-800",
};

export const VALUATION_VERDICT_STYLES: Record<ValuationVerdict, string> = {
  UNDERVALUED: "bg-green-100 text-green-800",
  OVERVALUED: "bg-red-100 text-red-800",
  FAIRLY_VALUED: "bg-blue-100 text-blue-800",
  INSUFFICIENT_DATA: "bg-gray-200 text-gray-800",
};

// "Bucket" mirrors deriveRecommendation()'s thresholds so a bare score (no
// recommendation attached yet, e.g. mid-render) still colors consistently.
export function scoreBucket(score: number | null): "good" | "mid" | "bad" | "none" {
  if (score === null) return "none";
  if (score >= WATCH_THRESHOLD) return "good";
  if (score >= RESEARCH_FURTHER_THRESHOLD) return "mid";
  return "bad";
}

const SCORE_BUCKET_STYLES: Record<ReturnType<typeof scoreBucket>, string> = {
  good: "bg-green-100 text-green-800",
  mid: "bg-amber-100 text-amber-800",
  bad: "bg-red-100 text-red-800",
  none: "bg-gray-200 text-gray-700",
};

export function scoreStyles(score: number | null): string {
  return SCORE_BUCKET_STYLES[scoreBucket(score)];
}

const SCORE_BAR_STYLES: Record<ReturnType<typeof scoreBucket>, string> = {
  good: "bg-green-500",
  mid: "bg-amber-500",
  bad: "bg-red-500",
  none: "bg-gray-300",
};

export function scoreBarStyle(score: number | null): string {
  return SCORE_BAR_STYLES[scoreBucket(score)];
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatPrice(value: number | null) {
  return value === null ? "insufficient data" : `$${value.toFixed(2)}`;
}

// Signed percentage: positive = upside to fair value (undervalued), so a
// bare number is never ambiguous about direction.
export function formatGap(currentPrice: number | null, fairValueEstimate: number | null): string {
  const gap = computeValuationGapPct(currentPrice, fairValueEstimate);
  if (gap === null) return "Insufficient data";
  const pct = Math.round(gap * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

// "12d ago" / "3mo ago" — coarse on purpose, this is a staleness signal,
// not a precise timestamp.
export function formatRelativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

// Staleness thresholds for the "Researched" column — a scorecard's
// currentPrice is frozen at research time, so the valuation gap becomes
// less trustworthy the older it is.
export function stalenessLevel(iso: string): "fresh" | "aging" | "stale" {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days >= 60) return "stale";
  if (days >= 30) return "aging";
  return "fresh";
}

export const STALENESS_TEXT_STYLES: Record<ReturnType<typeof stalenessLevel>, string> = {
  fresh: "text-gray-600",
  aging: "text-amber-700",
  stale: "text-red-700",
};

// Past 30 days, the valuation cell (verdict + gap) is dimmed and gets a
// tooltip clarifying the gap is against a frozen research-date price, not a
// live quote — the "honesty fix" from the UX review's staleness item.
export const VALUATION_CELL_OPACITY: Record<ReturnType<typeof stalenessLevel>, string> = {
  fresh: "opacity-100",
  aging: "opacity-60",
  stale: "opacity-60",
};

export function formatAsOfTooltip(researchedAtIso: string): string | undefined {
  if (stalenessLevel(researchedAtIso) === "fresh") return undefined;
  return `vs price on ${formatDate(researchedAtIso)}; not a live quote`;
}
