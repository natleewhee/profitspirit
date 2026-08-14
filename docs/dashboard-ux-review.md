# Dashboard UX Review & Improvement Proposal

**Reviewer:** PM / UX pass, requested after the "it looks very basic and doesn't
give me a good snapshot" feedback.
**Date:** 2026-08-14
**Scope:** `src/app/page.tsx`, `src/components/CandidateTable.tsx`,
`src/components/FilterBar.tsx`, `src/app/candidates/[id]/page.tsx`,
`src/components/ScorecardCard.tsx`, `src/components/ResearchPanel.tsx`,
`src/app/api/candidates/route.ts`.
**Nothing in this document has been built.** It is a menu to approve from.

---

## 1. Current-state assessment

### The workflow the app is actually serving

> Weekly Finviz scan → log each ticker by hand → run AI research on some of
> them → decide watch / pass / portfolio.

Four steps. The app is good at step 2 and step 3. It is **not serving steps 1
and 4 at all**, and those are the ones that need a dashboard.

### What works and should be kept

- **The data model is genuinely good.** `Scorecard` (`prisma/schema.prisma`)
  carries far more decision-grade structure than most personal tools ever get
  to: a 0–100 `recommendationScore`, a deterministic `valuationVerdict`,
  `fairValueEstimate` vs `currentPrice`, `riskLevel`, `confidenceRead`,
  `dataQuality`. The scoring architecture (§5a of the scope doc, implemented in
  `score.ts` / `valuation.ts`) is disciplined — the label can't contradict the
  number, thin data can't produce high confidence. **The UI is under-using data
  that already exists.** That is the single most important fact in this review:
  almost everything proposed below is a rendering change, not a new capability.
- The `NEW` row highlight keyed off `latestDate` in `CandidateTable.tsx` is a
  nice touch that correctly reflects the weekly-batch mental model.
- Inline status `<select>` in the table (no navigation to change status) is the
  right call for a single-user tool.
- `ScorecardCard.tsx` is the best-designed surface in the app. The score block,
  the pill row, the "show your work" `targetsBasis` footnote — that card is
  doing real work. It is just buried one click deep, one candidate at a time.

### What's genuinely missing

**1. The dashboard shows zero research output.** `GET /api/candidates`
(`src/app/api/candidates/route.ts:14`) does a bare `findMany` with no
`include`, so `Candidate` in `src/lib/types.ts` has no scorecard data attached,
so `CandidateTable.tsx` couldn't show a score even if it wanted to. Seven
columns — Ticker, Date Scanned, Theme, Trigger Reason, Status, Notes, actions —
and **not one of them tells you whether a stock is worth buying.** Two of the
seven (Trigger Reason, Notes) are free text the owner typed themselves at scan
time; they consume the widest part of the table and carry the least decision
value. This is the owner's complaint, stated precisely.

**2. `Status` is a lying proxy for "have I researched this?"** The research
route (`src/app/api/candidates/[id]/research/route.ts`) creates a `Scorecard`
but never touches `candidate.status`. So a candidate can have three scorecards
and still read `NEW`. The status field is a *human decision* field
(watchlist/portfolio/passed) being asked to double as a *system state* field
(researched or not). It can't do both, and today it does neither reliably. The
status-count strip at `page.tsx:88-100` is therefore built on sand.

**3. There is no "what should I look at next?" affordance.** With ~10–20
candidates the owner has to open each detail page to learn anything. The cost
of finding the best name in the list is O(n) page loads. That's the actual
product failure — not aesthetics.

**4. Re-research history is invisible and undifferentiated.** The schema
explicitly supports re-running over time (`Scorecard` is a history, not a 1:1).
`ResearchPanel.tsx` renders *every* run as a full-height card, newest first,
all equally prominent. After three runs on one ticker that page is a wall. And
the dashboard shows none of it — including the most interesting signal a
history produces: *score went from 41 to 68 since last month.*

**5. Staleness is unrepresented anywhere.** `currentPrice` is the price *at
research time*, frozen. A scorecard from six weeks ago showing "undervalued,
32% below intrinsic value" may be describing a stock that has since run 40%.
Nothing in the UI marks that. For a tool whose entire output is a
price-relative verdict, this is the most dangerous omission on the list — worse
than the missing columns, because the missing columns are obvious and this one
isn't.

**6. Filter state is ephemeral.** `theme` / `status` live in `useState` in
`page.tsx:14-15`. Refresh loses them, and a filtered view can't be bookmarked.
Minor, but cheap to fix while touching the file.

---

## 2. The core fix — surface the latest scorecard in the list

This is the owner's explicit ask and it should be built first, as one change.

### 2.1 Data layer (prerequisite, ~20 lines)

In `src/app/api/candidates/route.ts`, attach the two most recent scorecards:

```ts
include: {
  scorecards: {
    orderBy: { createdAt: "desc" },
    take: 2,               // [0] = latest, [1] = previous, for the delta chip
    select: {
      id: true, asOf: true, createdAt: true,
      recommendationScore: true, recommendation: true,
      valuationVerdict: true, fairValueEstimate: true,
      currentPrice: true, entryPriceEstimate: true,
      riskLevel: true, confidenceRead: true, dataQuality: true,
      sector: true,
    },
  },
  _count: { select: { scorecards: true } },
}
```

Deliberately `select`-ed rather than a full `include` — the four long prose
fields (`fundamentalsSummary`, `technicalsSummary`, `bullCase`, `bearCase`) are
kilobytes each and belong nowhere near a list payload.

Add a matching `CandidateWithLatest` type in `src/lib/types.ts` alongside the
existing `CandidateWithScorecards`.

### 2.2 Proposed table columns

Replace the current seven columns in `CandidateTable.tsx` with these nine.
Trigger Reason and Notes come **out** of the grid and move to a hover tooltip
on the ticker cell (they're already `title`-attribute material — `Notes` is
literally rendered truncated today at line 108).

| # | Column | Content | Width |
|---|--------|---------|-------|
| 1 | **Ticker** | `NVDA` bold, `NEW` badge, sector as a 11px grey subline from `scorecard.sector` | ~110px |
| 2 | **Score** | Big number + 4px colored bar beneath (score/100 as width); delta chip `▲ +6` vs previous run when one exists | ~90px |
| 3 | **Call** | `RECOMMENDATION_LABELS` pill (Watch / Research further / Pass) | ~120px |
| 4 | **Valuation** | Verdict pill + **the gap**, e.g. `Undervalued` / `+32% vs $148.20` | ~160px |
| 5 | **Price** | `$112.40` current, with `→ $111.15 entry` as subline | ~110px |
| 6 | **Risk** | Risk pill; confidence rendered as a 3-dot meter, not a third pill | ~90px |
| 7 | **Researched** | Relative: `12d ago`, amber ≥30d, red ≥60d, `—` if never | ~100px |
| 8 | **Status** | Existing inline `<select>` — drop the duplicate `StatusBadge` below it (`CandidateTable.tsx:104-106`); the select already shows the value | ~150px |
| 9 | | Detail / Edit / Delete links | ~140px |

**Theme** drops out as a column and survives as a filter only. It's a
classification the owner assigned; it never changes and never drives a
decision. If it's wanted back, fold it into the ticker cell subline next to
sector.

Row sketch:

```
┌──────────┬───────┬──────────────┬─────────────────────┬──────────┬────────┬───────────┬──────────────┐
│ NVDA     │  78   │ Watch        │ Undervalued         │ $112.40  │ Low    │ 12d ago   │ Researched ▾ │
│ Semis    │ ▓▓▓▓░ │              │ +32% vs $148.20     │ →$111.15 │ ●●○    │           │              │
│          │ ▲ +6  │              │                     │          │        │           │              │
├──────────┼───────┼──────────────┼─────────────────────┼──────────┼────────┼───────────┼──────────────┤
│ CCJ  NEW │   —   │  Not researched yet    [Run research]        │        │ —         │ New        ▾ │
└──────────┴───────┴──────────────┴─────────────────────┴──────────┴────────┴───────────┴──────────────┘
```

### 2.3 The gap number — get this one right

The gap is the owner's specific ask ("how far away it is from its intrinsic
value") and it's the number most easily rendered misleadingly.

- Formula: `(fairValueEstimate − currentPrice) / currentPrice`, the same
  expression already in `score.ts:26` and `valuation.ts:104`. **Extract it to
  one exported helper** and have all three call sites use it. Three independent
  copies of the core number of the product is how a dashboard ends up
  disagreeing with itself.
- Sign convention: `+32%` means *upside to fair value* (undervalued). Positive
  is good. Keep it consistent and never show a bare unsigned percentage.
- `fairValueEstimate` is legitimately `null` for unprofitable companies (Graham
  needs positive EPS, FCF-yield needs positive FCF). Render `Insufficient data`
  in a muted grey pill — never `0%`, never blank. §5 of the scope doc already
  mandates this for the card; the table must honour the same rule.
- **Label the price as historical.** The gap is computed against
  `currentPrice`, which is the price on the research date. Once the
  "Researched" column shows `40d ago`, the gap must visually degrade too —
  render the whole valuation cell at reduced opacity past 30 days, with a
  tooltip: *"vs price on 5 Jul; not a live quote."* This is the honest fix and
  it costs nothing. The expensive fix (live quotes) is discussed in §5 as a
  later item.

### 2.4 Three row states, three treatments

**Never researched** (`scorecards.length === 0`): collapse columns 2–7 into a
single muted cell reading `Not researched yet` with an inline **Run research**
button that POSTs to `/api/candidates/[id]/research` without leaving the page.
This turns the dashboard into the work queue, which is what a weekly-batch
workflow actually needs. Show a spinner in-row while running (the route takes
15–30s — reuse the wording already in `ResearchPanel.tsx:44`).

**One scorecard**: full row as sketched, no delta chip.

**Multiple scorecards**: full row **plus a delta chip** under the score —
`▲ +6` green / `▼ −11` red, comparing `scorecards[0].recommendationScore` to
`scorecards[1]`. Tooltip: *"was 72 on 3 Jul"*.

**Recommendation: latest only, plus a delta chip. Do not put a sparkline in the
table.** Sparklines need ~8+ points to say anything; at a re-research cadence
of weeks-to-months, most tickers will have one or two scores for a long time. A
two-point sparkline is decoration pretending to be information. The delta chip
carries 100% of the available signal in a tenth of the space. Revisit a real
score-history chart on the *detail* page once some ticker actually has 4+ runs
(see §5, held items).

---

## 3. Broader IA and workflow improvements

### 3.1 Separate "researched?" from "what did I decide?" (do this early)

Two concrete changes:

1. In `src/app/api/candidates/[id]/research/route.ts`, after the
   `prisma.scorecard.create`, promote the candidate if it's still untouched:
   `if (candidate.status === "NEW") await prisma.candidate.update({ where: { id }, data: { status: "RESEARCHED" } })`.
   Only from `NEW` — never overwrite a deliberate `PASSED` or
   `ADDED_TO_PORTFOLIO` because a re-research ran.
2. Stop using `Status` to answer "is this researched?" anywhere in the UI.
   Derive it from `scorecards.length > 0`, which is now available in the list
   payload and is always true. `Status` becomes purely the owner's decision
   field, which is what it should have been.

### 3.2 Replace the status-count strip with a decision summary

The current strip (`page.tsx:88-100`) prints all five status counts with equal
weight, including ones that are usually zero. It answers "how are my labels
distributed", a question nobody has. Four tiles that answer real questions:

| Tile | Value | Click behaviour |
|---|---|---|
| **Needs research** | count of candidates with no scorecard | filters the table to them |
| **Actionable** | score ≥ 65 **and** verdict = Undervalued **and** status not Passed/Portfolio | filters to them |
| **Going stale** | researched > 30 days ago | filters to them |
| **Last scan** | `latestDate` + count of candidates added that day | filters to that scan date |

Every tile is a filter shortcut, so the summary and the table are one
interaction instead of two surfaces. "Actionable" is the tile that answers the
owner's real question — *which of these look good* — in one number.

Optionally, a one-line "top pick" under the tiles: highest-scoring
not-yet-actioned candidate, as a link. Cheap, and it's the first thing the eye
should land on.

### 3.3 Filtering and sorting

Extend `FilterBar.tsx` with, in priority order:

1. **Ticker search box** — trivial client-side `includes()` filter. Highest
   value per line of code once the list passes ~20 rows.
2. **Research state**: All / Needs research / Researched / Stale (>30d).
   Derived client-side; no API change.
3. **Verdict**: All / Undervalued / Fairly valued / Overvalued / Insufficient
   data.
4. **Min score slider or stepper** (0 / 35 / 50 / 65 presets matching the
   thresholds already hard-coded in `score.ts:38-40` — reuse those constants,
   don't retype them).

Keep the existing Theme and Status selects. Move all filter state into URL
query params (`useSearchParams` + `router.replace`) so a view survives a
refresh and can be bookmarked.

**Sorting** in `CandidateTable.tsx`: extend `SortKey` to include `score`,
`gap`, and `lastResearched`. One rule that must be explicit — **rows with no
scorecard always sort to the bottom regardless of direction.** The default
`localeCompare`/numeric comparator will otherwise scatter unresearched
candidates through a score-sorted list and make it useless. Keep `dateScanned`
descending as the default sort; the weekly batch is still the primary mental
model, and score-sorting is one click away.

### 3.4 Bulk actions — recommend not building

A "select all → run research" button is the obvious next thought and it's the
wrong one here. Three reasons, all from the project's own docs: Groq's free
tier is rate-limited and the scope doc (§7) explicitly warns about
back-to-back runs; the route already flirts with Vercel's function timeout at
`maxDuration = 60` for a *single* ticker (README's timeout note); and a
personal weekly scan adds maybe 3–8 names, which is a tolerable number of
clicks. The per-row **Run research** button from §2.4 gets 90% of the benefit
with none of the failure modes. If batching ever becomes necessary, it belongs
in the CLI (`scripts/research-agent/run.ts`), which already accepts multiple
tickers and has no timeout — not in the web UI.

The one bulk action worth considering later is multi-select → set status
(e.g. mark five names Passed after a review session). Low value; defer.

### 3.5 Candidate detail page restructure

`src/app/candidates/[id]/page.tsx` currently leads with a four-cell `<dl>` of
candidate metadata (theme, date scanned, status, scorecard count), then trigger
reason, then notes, and only then the research. The *least* valuable
information is at the top and gets the most vertical space. Invert it:

1. **Hero: the latest scorecard's verdict.** Ticker, score, recommendation,
   and a single **price-position bar** — a horizontal track marked with entry
   price, current price, and fair value, so the relationship the whole pipeline
   exists to compute is legible in one glance instead of read off three numbers
   in `ScorecardCard.tsx:156-178`. This is the one genuine data visualisation
   worth adding to this app; everything else here is tables and pills.
2. **Candidate meta as a single compact line** under the hero: `AI Infra /
   Semis · scanned 12 Jul · 3 research runs`. Trigger reason and notes go into
   a collapsible "Scan context" disclosure. They're input, not output.
3. **History as an accordion in `ResearchPanel.tsx`.** Latest run expanded;
   every prior run collapses to a one-line header — date, score, delta,
   verdict, risk — expandable on click. Reuses `ScorecardCard` unchanged as the
   expanded body; the only new code is the header row and the open/closed
   state.
4. Once 4+ runs exist on a ticker, add a small **score-over-time line chart**
   above the accordion. Held until then (§5).

`ScorecardCard.tsx` itself needs no structural change — it's well built. The
only edit worth making is folding the price block up next to the score, since
that block and the score are the two things anyone reads first.

---

## 4. Visual design system — an actual opinion

**The verdict: build a ~40-line shared style/format module now. Do not build a
design token system. Delete the dark-mode CSS block today.**

Reasoning, in three parts:

**(a) The per-component Tailwind grays are fine and not worth centralising.**
`bg-gray-50` for table headers, `text-gray-600` for secondary text — repeated
ad hoc across components. For a single-user tool with six components, factoring
these into CSS variables or a Tailwind theme extension buys consistency you can
already maintain by eye and costs you the ability to tweak one component
without thinking about the others. Skip it. This is the kind of thing that
feels like engineering rigour and is actually just deferred cost.

**(b) The *semantic* color mappings are a different story and do need
extracting.** `ScorecardCard.tsx` currently owns five style maps plus a
`scoreStyles()` function with the 65/35 thresholds hard-coded at lines 43-45 —
thresholds that also exist independently in `score.ts:38-40`. The moment the
table renders a score pill, that mapping gets copy-pasted, and there will be
two definitions of "what score counts as green" in a tool whose only job is
telling you whether a stock is green. That's not a styling inconsistency, it's
a correctness bug waiting to happen.

Create `src/lib/ui.ts` (or extend `src/lib/labels.ts`, which already owns the
label half of this concern) containing:

- the five pill-style records currently in `ScorecardCard.tsx:10-39`
- `scoreStyles()` / `scoreBucket()`, importing the thresholds from `score.ts`
  rather than restating them
- `formatDate()` — currently duplicated verbatim in three files
  (`CandidateTable.tsx:19`, `ScorecardCard.tsx:48`, detail page line 8)
- `formatPrice()` (`ScorecardCard.tsx:56`), plus new `formatGap()` and
  `formatRelativeDate()` for the new columns

That's an afternoon's worth of nothing, and it's the difference between adding
the new columns cleanly and forking every visual rule.

**(c) `src/app/globals.css` has a live bug, not a style preference.** Lines
10-15 flip `--background` to `#0a0a0a` and `--foreground` to `#ededed` under
`prefers-color-scheme: dark`, while every single component hardcodes `bg-white`,
`text-gray-900`, `bg-gray-50`. That mismatch is the root cause of the
dark-background/unreadable-text screenshot that started this review. The
contrast was patched, but the mechanism is still there and will bite again the
next time a component renders on the body background instead of its own card.

**Delete the `@media (prefers-color-scheme: dark)` block.** Commit to light
mode. Dark mode for a personal dashboard is a want, not a need, and a
half-implemented one is strictly worse than none. If dark mode is genuinely
wanted later, it's a real project (`dark:` variants across every component, or
a proper token layer) — not three lines in a CSS file. Three-line fix, removes
an entire class of future bug.

---

## 5. Prioritisation and sequencing

### Tier 1 — Quick wins (one sitting, ~half a day total) — **Built**

Ship these together as one change. They are the owner's actual complaint.

| | Item | Files |
|---|---|---|
| 1 | Include latest 2 scorecards in the list API + new type | `api/candidates/route.ts`, `lib/types.ts` |
| 2 | New table columns: Score, Call, Valuation+gap, Price, Risk, Researched; drop Trigger Reason / Notes / Theme columns; drop duplicate `StatusBadge` | `CandidateTable.tsx` |
| 3 | Three row states, incl. inline **Run research** for unresearched | `CandidateTable.tsx` |
| 4 | Auto-promote `NEW` → `RESEARCHED` on a research run | `api/candidates/[id]/research/route.ts` |
| 5 | Extract `src/lib/ui.ts`: pill maps, score thresholds, `formatDate`/`formatPrice`/`formatGap`/`formatRelativeDate`, one shared gap calculation | new file + 3 call sites |
| 6 | Delete the dark-mode block | `globals.css` |

After item 2 alone the owner's stated problem is solved. Items 4–6 are the
hygiene that makes items 2–3 not create new mess.

### Tier 2 — Medium effort (a day or two, in this order)

| | Item | Why this order |
|---|---|---|
| 7 | Decision summary tiles replacing the status strip, each clickable as a filter | Depends on Tier 1's data; highest remaining value |
| 8 | Ticker search + research-state / verdict / min-score filters; move filter state to URL params | Search first — it's five lines and pays off immediately |
| 9 | Sortable score / gap / researched-date columns, with nulls pinned last | Cheap once the columns exist |
| 10 | Staleness treatment: relative dates, amber/red past 30/60d, dimmed valuation cell with "price as of" tooltip | Honesty fix; small |
| 11 | Detail page restructure: hero + price-position bar, meta demoted, history accordion | The largest Tier 2 item; do it last |

### Tier 3 — Larger, and mostly *don't*

| Item | Verdict |
|---|---|
| **Live price refresh** so the gap is against today's quote, not the research-date price | **The only Tier 3 item genuinely worth doing.** It's the difference between a dashboard that's accurate and one that's accurate-as-of-last-month. Needs a `GET /api/quotes?tickers=...` batched through `yahoo-finance2` with short caching, plus a re-derived gap in the table. Do it *after* Tier 2, and only if the staleness treatment in item 10 proves insufficient. |
| **Score-history chart** on the detail page | Build when some ticker actually has 4+ runs. Not before — there's nothing to plot. |
| **Design token system / Tailwind theme layer** | No. See §4. `src/lib/ui.ts` is the correct amount of system for this app. |
| **Bulk research runs** | No. See §3.4 — rate limits and function timeouts make it a liability, and the CLI already covers the batch case. |
| **Card/grid view toggle, responsive mobile layout** | No. This is a desktop weekly-review tool. A table is the right density for comparing 20 rows on 8 dimensions, and a phone can't show that regardless of layout. |
| **Auth / multi-user** | Out of scope by design (README). Leave it. |

### The one-line recommendation

Do Tier 1 as a single change this week. It is a rendering change over data that
already exists, it directly answers the complaint, and it will make the tool
feel like a different product. Then use it for two or three weekly cycles
before deciding whether any of Tier 2 is actually needed — a real usage session
against the new table will rank items 7–11 far better than this document can.
