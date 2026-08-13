# Coah Scan Candidates Dashboard

A lightweight dashboard for logging and tracking weekly stock scan candidates
(Stage 1 of the scan → research → score → portfolio → risk → monitor pipeline).
Entries are added manually after running your Finviz screens each week.

## Stack

- **Next.js 14** (App Router, TypeScript) — UI + API routes in one app
- **Prisma 6 + PostgreSQL** — data layer
- **Tailwind CSS** — styling

## Data model

A single `Candidate` entity: `ticker`, `dateScanned`, `theme`
(`ai-infra-semis` / `non-tech-asymmetric` / `sgx` / `other`), `triggerReason`,
`status` (`new` / `researched` / `added-to-watchlist` / `added-to-portfolio` /
`passed`), optional `notes`.

## Local development

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to a Postgres instance
   (local Postgres, or a free Supabase database — see deploy steps below).
3. Apply the schema: `npx prisma migrate dev`
4. Run the app: `npm run dev` and open http://localhost:3000

## Deploying for free (Vercel + Supabase)

This app has no built-in auth — it's meant for personal, single-user use
behind an unlisted URL. Two free-tier services get you a persistent, always-
on dashboard with no cost and no local machine dependency:

1. **Create a Supabase project** (https://supabase.com, free tier):
   - Sign up / log in, create a new project, set a database password.
   - Grab the connection string from Project Settings → Database →
     Connection string. Prefer the **pooled** connection (port 6543,
     `...pooler.supabase.com`, add `?pgbouncer=true`) over the direct one
     (port 5432) — Vercel's serverless functions can each open their own
     connection, and the pooled endpoint avoids hitting Supabase's
     connection-limit under concurrent load.
   - Note: Supabase's free tier pauses a project after 7 days of
     inactivity and requires manually resuming it from the dashboard —
     worth knowing if you go more than a week between visits.

2. **Push this repo to GitHub** (already done if you're reading this from
   the repo) and **import it into Vercel** (https://vercel.com, free tier):
   - "New Project" → import the `profitspirit` repo.
   - Under Environment Variables, add `DATABASE_URL` with the Supabase
     connection string from step 1. Make sure it's enabled for the
     **Production** environment (and Preview/Development if you want those
     to work too).
   - Deploy.

3. **Run the migration against the Supabase database once**, either from
   your machine:
   ```
   DATABASE_URL="<your supabase connection string>" npx prisma migrate deploy
   ```
   or, if that environment can't reach the database directly, paste the SQL
   from `prisma/migrations/*/migration.sql` into Supabase's SQL Editor
   (Project → SQL Editor → New query) and run it. Re-run for any new
   migrations added later.

4. Visit the URL Vercel gives you — that's your always-viewable dashboard.

**Note:** Vercel does not retroactively inject environment variables into
already-built deployments — after adding or changing `DATABASE_URL`, you
need to trigger a fresh deploy (Deployments → "..." → Redeploy, or push a
commit) for it to take effect.

## Weekly workflow

1. Run your saved Finviz screens (AI infra/semis, non-tech asymmetric, SGX
   gap-fill by hand).
2. For each new ticker, click **+ Add Candidate** and log the date scanned,
   theme, and a one-line trigger reason.
3. The dashboard highlights entries from the most recent scan date and lets
   you filter by theme/status and sort by date.
4. Once you've researched a name elsewhere (Claude chat, etc.), flip its
   status to "Researched" (or further along) directly from the table —
   no separate edit screen needed for status changes.

## Research agent

See `docs/research-agent-scope.md` for the full scope, phases, and
boundaries. The pipeline itself (`src/lib/research/`) is three LLM agents —
Fundamentals (SEC EDGAR), Technicals (Yahoo Finance via `yahoo-finance2`),
and a Synthesizer that produces the scorecard — shared between two entry
points. Model calls run on **Groq's free tier** (no cost) rather than a paid
API, using `llama-3.3-70b-versatile`.

**CLI (Phase 1) — no database, prints and saves to a local file:**

```
export GROQ_API_KEY=...   # free key: console.groq.com
npm run research -- NVDA AMD CCJ
```

Scorecards print to the console and save to
`docs/research-runs/<ticker>-<date>.json` (gitignored — local review only).

**Dashboard (Phase 2) — writes to Postgres, shown on the candidate page:**

1. Set `GROQ_API_KEY` in Vercel's environment variables (Production).
2. Open a candidate from the dashboard table (**Research** link) — this goes
   to `/candidates/[id]`.
3. Click **Run Research**. This calls `POST /api/candidates/[id]/research`,
   which runs the same three agents server-side and saves the result as a
   `Scorecard` row linked to that candidate. Past runs stay visible on the
   same page (a candidate can be re-researched over time; each run adds a
   new scorecard rather than overwriting the last one).

Data sources: SEC EDGAR (free, no key, US-listed filers only — SGX names are
out of scope per the scope doc) and Yahoo Finance (free, unofficial — can
break without notice).

**Vercel timeout note:** the research route runs three sequential model
calls plus two data fetches, which can take 15–30+ seconds. It's set to
`maxDuration = 60` (App Router route config), but Vercel's Hobby tier has
capped function duration in the past — if the button times out in
production, the CLI path above still works as a fallback.

**Groq free-tier note:** rate limits are generous for manual, one-ticker-at-a-time
use but not unlimited — if you hit a rate-limit error running several
tickers back to back, wait a minute and retry.
