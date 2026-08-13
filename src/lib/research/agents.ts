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
    confidenceRead: { type: "string", enum: ["low", "medium", "high"] },
    riskFlags: { type: "array", items: { type: "string" } },
    recommendation: { type: "string", enum: ["watch", "research further", "pass"] },
    entryPriceEstimate: {
      type: ["number", "null"],
      description: "Grounded in the technicals data; null if not enough was surfaced to ground one",
    },
    fairValueEstimate: {
      type: ["number", "null"],
      description: "Grounded in fundamentals + technicals; null if not enough was surfaced to ground one",
    },
    targetsBasis: { type: "string", description: "One line: what the two estimates above are derived from" },
  },
  required: [
    "ticker",
    "asOf",
    "fundamentalsSummary",
    "technicalsSummary",
    "bullCase",
    "bearCase",
    "confidenceRead",
    "riskFlags",
    "recommendation",
    "entryPriceEstimate",
    "fairValueEstimate",
    "targetsBasis",
  ],
};

async function chat(system: string, user: string, maxTokens: number): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
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

// 3.3 Synthesizer / Debate Agent — reads both analysts' output plus the
// original trigger reason. Produces bull/bear case + structured scorecard.
// Never fills gaps the analysts didn't surface.
export async function runSynthesizer(params: {
  ticker: string;
  triggerReason: string;
  fundamentalsSummary: string;
  technicalsSummary: string;
}): Promise<Scorecard> {
  const asOf = new Date().toISOString().slice(0, 10);

  const completion = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: 2000,
    response_format: {
      type: "json_schema",
      json_schema: { name: "scorecard", schema: SCORECARD_JSON_SCHEMA },
    },
    messages: [
      {
        role: "system",
        content:
          "You are the synthesizer in a small research pipeline. You read the " +
          "Fundamentals Analyst's summary, the Technicals Analyst's summary, and " +
          "the original reason this ticker was scanned. Produce a short bull case, " +
          "a short bear case, an explicit confidence read (how much the two " +
          "analysts' data actually supports a clear view), risk flags, and a " +
          "recommendation of watch / research further / pass. " +
          "You do not invent data: if the two analysts didn't surface something, " +
          "you don't either — no filling gaps with plausible-sounding guesses. " +
          "entryPriceEstimate and fairValueEstimate must be derived only from " +
          "numbers that actually appear in the two summaries (e.g. last close, " +
          "52-week range, valuation ratios) — if there isn't enough to ground an " +
          "estimate, return null for it rather than guessing, and say why in " +
          "targetsBasis. Respond with the scorecard JSON only.",
      },
      {
        role: "user",
        content: `Ticker: ${params.ticker}\nOriginal scan trigger: ${params.triggerReason}\n\nFundamentals Analyst summary:\n${params.fundamentalsSummary}\n\nTechnicals Analyst summary:\n${params.technicalsSummary}\n\nasOf date to use: ${asOf}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error(`Synthesizer returned no content for ${params.ticker}`);
  }

  return ScorecardSchema.parse(JSON.parse(raw));
}
