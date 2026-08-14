// The one formula behind "how far a stock is from its intrinsic value" —
// pure math, no Node dependencies, safe to import from server code
// (score.ts, valuation.ts) and client components (via src/lib/ui.ts) alike.
// Previously this expression was written independently in three places;
// three copies of the core number of the product is how a dashboard ends
// up disagreeing with itself.
export function computeValuationGapPct(
  currentPrice: number | null,
  fairValueEstimate: number | null
): number | null {
  if (currentPrice === null || fairValueEstimate === null || currentPrice <= 0) return null;
  return (fairValueEstimate - currentPrice) / currentPrice;
}

// Gaps beyond +/-50% saturate rather than scaling further — a 200% gap
// isn't 4x more meaningful than a 50% one.
const GAP_SATURATION = 0.5;

// Pure cheapness, 0-100, deliberately separate from the composite
// recommendationScore (score.ts) — this is "how far below/above fair
// value", nothing about business quality or risk. 100 = deeply
// undervalued, 0 = deeply overvalued, 50 = fairly valued.
export function computeValuationScore(gapPct: number | null): number | null {
  if (gapPct === null) return null;
  const clampedGap = Math.max(-GAP_SATURATION, Math.min(GAP_SATURATION, gapPct));
  return Math.round(50 + (clampedGap / GAP_SATURATION) * 50);
}
