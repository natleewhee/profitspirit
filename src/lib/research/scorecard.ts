import { z } from "zod";

// The LLM Synthesizer's output. Narrower than the full Scorecard record: it
// no longer produces price targets, valuation verdict, or the categorical
// recommendation — those are computed deterministically (valuation.ts,
// score.ts) from data we already have and merged in afterward
// (src/lib/research/enrich.ts). See docs/research-agent-scope.md §5.
export const ScorecardSchema = z.object({
  ticker: z.string(),
  asOf: z.string().describe("ISO date this scorecard was generated"),
  fundamentalsSummary: z.string(),
  technicalsSummary: z.string(),
  bullCase: z.string(),
  bearCase: z.string(),
  riskFlags: z.array(z.string()),
  riskLevel: z
    .enum(["low", "medium", "high"])
    .describe("Overall risk level given the fundamentals, technicals, and bear case"),
  confidenceRead: z
    .enum(["low", "medium", "high"])
    .describe("Confidence in the risk level and overall read above, given how much the data supports it"),
});

export type Scorecard = z.infer<typeof ScorecardSchema>;
