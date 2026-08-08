// Phase 1 — manual, single-run research pipeline. No UI, no DB, no scheduling.
// Usage: npx tsx scripts/research-agent/run.ts NVDA AMD CCJ
//
// For each ticker: fetch EDGAR + market data, run the three agents, print the
// scorecard, and save it to docs/research-runs/<ticker>-<date>.json for review.

import fs from "fs";
import path from "path";
import { fetchEdgarBundle } from "./edgar";
import { fetchMarketData } from "./marketData";
import { runFundamentalsAnalyst, runTechnicalsAnalyst, runSynthesizer } from "./agents";

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
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error(
      "No ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) set in the environment. " +
        "Set it before running — see README for where to get one."
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
