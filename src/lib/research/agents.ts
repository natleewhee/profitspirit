import Groq from "groq-sdk";
import type { FundamentalsBundle } from "./fundamentalsData";
import type { MarketDataBundle } from "./marketData";
import { ScorecardSchema, type Scorecard } from "./scorecard";

// Lazy singleton: constructing Groq() throws immediately if GROQ_API_KEY is
// unset, which would otherwise crash `next build` (it imports this module to
// collect route metadata even though the key is only needed at request time).
let client: Groq | undefined;
function getClient(): Groq {
  if (!client) client = new Groq();
  return client;
}

// Free-tier Groq model — good instruction-following, generous rate limits.
const MODEL = "llama-3.3-70b-versatile";

const SCORECARD_JSON_SCHEMA = {
  type: "object",
  properties: {
    ticker: { type: "string" },
    asOf: { type: "string", description: "ISO date, e.g. 2026-08-13" },
    fundamentalsSummary: { type: "string" },
    technicalsSummary: { type: "string" },
    bullCase: { type: "string" },
    bearCase: { type: "string" },
    riskFlags: { type: "array", items: { type: "string" } },
    riskLevel: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Overall risk level given the fundamentals, technicals, and bear case",
    },
    confidenceRead: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Confidence in the risk level and overall read above, given how much the data supports it",
    },
  },
  required: [
    "ticker",
    "asOf",
    "fundamentalsSummary",
    "technicalsSummary",
    "bullCase",
    "bearCase",
    "riskFlags",
    "riskLevel",
    "confidenceRead",
  ],
};

// temperature: 0 (+ a fixed seed, best-effort on Groq's infra) so re-running
// research on an unchanged ticker doesn't move confidenceRead/riskLevel —
// and therefore recommendationScore — on sampling noise alone. Previously
// unset (provider default ~1.0), which meant the composite score could
// shift between the watch/research_further/pass buckets on identical data.
const DETERMINISTIC_SAMPLING = { temperature: 0, seed: 42 } as const;

async function chat(system: string, user: string, maxTokens: number): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    ...DETERMINISTIC_SAMPLING,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return completion.choices[0]?.message?.content ?? "";
}

// 3.1 Fundamentals Analyst — reads Yahoo Finance's fundamentals data only
// (quoteSummary: key ratios + income statement history). No price
// predictions, no recommendations, no reading anything beyond what's given.
export async function runFundamentalsAnalyst(fundamentals: FundamentalsBundle): Promise<string> {
  if (!fundamentals.found) {
    return `No fundamentals data available for ${fundamentals.ticker}: ${fundamentals.reason}`;
  }

  return chat(
    "You are a fundamentals analyst. You read only the Yahoo Finance data " +
      "you're given — key financial ratios and a few periods of income " +
      "statement history. Produce a plain-language summary of financial " +
      "health: revenue trend, margin trend, debt position, and anything " +
      "materially unusual you can infer from the numbers alone (note you " +
      "only have summary figures, not filing text, so don't claim to know " +
      "about restatements or guidance cuts unless the numbers themselves " +
      "show something unusual). Do not predict price. Do not recommend " +
      "buy/sell/hold. Do not reference information beyond what's provided. " +
      "If the provided data is too sparse to assess something, say so plainly.",
    `Company: ${fundamentals.companyName ?? fundamentals.ticker} (${fundamentals.ticker})\nSector: ${fundamentals.sector ?? "unknown"} / ${fundamentals.industry ?? "unknown"}\n\nKey ratios:\n${JSON.stringify(fundamentals.keyRatios, null, 2)}\n\nAnnual income statement history (most recent first):\n${JSON.stringify(fundamentals.annualIncomeStatements, null, 2)}\n\nQuarterly income statement history (most recent first):\n${JSON.stringify(fundamentals.quarterlyIncomeStatements, null, 2)}`,
    1500
  );
}

// 3.2 Technicals & Market-Data Analyst — reads yfinance-equivalent data only.
// Literal observations, no chart-pattern mysticism.
export async function runTechnicalsAnalyst(market: MarketDataBundle): Promise<string> {
  if (!market.found) {
    return `No market data available for ${market.ticker}: ${market.reason}`;
  }

  return chat(
    "You are a technicals and market-data analyst. You read only the price, " +
      "volume, and basic valuation data you're given. Produce trend context: " +
      "where the price sits relative to its 52-week range and its 50/200-day " +
      "averages, recent volume pattern if inferable from the trailing daily " +
      "closes, and basic valuation ratios (P/E) if available. Stick to a small " +
      "set of defensible, literal observations — no chart-pattern mysticism " +
      "(no head-and-shoulders, no Fibonacci, no astrology). Do not recommend " +
      "buy/sell/hold. If data is missing, say so plainly rather than guessing.",
    `Ticker: ${market.ticker}\n\n${JSON.stringify(
      {
        price: market.price,
        currency: market.currency,
        marketCap: market.marketCap,
        trailingPE: market.trailingPE,
        forwardPE: market.forwardPE,
        fiftyTwoWeekHigh: market.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: market.fiftyTwoWeekLow,
        averageVolume: market.averageVolume,
        fiftyDayAverage: market.fiftyDayAverage,
        twoHundredDayAverage: market.twoHundredDayAverage,
      },
      null,
      2
    )}\n\nTrailing daily closes (up to 90 days):\n${JSON.stringify(market.recentClose)}`,
    1200
  );
}

// 3.3 Synthesizer / Debate Agent — reads both analysts' output plus a
// handful of explicit risk signals (debt/liquidity ratios, price volatility)
// so riskLevel is grounded in numbers, not vibes. Deliberately does not see
// the original trigger reason: that's a free-text field a human typed when
// logging the candidate (often a placeholder) and shouldn't bias research
// that's meant to stand on the data alone. No longer produces price targets
// or a recommendation — those are computed deterministically from data we
// already have (see valuation.ts, score.ts) rather than guessed from prose.
// Never fills gaps the analysts didn't surface.
export async function runSynthesizer(params: {
  ticker: string;
  fundamentalsSummary: string;
  technicalsSummary: string;
  riskSignals: {
    debtToEquity: number | null;
    currentRatio: number | null;
    fiftyTwoWeekHigh: number | null;
    fiftyTwoWeekLow: number | null;
  };
}): Promise<Scorecard> {
  const asOf = new Date().toISOString().slice(0, 10);

  // `json_schema` structured outputs are only supported on a subset of Groq
  // models (llama-3.3-70b-versatile isn't one of them). `json_object` mode
  // is supported broadly, so use that plus an explicit shape description in
  // the prompt, and validate/parse the result with ScorecardSchema below.
  const completion = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: 2000,
    response_format: { type: "json_object" },
    ...DETERMINISTIC_SAMPLING,
    messages: [
      {
        role: "system",
        content:
          "You are the synthesizer in a small research pipeline. You read the " +
          "Fundamentals Analyst's summary, the Technicals Analyst's summary, " +
          "and a few raw risk signals (debt-to-equity, current ratio, 52-week " +
          "range). Produce a short bull case, a short bear case, risk flags, " +
          "an overall riskLevel (low/medium/high — weigh the debt and liquidity " +
          "ratios given, plus anything the bear case surfaces), and a " +
          "confidenceRead for how much the data actually supports your risk " +
          "level and overall read. " +
          "You do not invent data: if the two analysts didn't surface something, " +
          "you don't either — no filling gaps with plausible-sounding guesses.\n\n" +
          "Respond with ONLY a single JSON object, no markdown fences, no other " +
          "text, matching exactly this shape:\n" +
          JSON.stringify(SCORECARD_JSON_SCHEMA, null, 2),
      },
      {
        role: "user",
        content: `Ticker: ${params.ticker}\n\nFundamentals Analyst summary:\n${params.fundamentalsSummary}\n\nTechnicals Analyst summary:\n${params.technicalsSummary}\n\nRaw risk signals:\n${JSON.stringify(params.riskSignals, null, 2)}\n\nasOf date to use: ${asOf}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error(`Synthesizer returned no content for ${params.ticker}`);
  }

  // json_object mode guarantees valid JSON but not markdown-fence-free output;
  // strip fences if the model added them despite the instruction not to.
  const stripped = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

  return ScorecardSchema.parse(JSON.parse(stripped));
}
