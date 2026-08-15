"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CandidateWithLatest, LiveQuote } from "@/lib/types";
import { Status, ValuationVerdict } from "@prisma/client";
import { CandidateTable } from "@/components/CandidateTable";
import { CandidateHoverPanel } from "@/components/CandidateHoverPanel";
import { FilterBar, DEFAULT_FILTERS, Filters, RESEARCH_STATE_VALUES } from "@/components/FilterBar";
import { AddCandidateModal } from "@/components/AddCandidateModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useRunResearch } from "@/hooks/useRunResearch";
import { WATCH_THRESHOLD } from "@/lib/research/score";
import { stalenessLevel } from "@/lib/ui";

// Status is no longer a dashboard-level filter (declutter — see FilterBar),
// but it still gates the "Actionable" tile: a name you've already marked
// Passed or moved to Portfolio shouldn't keep surfacing as an open decision.
const PASSIVE_STATUSES: Status[] = ["PASSED", "ADDED_TO_PORTFOLIO"];

// Sort lives in the URL (like filters) rather than component state, so
// re-fetching the candidate list (e.g. after "Run research") can't silently
// reset it — that required unmounting <CandidateTable>, which owned sort as
// local useState.
export type SortKey = "dateScanned" | "ticker" | "score" | "gap" | "researched";
const DEFAULT_SORT_KEY: SortKey = "dateScanned";
const DEFAULT_SORT_ASC = false;

const VALID_VERDICTS: string[] = ["ALL", ...Object.keys(ValuationVerdict)];
const VALID_MIN_SCORES = [0, 35, 50, 65];

// Cast straight from the URL used to accept anything (?verdict=BANANA
// silently produced an empty table while the filter UI kept showing "All
// verdicts") — validate against the known sets and fall back to defaults.
// See docs/dashboard-ux-review.md C5.
function filtersFromParams(params: URLSearchParams): Filters {
  const verdict = params.get("verdict");
  const research = params.get("research");
  const minScoreRaw = Number(params.get("minScore"));

  return {
    q: params.get("q") ?? DEFAULT_FILTERS.q,
    verdict: verdict && VALID_VERDICTS.includes(verdict) ? verdict : DEFAULT_FILTERS.verdict,
    research:
      research && RESEARCH_STATE_VALUES.includes(research as Filters["research"])
        ? (research as Filters["research"])
        : DEFAULT_FILTERS.research,
    minScore: VALID_MIN_SCORES.includes(minScoreRaw) ? minScoreRaw : DEFAULT_FILTERS.minScore,
  };
}

function paramsFromFilters(filters: Filters, extra: Record<string, string | null>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.verdict !== "ALL") params.set("verdict", filters.verdict);
  if (filters.research !== "ALL") params.set("research", filters.research);
  if (filters.minScore > 0) params.set("minScore", String(filters.minScore));
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

// In-memory cache that survives component remounts (but not full page
// reloads) — navigating to a detail/edit page and back unmounts
// DashboardContent, and without this every "back" refetched from scratch,
// showing a loading flash and losing scroll position in the process.
// Session-lifetime only, intentionally not persisted to storage.
let candidatesCache: CandidateWithLatest[] | null = null;
let liveQuotesCache: Record<string, LiveQuote> = {};

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const onlyLatestScan = searchParams.get("scan") === "latest";
  const actionableOnly = searchParams.get("quick") === "actionable";
  const sortKey = (searchParams.get("sort") as SortKey) ?? DEFAULT_SORT_KEY;
  const sortAsc = searchParams.get("dir") === "asc" ? true : searchParams.get("dir") === "desc" ? false : DEFAULT_SORT_ASC;

  const [candidates, setCandidates] = useState<CandidateWithLatest[]>(() => candidatesCache ?? []);
  // Distinguish the very first load (full-page "Loading…") from a refetch
  // after mutations (e.g. Run research) — previously both used the same
  // flag, which unmounted the table and threw away its state on every
  // refetch, mid-interaction. Also skipped entirely when a cached list is
  // already available from a previous mount this session.
  const [initialLoading, setInitialLoading] = useState(() => candidatesCache === null);
  const { run: runResearch, runningIds, error: researchError, clearError: clearResearchError } = useRunResearch();
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuote>>(() => liveQuotesCache);
  const [loadError, setLoadError] = useState(false);
  const [quotesError, setQuotesError] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; ticker: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/candidates");
      if (!res.ok) throw new Error("Failed to load candidates");
      const data = await res.json();
      candidatesCache = data;
      setCandidates(data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live prices are display-only (see api/quotes/route.ts) — fetched once
  // the ticker list is known, then refreshed on an interval while the tab is
  // open. Never touches the frozen research-time price used for the gap.
  const tickerKey = useMemo(
    () => Array.from(new Set(candidates.map((c) => c.ticker))).sort().join(","),
    [candidates]
  );

  useEffect(() => {
    if (!tickerKey) return;

    let cancelled = false;
    async function fetchQuotes() {
      try {
        const res = await fetch(`/api/quotes?tickers=${encodeURIComponent(tickerKey)}`);
        if (!res.ok) throw new Error("Failed to load quotes");
        const data = await res.json();
        if (!cancelled) {
          liveQuotesCache = data;
          setLiveQuotes(data);
          setQuotesError(false);
        }
      } catch {
        if (!cancelled) setQuotesError(true);
      }
    }

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tickerKey]);

  function updateUrl(patch: Partial<Filters>, extra: Record<string, string | null> = {}) {
    const nextFilters = { ...filters, ...patch };
    const currentExtra = {
      scan: onlyLatestScan ? "latest" : null,
      quick: actionableOnly ? "actionable" : null,
      sort: sortKey !== DEFAULT_SORT_KEY ? sortKey : null,
      dir: sortAsc !== DEFAULT_SORT_ASC ? "asc" : null,
      ...extra,
    };
    const qs = paramsFromFilters(nextFilters, currentExtra);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function resetFilters() {
    router.replace(pathname, { scroll: false });
  }

  function toggleSort(key: SortKey) {
    const nextAsc = key === sortKey ? !sortAsc : false;
    updateUrl({}, {
      sort: key !== DEFAULT_SORT_KEY ? key : null,
      dir: nextAsc !== DEFAULT_SORT_ASC ? "asc" : null,
    });
  }

  // Merges into the existing params (search/verdict/minScore/sort survive)
  // rather than replacing the whole query string — previously clicking a
  // tile silently wiped any typed search. See docs/dashboard-ux-review.md A9.
  // Tiles are mutually exclusive filter modes sharing "research"/"quick"/
  // "scan", so switching tiles clears the others rather than stacking.
  const TILE_KEYS = ["research", "quick", "scan"];
  function toggleTile(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    const keys = Object.keys(next);
    const alreadyActive = keys.every((k) => params.get(k) === next[k]);
    TILE_KEYS.forEach((k) => params.delete(k));
    if (!alreadyActive) {
      keys.forEach((k) => {
        const value = next[k];
        if (value) params.set(k, value);
      });
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const latestDate = useMemo(() => {
    if (candidates.length === 0) return null;
    return candidates.reduce(
      (max, c) => (c.dateScanned > max ? c.dateScanned : max),
      candidates[0].dateScanned
    );
  }, [candidates]);

  const needsResearchCount = useMemo(
    () => candidates.filter((c) => c.scorecardCount === 0).length,
    [candidates]
  );
  const staleCount = useMemo(
    () =>
      candidates.filter(
        (c) => c.scorecards[0] && stalenessLevel(c.scorecards[0].createdAt) === "stale"
      ).length,
    [candidates]
  );
  const actionableCount = useMemo(
    () =>
      candidates.filter((c) => {
        const latest = c.scorecards[0];
        if (!latest) return false;
        if (PASSIVE_STATUSES.includes(c.status)) return false;
        return (
          (latest.recommendationScore ?? 0) >= WATCH_THRESHOLD &&
          latest.valuationVerdict === "UNDERVALUED"
        );
      }).length,
    [candidates]
  );
  const lastScanCount = useMemo(
    () => (latestDate ? candidates.filter((c) => c.dateScanned === latestDate).length : 0),
    [candidates, latestDate]
  );

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      const latest = c.scorecards[0];

      if (onlyLatestScan && latestDate && c.dateScanned !== latestDate) return false;
      if (actionableOnly) {
        if (!latest) return false;
        if (PASSIVE_STATUSES.includes(c.status)) return false;
        if ((latest.recommendationScore ?? 0) < WATCH_THRESHOLD) return false;
        if (latest.valuationVerdict !== "UNDERVALUED") return false;
      }

      if (filters.q && !c.ticker.toUpperCase().includes(filters.q.toUpperCase())) return false;

      if (filters.research === "NEEDS" && c.scorecardCount > 0) return false;
      if (filters.research === "RESEARCHED" && c.scorecardCount === 0) return false;
      if (filters.research === "STALE" && (!latest || stalenessLevel(latest.createdAt) !== "stale"))
        return false;

      if (filters.verdict !== "ALL") {
        if (!latest || latest.valuationVerdict !== (filters.verdict as ValuationVerdict))
          return false;
      }

      if (filters.minScore > 0) {
        if (!latest || (latest.recommendationScore ?? 0) < filters.minScore) return false;
      }

      return true;
    });
  }, [candidates, filters, onlyLatestScan, actionableOnly, latestDate]);

  const hoveredCandidate = useMemo(
    () => filtered.find((c) => c.id === hoveredId) ?? filtered[0] ?? null,
    [filtered, hoveredId]
  );

  const isFiltered =
    filters.q !== DEFAULT_FILTERS.q ||
    filters.verdict !== DEFAULT_FILTERS.verdict ||
    filters.research !== DEFAULT_FILTERS.research ||
    filters.minScore !== DEFAULT_FILTERS.minScore ||
    onlyLatestScan ||
    actionableOnly;

  function handleDelete(id: string) {
    const ticker = candidates.find((c) => c.id === id)?.ticker ?? "this candidate";
    setDeleteTarget({ id, ticker });
  }

  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { id, ticker } = deleteTarget;
    setDeleteTarget(null);
    setDeleteError(null);
    const previous = candidates;
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setCandidates(previous);
      setDeleteError(`Failed to delete ${ticker} — check server logs.`);
    }
  }

  async function handleRunResearch(id: string) {
    // Simplest correct option: refetch the list rather than reconstruct the
    // nested scorecard shape client-side.
    const result = await runResearch(id);
    if (result) await load();
  }

  return (
    <main className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Candidates</h1>
        <AddCandidateModal onAdded={load} />
      </div>

      {loadError && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Couldn&rsquo;t load candidates.{" "}
          <button onClick={load} className="font-medium underline">
            Try again
          </button>
        </div>
      )}

      {researchError && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>{researchError}</span>
          <button onClick={clearResearchError} className="font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {deleteError && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError(null)} className="font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {quotesError && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Live prices unavailable — showing research-date prices only.
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove candidate"
        body={`Remove ${deleteTarget?.ticker ?? ""}? This can't be undone.`}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {!initialLoading && candidates.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DecisionTile
            label="Needs research"
            value={needsResearchCount}
            active={filters.research === "NEEDS"}
            onClick={() => toggleTile({ research: "NEEDS" })}
          />
          <DecisionTile
            label="Actionable"
            value={actionableCount}
            active={actionableOnly}
            highlight
            onClick={() => toggleTile({ quick: "actionable" })}
          />
          <DecisionTile
            label="Going stale"
            value={staleCount}
            active={filters.research === "STALE"}
            onClick={() => toggleTile({ research: "STALE" })}
          />
          <DecisionTile
            label="Last scan"
            value={lastScanCount}
            active={onlyLatestScan}
            onClick={() => toggleTile({ scan: "latest" })}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          filters={filters}
          onChange={updateUrl}
          onReset={resetFilters}
          isFiltered={isFiltered}
        />
        <span className="whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
          {filtered.length} of {candidates.length} candidate
          {candidates.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4">
        {initialLoading ? (
          <div className="p-10 text-center text-sm text-gray-600 dark:text-gray-400">Loading…</div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <CandidateTable
                candidates={filtered}
                latestDate={latestDate}
                runningIds={runningIds}
                liveQuotes={liveQuotes}
                isFiltered={isFiltered}
                sortKey={sortKey}
                sortAsc={sortAsc}
                onSort={toggleSort}
                onDelete={handleDelete}
                onRunResearch={handleRunResearch}
                onHover={setHoveredId}
              />
            </div>
            <div className="sticky top-20 hidden w-80 shrink-0 lg:block">
              <CandidateHoverPanel candidate={hoveredCandidate} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function DecisionTile({
  label,
  value,
  active,
  highlight,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-left transition ${
        active
          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
          : highlight && value > 0
            ? "border-green-200 bg-green-50 hover:border-green-400 dark:border-green-900 dark:bg-green-500/10 dark:hover:border-green-600"
            : "border-gray-200 bg-white hover:border-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600"
      }`}
    >
      <div
        className={`text-lg font-semibold ${
          highlight && value > 0 && !active
            ? "text-green-700 dark:text-green-400"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
    </button>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[1800px] px-4 py-8 text-sm text-gray-600 dark:text-gray-400 sm:px-6 lg:px-8">
          Loading…
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
