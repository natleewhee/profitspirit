import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { EdgarBundle } from "./edgar";
import type { MarketDataBundle } from "./marketData";
import { ScorecardSchema, type Scorecard } from "./scorecard";

const client = new Anthropic();
const MODEL = "claude-opus-5";

// 3.1 Fundamentals Analyst — reads SEC EDGAR only. No price predictions, no
// recommendations, no reading anything outside the filings data it's given.
export async function runFundamentalsAnalyst(edgar: EdgarBundle): Promise<string> {
  if (!edgar.found) {
    return `No EDGAR data available for ${edgar.ticker}: ${edgar.reason}`;
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: { effort: "high" },
    system:
      "You are a fundamentals analyst. You read only the SEC EDGAR filing data " +
      "you're given — recent filing metadata and a handful of XBRL financial facts. " +
      "Produce a plain-language summary of financial health: revenue trend, margin " +
      "trend, debt position, and anything materially unusual in the latest filings " +
      "(restatements, going-concern language, guidance cuts — note you only have " +
      "filing metadata, not full text, so infer unusual activity only from what's " +
      "actually in the data, never invent it). Do not predict price. Do not " +
      "recommend buy/sell/hold. Do not reference information beyond what's provided. " +
      "If the provided facts are too sparse to assess something, say so plainly.",
    messages: [
      {
        role: "user",
        content: `Company: ${edgar.companyName} (${edgar.ticker}), CIK ${edgar.cik}\n\nRecent 10-K/10-Q/8-K filings:\n${JSON.stringify(edgar.recentFilings, null, 2)}\n\nKey XBRL facts (most recent 4 periods per tag, in reporting currency):\n${JSON.stringify(edgar.facts, null, 2)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    return `Fundamentals Analyst declined to respond for ${edgar.ticker} (safety classifier).`;
  }
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}

// 3.2 Technicals & Market-Data Analyst — reads yfinance-equivalent data only.
// Literal observations, no chart-pattern mysticism.
export async function runTechnicalsAnalyst(market: MarketDataBundle): Promise<string> {
  if (!market.found) {
    return `No market data available for ${market.ticker}: ${market.reason}`;
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    output_config: { effort: "high" },
    system:
      "You are a technicals and market-data analyst. You read only the price, " +
      "volume, and basic valuation data you're given. Produce trend context: " +
      "where the price sits relative to its 52-week range and its 50/200-day " +
      "averages, recent volume pattern if inferable from the trailing daily " +
      "closes, and basic valuation ratios (P/E) if available. Stick to a small " +
      "set of defensible, literal observations — no chart-pattern mysticism " +
      "(no head-and-shoulders, no Fibonacci, no astrology). Do not recommend " +
      "buy/sell/hold. If data is missing, say so plainly rather than guessing.",
    messages: [
      {
        role: "user",
        content: `Ticker: ${market.ticker}\n\n${JSON.stringify(
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
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    return `Technicals Analyst declined to respond for ${market.ticker} (safety classifier).`;
  }
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
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

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4000,
    output_config: {
      effort: "high",
      format: zodOutputFormat(ScorecardSchema),
    },
    system:
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
      "targetsBasis.",
    messages: [
      {
        role: "user",
        content: `Ticker: ${params.ticker}\nOriginal scan trigger: ${params.triggerReason}\n\nFundamentals Analyst summary:\n${params.fundamentalsSummary}\n\nTechnicals Analyst summary:\n${params.technicalsSummary}\n\nasOf date to use: ${asOf}`,
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error(`Synthesizer failed to produce a valid scorecard for ${params.ticker}`);
  }
  return response.parsed_output;
}
