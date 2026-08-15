// Fields that describe what we actually fetched, not what the model
// synthesized — computed here rather than asked of the LLM, since we know
// them for certain and don't need a guess.
import type { FundamentalsBundle } from "./fundamentalsData";
import type { MarketDataBundle } from "./marketData";

export type DataQuality = "thin" | "adequate" | "rich";

export type ScorecardExtras = {
  currentPrice: number | null;
  sector: string | null;
  industry: string | null;
  dataQuality: DataQuality;
};

export function buildScorecardExtras(
  fundamentals: FundamentalsBundle,
  market: MarketDataBundle
): ScorecardExtras {
  const dataQuality = computeDataQuality(fundamentals, market);

  return {
    currentPrice: market.found ? market.price : null,
    sector: fundamentals.found ? fundamentals.sector : null,
    industry: fundamentals.found ? fundamentals.industry : null,
    dataQuality,
  };
}

function computeDataQuality(
  fundamentals: FundamentalsBundle,
  market: MarketDataBundle
): DataQuality {
  if (!fundamentals.found || !market.found) return "thin";

  // Count the specific fields valuation.ts/quality.ts/risk.ts actually
  // consume, not income-statement *periods* — a period whose revenue,
  // margins, and income are all null still counted as a period under the
  // old logic, and annual+quarterly periods were summed even though they
  // cover overlapping fiscal time. That let a ticker with essentially no
  // usable ratios read "rich" and carry uncapped confidence. See
  // score.ts's capConfidenceByDataQuality, the guard this field feeds.
  const scoringFields = [
    fundamentals.valuationInputs.trailingEps,
    fundamentals.valuationInputs.earningsGrowth,
    fundamentals.valuationInputs.bookValuePerShare,
    fundamentals.valuationInputs.sharesOutstanding,
    fundamentals.keyRatios.freeCashflow,
    fundamentals.keyRatios.returnOnEquity,
    fundamentals.keyRatios.grossMargins,
    fundamentals.keyRatios.operatingMargins,
    fundamentals.keyRatios.profitMargins,
    fundamentals.keyRatios.revenueGrowth,
    fundamentals.keyRatios.debtToEquity,
    fundamentals.keyRatios.currentRatio,
  ];
  const populatedCount = scoringFields.filter((v) => v !== null).length;
  const hasDecentPriceHistory = market.recentClose.length >= 30;

  if (populatedCount <= 2 || !hasDecentPriceHistory) return "thin";
  if (populatedCount >= 8 && hasDecentPriceHistory) return "rich";
  return "adequate";
}
