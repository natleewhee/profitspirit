// Phase 1 — manual, single-run research pipeline. No UI, no DB, no scheduling.
// Usage: npx tsx scripts/research-agent/run.ts NVDA AMD CCJ
//
// For each ticker: fetch EDGAR + market data, run the three agents, print the
// scorecard, and save it to docs/research-runs/<ticker>-<date>.json for review.

import fs from "fs";
import path from "path";
import { fetchEdgarBundle } from "../../src/lib/research/edgar";
import { fetchMarketData } from "../../src/lib/research/marketData";
import {
  runFundamentalsAnalyst,
  runTechnicalsAnalyst,
  runSynthesizer,
} from "../../src/lib/research/agents";

const OUTPUT_DIR = path.join(process.cwd(), "docs", "research-runs");

async function runOne(ticker: string, triggerReason: string) {
  console.log(`\n=== ${ticker} ===`);

  console.log("Fetching EDGAR filings...");
  const edgar = await fetchEdgarBundle(ticker);
  if (!edgar.found) console.log(`  (no EDGAR match: ${edgar.reason})`);

  console.log("Fetching market data...");
  const market = await fetchMarketData(ticker);
  if (!market.found) console.log(`  (no market data: ${market.reason})`);

  console.log("Running Fundamentals Analyst...");
  const fundamentalsSummary = await runFundamentalsAnalyst(edgar);

  console.log("Running Technicals Analyst...");
  const technicalsSummary = await runTechnicalsAnalyst(market);

  console.log("Running Synthesizer...");
  const scorecard = await runSynthesizer({
    ticker,
    triggerReason,
    fundamentalsSummary,
    technicalsSummary,
  });

  console.log(`\n--- Scorecard: ${ticker} ---`);
  console.log(JSON.stringify(scorecard, null, 2));

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = path.join(OUTPUT_DIR, `${ticker}-${scorecard.asOf}.json`);
  fs.writeFileSync(outPath, JSON.stringify(scorecard, null, 2));
  console.log(`Saved to ${path.relative(process.cwd(), outPath)}`);
}

async function main() {
  const tickers = process.argv.slice(2);
  if (tickers.length === 0) {
    console.error("Usage: npx tsx scripts/research-agent/run.ts TICKER [TICKER ...]");
    console.error('Example: npx tsx scripts/research-agent/run.ts NVDA AMD CCJ');
    process.exit(1);
  }
  if (!process.env.GROQ_API_KEY) {
    console.error(
      "No GROQ_API_KEY set in the environment. Get a free key at " +
        "console.groq.com and set it before running — see README."
    );
    process.exit(1);
  }

  for (const ticker of tickers) {
    try {
      await runOne(ticker.toUpperCase(), "Manually triggered Phase 1 test run — no scan log entry.");
    } catch (err) {
      console.error(`\n--- ${ticker} failed ---`);
      console.error((err as Error).message);
    }
  }
}

main();
