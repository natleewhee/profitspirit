// "Council of 5" — five well-known fundamental-analysis lenses (Buffett,
// Munger, Graham, Lynch, Damodaran) reacting to the numbers this pipeline
// already computed. Deliberately NOT five independent re-analyses: each
// persona gets the same deterministic entry zone, score, PEG, etc. and must
// ground its verdict in them. No persona proposes its own price — that
// would reintroduce the exact hallucinated-price-target problem the
// deterministic valuation/score pipeline was built to eliminate (see
// valuation.ts, score.ts). The LLM's only job here is bounded judgment
// (enter/wait/avoid + why), same split as riskLevel/confidenceRead
// elsewhere in this pipeline.
import { z } from "zod";

export const PERSONAS = ["buffett", "munger", "graham", "lynch", "damodaran"] as const;
export type PersonaId = (typeof PERSONAS)[number];

export const PERSONA_LABELS: Record<PersonaId, string> = {
  buffett: "Warren Buffett",
  munger: "Charlie Munger",
  graham: "Benjamin Graham",
  lynch: "Peter Lynch",
  damodaran: "Aswath Damodaran",
};

// What each persona is primed to weigh — mirrors the 5-parameter breakdown
// already worked out in chat. Graham's and Lynch's checks are mechanical
// (margin of safety, PEG) and computed below in code; the persona prompt
// still surfaces them so the LLM's reasoning stays anchored to the same
// numbers rather than inventing its own read.
export const PERSONA_BRIEF: Record<PersonaId, string> = {
  buffett:
    "Moat durability, management capital-allocation discipline, earnings predictability, " +
    "circle of competence, margin of safety at today's price.",
  munger:
    "Inversion (how does this fail?), second-order effects of major capital spending, " +
    "incentive alignment, base rates for similar situations, bias-checking the consensus story.",
  graham:
    "Statistical cheapness vs. a conservative intrinsic estimate, earnings stability, balance " +
    "sheet strength, shareholder distribution discipline, whether price sits inside the margin-" +
    "of-safety zone (marginOfSafetyMet below).",
  lynch:
    "What category of stock this is (stalwart/fast grower/cyclical/etc.), the PEG ratio " +
    "(pegRatio below), how simple the business story still is, how much upside is already " +
    "discovered by the market, diworsification risk.",
  damodaran:
    "Whether the growth/reinvestment story is internally consistent, ROIC on new capital " +
    "spending vs. cost of capital, regulatory/legal tail risk, whether today's price implies " +
    "plausible assumptions.",
};

export const CouncilVerdictSchema = z.object({
  name: z.enum(PERSONAS),
  verdict: z.enum(["enter", "wait", "avoid"]),
  reasoning: z.string().describe("1-2 sentences, must cite specific numbers it was given"),
});
export type CouncilVerdict = z.infer<typeof CouncilVerdictSchema>;

export const CouncilResponseSchema = z.object({
  verdicts: z.array(CouncilVerdictSchema).length(5),
});
export type CouncilResponse = z.infer<typeof CouncilResponseSchema>;

// Lynch's PEG check — deterministic, not asked of the LLM.
export function computePegRatio(
  trailingPE: number | null,
  earningsGrowth: number | null
): number | null {
  if (trailingPE === null || trailingPE <= 0) return null;
  if (earningsGrowth === null || earningsGrowth <= 0) return null;
  return trailingPE / (earningsGrowth * 100);
}

// Graham's margin-of-safety check — deterministic, not asked of the LLM.
// Derivable entirely from fields already stored (currentPrice,
// entryZoneHigh), so it's a pure function rather than its own column.
export function isMarginOfSafetyMet(
  currentPrice: number | null,
  entryZoneHigh: number | null
): boolean | null {
  if (currentPrice === null || entryZoneHigh === null) return null;
  return currentPrice <= entryZoneHigh;
}

// The tally is computed in code from the LLM's bounded per-persona verdicts
// — never re-summarized by the LLM itself, so the headline number can never
// contradict the five verdicts it's counting.
export function tallyConsensus(verdicts: CouncilVerdict[]): number {
  return verdicts.filter((v) => v.verdict === "enter").length;
}
