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

  const incomeStatementPeriods =
    fundamentals.annualIncomeStatements.length + fundamentals.quarterlyIncomeStatements.length;
  const hasDecentPriceHistory = market.recentClose.length >= 30;

  if (incomeStatementPeriods === 0 || !hasDecentPriceHistory) return "thin";
  if (incomeStatementPeriods >= 4 && hasDecentPriceHistory) return "rich";
  return "adequate";
}
