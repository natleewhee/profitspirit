// Deterministic risk score, 1 (low) - 5 (high) — NOT LLM-generated. The old
// riskLevel came straight from the Synthesizer's judgment call on a 3-level
// scale, which is noisy from week to week on the same ticker. This computes
// it from three numbers that don't change opinion: leverage, liquidity, and
// realized price volatility — the same "deterministic core, LLM only for
// genuine judgment calls" split already used for valuation and recommendation.
const LOW = 1;
const BELOW_AVG = 2;
const AVG = 3;
const ABOVE_AVG = 4;
const HIGH = 5;

function leverageScore(debtToEquity: number | null): number | null {
  if (debtToEquity === null) return null;
  // Negative D/E comes from negative shareholders' equity (debt outpacing
  // assets, often from heavy buybacks or accumulated losses) — a genuine
  // leverage red flag, not "less than 50% levered". Without this guard a
  // negative value satisfies every threshold below and reads as the
  // lowest possible risk, which is backwards.
  if (debtToEquity < 0) return HIGH;
  if (debtToEquity < 50) return LOW;
  if (debtToEquity < 100) return BELOW_AVG;
  if (debtToEquity < 150) return AVG;
  if (debtToEquity < 250) return ABOVE_AVG;
  return HIGH;
}

function liquidityScore(currentRatio: number | null): number | null {
  if (currentRatio === null) return null;
  if (currentRatio >= 2) return LOW;
  if (currentRatio >= 1.5) return BELOW_AVG;
  if (currentRatio >= 1) return AVG;
  if (currentRatio >= 0.75) return ABOVE_AVG;
  return HIGH;
}

// Annualized stddev of daily log returns from trailing closes — a standard,
// simple realized-volatility measure. Needs a reasonable sample; fewer than
// 20 closes isn't enough to trust.
function computeAnnualizedVolatility(recentClose: { close: number }[]): number | null {
  if (recentClose.length < 20) return null;
  const closes = recentClose.map((c) => c.close);
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  const dailyStdDev = Math.sqrt(variance);
  return dailyStdDev * Math.sqrt(252); // trading days/year
}

function volatilityScore(annualizedVol: number | null): number | null {
  if (annualizedVol === null) return null;
  if (annualizedVol < 0.2) return LOW;
  if (annualizedVol < 0.35) return BELOW_AVG;
  if (annualizedVol < 0.5) return AVG;
  if (annualizedVol < 0.7) return ABOVE_AVG;
  return HIGH;
}

export function computeRiskScore(params: {
  debtToEquity: number | null;
  currentRatio: number | null;
  recentClose: { close: number }[];
}): number | null {
  const annualizedVol = computeAnnualizedVolatility(params.recentClose);
  const scores = [
    leverageScore(params.debtToEquity),
    liquidityScore(params.currentRatio),
    volatilityScore(annualizedVol),
  ].filter((s): s is number => s !== null);

  if (scores.length === 0) return null;

  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.min(5, Math.max(1, Math.round(average)));
}

export type RiskLevelBucket = "low" | "medium" | "high";

// 1-2 -> low, 3 -> medium, 4-5 -> high. Mirrors the pattern used elsewhere
// (recommendation from score, valuationVerdict from gap): the categorical
// label is derived from the number, never chosen independently.
export function deriveRiskLevel(riskScore: number | null): RiskLevelBucket {
  if (riskScore === null) return "medium";
  if (riskScore <= 2) return "low";
  if (riskScore <= 3) return "medium";
  return "high";
}
