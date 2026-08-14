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

// --- Graham's REVISED formula: V = EPS x (8.5 + 2g) x 4.4/Y ---
// The plain Graham Number (√(22.5 x EPS x book value/share)) assumes zero
// growth and a "normal" balance sheet. Both assumptions break for
// asset-light, high-growth compounders: a company that buybacks its way to
// a thin book value per share (payment networks, many software/semis
// names) gets a near-zero Graham Number almost by construction, regardless
// of how good the business actually is — this showed up in production as
// Visa/Mastercard/Nvidia all reading as ~70-90% "overvalued" simultaneously,
// which is the model being wrong, not the market. The revised formula adds
// a growth term and a rate adjustment, which at least lets a growing,
// capital-light business clear a bar above zero.
const GRAHAM_BASE_MULTIPLE = 8.5; // Graham's base P/E for a zero-growth company
const GRAHAM_GROWTH_WEIGHT = 2; // Graham's rule-of-thumb weight on the growth rate
const GRAHAM_BASE_YIELD = 4.4; // AA corporate bond yield the formula was calibrated against (%)
// Current AA corporate bond yield used for the 4.4/Y rate adjustment — a
// stated assumption (disclosed in targetsBasis), not a live feed. Revisit
// periodically as rates move; a stale value only shifts the multiple
// modestly, it doesn't invalidate the formula.
const CURRENT_AA_BOND_YIELD = 5.5;
// Cap the growth input — Graham's own formula gets overoptimistic well
// past this, extrapolating a high current growth rate as if it persists
// indefinitely. Treat missing/negative growth as flat (0%) rather than
// penalizing it twice (the EPS term already reflects a shrinking business).
const GRAHAM_GROWTH_CAP_PCT = 15;

// Below this book-value-per-share to trailing-EPS ratio, a business is
// asset-light enough (heavy buybacks, low tangible capital requirements)
// that even the revised Graham formula's book-value-free growth term is on
// firmer ground than trusting book value at all — so the growth+FCF-yield
// blend is used without a book-value-based cross-check dragging it down.
// This is a heuristic threshold, not a bright line.
const ASSET_LIGHT_BVPS_TO_EPS_THRESHOLD = 1.5;

function grahamRevised(
  trailingEps: number | null,
  earningsGrowth: number | null
): { value: number; growthPct: number } | null {
  if (trailingEps === null || trailingEps <= 0) return null;
  const growthPct = Math.max(
    0,
    Math.min(GRAHAM_GROWTH_CAP_PCT, (earningsGrowth ?? 0) * 100)
  );
  const value =
    trailingEps *
    (GRAHAM_BASE_MULTIPLE + GRAHAM_GROWTH_WEIGHT * growthPct) *
    (GRAHAM_BASE_YIELD / CURRENT_AA_BOND_YIELD);
  return { value, growthPct };
}

function isAssetLight(trailingEps: number | null, bookValuePerShare: number | null): boolean {
  if (trailingEps === null || trailingEps <= 0) return false;
  if (bookValuePerShare === null || bookValuePerShare <= 0) return true;
  return bookValuePerShare / trailingEps < ASSET_LIGHT_BVPS_TO_EPS_THRESHOLD;
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

  const { trailingEps, bookValuePerShare, sharesOutstanding, earningsGrowth } =
    fundamentals.valuationInputs;
  const graham = grahamRevised(trailingEps, earningsGrowth);
  const fcfValue = fcfYieldValue(fundamentals.keyRatios.freeCashflow, sharesOutstanding);
  const assetLight = isAssetLight(trailingEps, bookValuePerShare);

  const methodsUsed: string[] = [];
  const estimates: number[] = [];
  if (graham !== null) {
    methodsUsed.push(
      `Graham's revised formula (EPS × (8.5 + 2 × ${graham.growthPct.toFixed(0)}% growth) × ` +
        `${GRAHAM_BASE_YIELD}/${CURRENT_AA_BOND_YIELD}% = $${graham.value.toFixed(2)})`
    );
    estimates.push(graham.value);
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
        "Neither valuation method could compute: needs positive trailing EPS (Graham's revised " +
        "formula) or positive free cash flow + shares outstanding (FCF yield) — this ticker " +
        "didn't have enough of that data.",
    };
  }

  const fairValueEstimate = estimates.reduce((a, b) => a + b, 0) / estimates.length;
  const entryPriceEstimate = fairValueEstimate * (1 - MARGIN_OF_SAFETY);

  const basisPrefix =
    estimates.length === 2
      ? `Average of two methods — ${methodsUsed.join(" and ")}.`
      : `${methodsUsed[0]}.`;
  const assetLightNote = assetLight
    ? " Book value/share is thin relative to earnings (asset-light balance sheet, e.g. buyback-" +
      "heavy businesses) — the classic Graham Number would understate this stock, so it's excluded " +
      "in favor of the growth-adjusted formula above."
    : "";
  const targetsBasis = `${basisPrefix} Entry price applies a ${(MARGIN_OF_SAFETY * 100).toFixed(0)}% margin of safety below fair value.${assetLightNote}`;

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
