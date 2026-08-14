// Deterministic valuation — NOT LLM-generated. entryPriceEstimate and
// fairValueEstimate used to be the Synthesizer eyeballing a number from
// prose, which is why they came back null constantly. These are now
// computed directly from fetched fundamentals data using two well-known,
// disclosed formulas, averaged when both are available. The methodology is
// always stated in `targetsBasis` so the number never carries false
// authority — same "show your work" rule as the rest of this pipeline.
import type { FundamentalsBundle } from "./fundamentalsData";
import type { MarketDataBundle } from "./marketData";
import { computeValuationGapPct } from "./gap";

export type ValuationVerdict = "undervalued" | "overvalued" | "fairly_valued" | "insufficient_data";

export type ValuationResult = {
  entryPriceEstimate: number | null;
  fairValueEstimate: number | null;
  valuationVerdict: ValuationVerdict;
  targetsBasis: string;
};

// Margin of safety applied to fair value to get a suggested entry price —
// classic value-investing convention, not derived from the data itself.
const MARGIN_OF_SAFETY = 0.25;

// Required annual FCF yield used by the FCF-yield method — equivalent to
// valuing the business at ~12.5x free cash flow. A stated assumption, not a
// fact; disclosed in targetsBasis.
const REQUIRED_FCF_YIELD = 0.08;

// Verdict band: within +/-10% of fair value counts as "fairly valued"
// rather than forcing every case into a binary under/over call.
const FAIRLY_VALUED_BAND = 0.1;

function grahamNumber(trailingEps: number | null, bookValuePerShare: number | null): number | null {
  if (trailingEps === null || bookValuePerShare === null) return null;
  if (trailingEps <= 0 || bookValuePerShare <= 0) return null;
  return Math.sqrt(22.5 * trailingEps * bookValuePerShare);
}

function fcfYieldValue(freeCashflow: number | null, sharesOutstanding: number | null): number | null {
  if (freeCashflow === null || sharesOutstanding === null || sharesOutstanding <= 0) return null;
  if (freeCashflow <= 0) return null;
  const fcfPerShare = freeCashflow / sharesOutstanding;
  return fcfPerShare / REQUIRED_FCF_YIELD;
}

export function computeValuation(
  fundamentals: FundamentalsBundle,
  market: MarketDataBundle
): ValuationResult {
  if (!fundamentals.found) {
    return {
      entryPriceEstimate: null,
      fairValueEstimate: null,
      valuationVerdict: "insufficient_data",
      targetsBasis: "No fundamentals data available to value this stock.",
    };
  }

  const { trailingEps, bookValuePerShare, sharesOutstanding } = fundamentals.valuationInputs;
  const graham = grahamNumber(trailingEps, bookValuePerShare);
  const fcfValue = fcfYieldValue(fundamentals.keyRatios.freeCashflow, sharesOutstanding);

  const methodsUsed: string[] = [];
  const estimates: number[] = [];
  if (graham !== null) {
    methodsUsed.push(`Graham Number (√(22.5 × trailing EPS × book value/share) = $${graham.toFixed(2)})`);
    estimates.push(graham);
  }
  if (fcfValue !== null) {
    methodsUsed.push(
      `FCF yield (free cash flow/share ÷ ${(REQUIRED_FCF_YIELD * 100).toFixed(0)}% required yield = $${fcfValue.toFixed(2)})`
    );
    estimates.push(fcfValue);
  }

  if (estimates.length === 0) {
    return {
      entryPriceEstimate: null,
      fairValueEstimate: null,
      valuationVerdict: "insufficient_data",
      targetsBasis:
        "Neither valuation method could compute: needs positive trailing EPS + book value/share " +
        "(Graham Number) or positive free cash flow + shares outstanding (FCF yield) — this ticker " +
        "didn't have enough of that data.",
    };
  }

  const fairValueEstimate = estimates.reduce((a, b) => a + b, 0) / estimates.length;
  const entryPriceEstimate = fairValueEstimate * (1 - MARGIN_OF_SAFETY);

  const basisPrefix =
    estimates.length === 2
      ? `Average of two methods — ${methodsUsed.join(" and ")}.`
      : `${methodsUsed[0]}.`;
  const targetsBasis = `${basisPrefix} Entry price applies a ${(MARGIN_OF_SAFETY * 100).toFixed(0)}% margin of safety below fair value.`;

  const valuationVerdict = computeVerdict(market.found ? market.price : null, fairValueEstimate);

  return { entryPriceEstimate, fairValueEstimate, valuationVerdict, targetsBasis };
}

function computeVerdict(currentPrice: number | null, fairValue: number | null): ValuationVerdict {
  const gap = computeValuationGapPct(currentPrice, fairValue);
  if (gap === null) return "insufficient_data";
  if (gap > FAIRLY_VALUED_BAND) return "undervalued";
  if (gap < -FAIRLY_VALUED_BAND) return "overvalued";
  return "fairly_valued";
}
