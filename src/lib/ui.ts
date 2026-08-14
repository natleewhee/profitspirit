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
import { deriveRiskLevel } from "@/lib/research/risk";

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

// --- Quality (0-100, business quality — see quality.ts) ---
function scoreBandBucket(score: number | null): "good" | "mid" | "bad" | "none" {
  if (score === null) return "none";
  if (score >= 65) return "good";
  if (score >= 35) return "mid";
  return "bad";
}

export function qualityStyles(score: number | null): string {
  return SCORE_BUCKET_STYLES[scoreBandBucket(score)];
}

export function qualityBarStyle(score: number | null): string {
  return SCORE_BAR_STYLES[scoreBandBucket(score)];
}

// --- Risk (1-5, deterministic — see risk.ts) ---
export const RISK_SCORE_DOT_STYLES: Record<ReturnType<typeof deriveRiskLevel>, string> = {
  low: "bg-green-500",
  medium: "bg-amber-500",
  high: "bg-red-500",
};

export function formatRiskScore(riskScore: number | null): string {
  return riskScore === null ? "—" : `${riskScore}/5`;
}

// --- Entry zone (band around fair value — see valuation.ts) ---
export function formatEntryZone(low: number | null, high: number | null): string {
  if (low === null || high === null) return "Insufficient data";
  return `${formatPrice(low)} – ${formatPrice(high)}`;
}

// Distance to the entry zone is the actual decision this app exists to
// support: buy now, or wait. "-18% to enter" beats a bare price because it
// answers "how far" in the units you actually think in.
export function formatEntryDistance(
  currentPrice: number | null,
  entryZoneLow: number | null,
  entryZoneHigh: number | null
): string {
  if (currentPrice === null || entryZoneLow === null || entryZoneHigh === null) {
    return "Insufficient data";
  }
  if (currentPrice < entryZoneLow) return "Below zone (deeper value)";
  if (currentPrice <= entryZoneHigh) return "✓ In entry zone";
  const pct = Math.round(((entryZoneHigh - currentPrice) / currentPrice) * 100);
  return `${pct}% to enter`;
}

// --- 52-week range position + trend ---
export function format52WeekPosition(
  currentPrice: number | null,
  low: number | null,
  high: number | null
): string | null {
  if (currentPrice === null || low === null || high === null || high <= low) return null;
  const pct = Math.round(((currentPrice - low) / (high - low)) * 100);
  return `${pct}% of 52w range`;
}

export function formatTrend(
  currentPrice: number | null,
  fiftyDayAverage: number | null,
  twoHundredDayAverage: number | null
): string | null {
  if (currentPrice === null || fiftyDayAverage === null || twoHundredDayAverage === null) return null;
  const aboveBoth = currentPrice > fiftyDayAverage && currentPrice > twoHundredDayAverage;
  const belowBoth = currentPrice < fiftyDayAverage && currentPrice < twoHundredDayAverage;
  if (aboveBoth) return "Uptrend";
  if (belowBoth) return "Downtrend";
  return "Mixed";
}

// --- Market cap ---
export function formatMarketCap(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toFixed(0)}`;
}

// --- Council of 5 consensus (see council.ts) ---
export function formatCouncilConsensus(consensus: number | null): string {
  return consensus === null ? "—" : `${consensus}/5`;
}

export function councilConsensusStyles(consensus: number | null): string {
  if (consensus === null) return "bg-gray-200 text-gray-700";
  if (consensus >= 3) return "bg-green-100 text-green-800";
  if (consensus === 2) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

// --- Next earnings date ---
export function formatEarningsProximity(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days < -2) return null; // stale/past estimate, not worth surfacing
  if (days <= 0) return "Earnings today";
  if (days <= 14) return `Earnings in ${days}d`;
  return null; // only surface when it's actually close
}
