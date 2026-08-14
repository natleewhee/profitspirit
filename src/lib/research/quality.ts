// Deterministic business-quality composite — NOT LLM-generated. Answers a
// question the valuation gap can't: is this actually a good business, or
// just a cheap one? Cheap + low quality is a value trap; cheap + high
// quality is the bargain you actually want. Built entirely from
// FundamentalsBundle.keyRatios, which was already being fetched and fed to
// the LLM prompt but never scored — this is new signal, not a re-render of
// something the UI already showed.
import type { FundamentalsBundle } from "./fundamentalsData";

type KeyRatios = Extract<FundamentalsBundle, { found: true }>["keyRatios"];

// Each sub-score maps a raw ratio onto 0-100 via a floor/ceiling band. The
// bands are simple, disclosed heuristics (same "show your work" spirit as
// valuation.ts's stated assumptions) — not industry-adjusted, so a capital-
// intensive business with structurally thin margins will read as lower
// quality here than a software business at the same growth rate. That's a
// known, accepted limitation, not a bug.
function bandScore(value: number | null, floor: number, ceiling: number): number | null {
  if (value === null) return null;
  if (value <= floor) return 0;
  if (value >= ceiling) return 100;
  return Math.round(((value - floor) / (ceiling - floor)) * 100);
}

export function computeQualityScore(keyRatios: KeyRatios): number | null {
  const roeScore = bandScore(keyRatios.returnOnEquity, 0, 0.25); // 0% -> 0, 25%+ -> 100
  const grossMarginScore = bandScore(keyRatios.grossMargins, 0, 0.7); // 0% -> 0, 70%+ -> 100
  const operatingMarginScore = bandScore(keyRatios.operatingMargins, 0, 0.3); // 0% -> 0, 30%+ -> 100
  const profitMarginScore = bandScore(keyRatios.profitMargins, 0, 0.25); // 0% -> 0, 25%+ -> 100
  // Revenue growth centers at 40 (flat growth is middling, not zero) rather
  // than a floor/ceiling band — shrinking revenue should score below "flat",
  // not the same as a 0% floor would imply.
  const revenueGrowthScore =
    keyRatios.revenueGrowth === null
      ? null
      : keyRatios.revenueGrowth <= -0.1
        ? 0
        : keyRatios.revenueGrowth >= 0.2
          ? 100
          : keyRatios.revenueGrowth <= 0
            ? Math.round(((keyRatios.revenueGrowth + 0.1) / 0.1) * 40)
            : Math.round(40 + (keyRatios.revenueGrowth / 0.2) * 60);

  const components = [roeScore, grossMarginScore, operatingMarginScore, profitMarginScore, revenueGrowthScore].filter(
    (s): s is number => s !== null
  );

  if (components.length === 0) return null;

  const average = components.reduce((a, b) => a + b, 0) / components.length;

  // Persistent negative free cash flow is a real red flag regardless of how
  // good the margins look — cap the composite rather than let it blend away.
  const fcfNegative = keyRatios.freeCashflow !== null && keyRatios.freeCashflow < 0;
  const capped = fcfNegative ? Math.min(average, 50) : average;

  return Math.round(Math.max(0, Math.min(100, capped)));
}
