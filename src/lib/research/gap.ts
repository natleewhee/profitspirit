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
