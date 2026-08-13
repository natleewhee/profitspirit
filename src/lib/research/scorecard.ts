import { z } from "zod";

// Mirrors the schema locked in docs/research-agent-scope.md §5.
export const ScorecardSchema = z.object({
  ticker: z.string(),
  asOf: z.string().describe("ISO date this scorecard was generated"),
  fundamentalsSummary: z.string(),
  technicalsSummary: z.string(),
  bullCase: z.string(),
  bearCase: z.string(),
  confidenceRead: z.enum(["low", "medium", "high"]),
  riskFlags: z.array(z.string()),
  recommendation: z.enum(["watch", "research further", "pass"]),
  entryPriceEstimate: z
    .number()
    .nullable()
    .describe("Estimate grounded in the technicals data; null if not enough was surfaced to ground one"),
  fairValueEstimate: z
    .number()
    .nullable()
    .describe("Estimate grounded in fundamentals + technicals; null if not enough was surfaced to ground one"),
  targetsBasis: z.string().describe("One line: what the two estimates above are derived from"),
});

export type Scorecard = z.infer<typeof ScorecardSchema>;
