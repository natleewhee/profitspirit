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
   (local Postgres, or a free Neon database — see deploy steps below).
3. Apply the schema: `npx prisma migrate dev`
4. Run the app: `npm run dev` and open http://localhost:3000

## Deploying for free (Vercel + Neon)

This app has no built-in auth — it's meant for personal, single-user use
behind an unlisted URL. Two free-tier services get you a persistent, always-
on dashboard with no cost and no local machine dependency:

1. **Create a Neon Postgres database** (https://neon.tech, free tier):
   - Sign up / log in, create a new project.
   - Copy the connection string it gives you (starts with `postgresql://...`,
     includes `?sslmode=require`).

2. **Push this repo to GitHub** (already done if you're reading this from
   the repo) and **import it into Vercel** (https://vercel.com, free tier):
   - "New Project" → import the `profitspirit` repo.
   - Under Environment Variables, add `DATABASE_URL` with the Neon
     connection string from step 1.
   - Deploy.

3. **Run the migration against the Neon database once**, from your machine
   or this environment:
   ```
   DATABASE_URL="<your neon connection string>" npx prisma migrate deploy
   ```
   This creates the `Candidate` table on the hosted database. Re-run this
   any time you add a new migration.

4. Visit the URL Vercel gives you — that's your always-viewable dashboard.

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
