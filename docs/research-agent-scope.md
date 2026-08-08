# Research & Scoring Agent — Scope Draft v0

Stage 2/3 of the original six-stage pipeline (scan → **research** → **score** →
portfolio → risk → monitor). This is the free-tier, low-complexity version of
the "AI trading desk" idea — same spirit (structured, multi-agent-scrutinized
recommendations), radically smaller build.

**Status:** planning document, nothing built yet. This is what gets agreed
before any code is written.

---

## 1. Aim

Take a ticker from the existing curated universe (`docs/universe-draft.md`)
and produce a **structured, scrutinized scorecard** — not a single model's
opinion, but the output of a small debate between specialized agents reading
real data — stored in Postgres and rendered as a card in the dashboard.

This is explicitly **not** a rebuild of Cloud9/Nimbus. No voice interface, no
nine personas, no hand tracking, no paid market-data or social APIs. It's the
one part of that idea worth keeping — multi-agent scrutiny of a
recommendation — built on infrastructure this project already has.

## 2. Non-goals (explicit boundaries)

- **No live trading, no order execution, no brokerage integration.**
  Read-only research. This produces opinions for you to act on manually,
  same as the current Finviz → dashboard workflow.
- **No paid data sources.** If a source needs a paid tier for meaningful
  volume, it's out until you decide otherwise. See §4.
- **No social/sentiment feeds (X/Twitter, Reddit, etc.).** These require
  paid API access to do properly; skipped for this phase.
- **No autonomous scheduling in phase 1.** You trigger runs manually on
  specific tickers. Automation (weekly cron via a Routine) is a later,
  separate decision — not bundled into this build.
- **No voice, no avatars, no orchestration theater.** Output is text +
  structured data. If it's not useful without the show, it doesn't get built.
- **Not investment advice.** Same disclaimer TradingAgents itself carries —
  this produces research artifacts, not instructions. You are the risk
  officer; the system doesn't get authority you haven't given it.

## 3. Agents (three, not nine)

Each agent has one job, one data source, and a boundary on what it does
*not* do. No agent executes anything; all of them only write to the
scorecard or the research notebook.

### 3.1 Fundamentals Analyst
- **Reads:** SEC EDGAR filings (10-K, 10-Q, 8-K) for the ticker — free,
  no API key, official source.
- **Produces:** a plain-language summary of financial health, revenue
  trend, margin trend, debt position, and anything materially unusual in
  the latest filing (restatements, going-concern language, guidance cuts).
- **Does not:** predict price, recommend buy/sell, or read anything other
  than the filings themselves.

### 3.2 Technicals & Market-Data Analyst
- **Reads:** price/volume history and basic fundamentals via yfinance
  (free, unofficial Yahoo Finance scrape — no key, but not a stable
  contracted API; can break without notice).
- **Produces:** trend context (where price sits relative to recent highs/
  lows, volume pattern, basic valuation ratios if available).
- **Does not:** do technical-analysis theater (no chart-pattern mysticism)
  — sticks to a small set of defensible, literal observations.

### 3.3 Synthesizer / Debate Agent
- **Reads:** both analysts' output, plus the original trigger reason
  logged when the ticker was scanned.
- **Produces:** a short bull case, a short bear case, and a final
  structured scorecard (see §5) with an explicit confidence/risk read —
  modeled on TradingAgents' bull-vs-bear-then-risk-manager pattern, just
  compressed into one agent turn instead of a multi-round debate.
- **Does not:** invent data. If the two analysts didn't surface something,
  the synthesizer doesn't either — no filling gaps with plausible-sounding
  guesses.

**Why three and not TradingAgents' full roster:** the value of the
multi-agent pattern is separation of concerns (fundamentals vs. technicals
vs. synthesis) and forcing an explicit bull/bear tension before a verdict —
not agent count. Three well-scoped agents get you that structure without
the debate-round token cost or the data connectors you'd need for a fuller
roster (sentiment analyst, dedicated risk/portfolio manager, trader agent).

## 4. Data sources (free tier only)

| Source | Cost | What it gives | Caveat |
|---|---|---|---|
| SEC EDGAR | Free, no key | Official filings | US-listed companies only — no SGX filings here |
| yfinance | Free, no key | Price/volume, basic fundamentals | Unofficial scrape; can silently break |
| RSS feeds | Free | News headlines for context | No sentiment scoring, just headline text |
| Claude (Anthropic API) | Pay-per-use, already in use | The three agents above | Cost scales with tickers × runs — see §7 |

SGX names in the universe won't have EDGAR coverage — the Fundamentals
Analyst either needs a fallback (SGX-listed companies file with SGXNet, no
free structured API) or those tickers get technicals-only scorecards in
phase 1. Worth deciding explicitly rather than discovering it mid-build.

## 5. Scorecard schema

The structured contract between the agent pipeline and the dashboard UI.
Loosely inspired by the JPM card you shared, renamed to avoid implying
false precision (no "$477 forward target" — that reads as a confident
number when it's a model's estimate):

```
{
  ticker: string
  asOf: date
  fundamentalsSummary: string       // from 3.1
  technicalsSummary: string         // from 3.2
  bullCase: string                  // from 3.3
  bearCase: string                  // from 3.3
  confidenceRead: "low" | "medium" | "high"   // how much the two analysts agreed
  riskFlags: string[]               // anything that should give you pause
  recommendation: "watch" | "research further" | "pass"
}
```

Deliberately **no numeric price targets** in phase 1 — "$465 intrinsic
value" implies a precision this system doesn't have. If you want numeric
targets later, that's a phase 2+ decision made with eyes open about what
backs the number.

## 6. Obsidian's role

A companion research notebook, not the system of record. Each ticker run
also writes a markdown file into an Obsidian vault (just a folder — no
Obsidian-specific setup needed on the writing side) containing the full
agent output in readable form, tagged by theme and ticker. You get
backlinks and a graph view connecting companies/themes for free, with zero
UI work. The Postgres scorecard stays the structured source of truth that
the dashboard reads; Obsidian is where you read and think.

## 7. Cost reality

Three agent calls per ticker run (fundamentals, technicals, synthesis).
Run manually on a handful of tickers, cost is negligible. Run automatically
across the full 173-ticker universe weekly, cost is real and recurring —
size this before turning on any automation, not after.

## 8. Phases

**Phase 0 (this document):** agree scope, schema, and boundaries before
writing code.

**Phase 1 — single ticker, manual trigger, no UI.**
Build the three agents as a script. Run it by hand on 3–5 tickers you
already know well. Read the output. Judge quality before building anything
else — this is the same "test before automating" principle from the
Finviz universe work.

**Phase 2 — Postgres + dashboard card.**
Only if phase 1 output is good enough to trust. Add the scorecard table,
wire the three agents into a route the dashboard can call, build the card
UI.

**Phase 3 — Obsidian export.**
Add the markdown-vault write-out once the core pipeline is stable.

**Phase 4 — batch/scheduling (separate decision).**
Not committed to here. Revisit once phases 1–3 are working and you've seen
real cost and quality over a few weeks of manual runs.

## 9. Open questions for you

1. SGX names without EDGAR coverage — technicals-only scorecard, or skip
   them in phase 1?
2. Confirm the "no numeric price targets" call in §5 — some investors
   want the number even caveated; others find it actively misleading. This
   is your call, not mine to make silently.
3. Where should the Obsidian vault live — a folder in this repo, or
   somewhere outside it? Affects whether it's git-tracked alongside the
   app.
