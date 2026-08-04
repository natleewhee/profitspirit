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
