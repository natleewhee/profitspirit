"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CandidateWithLatest, LiveQuote } from "@/lib/types";
import { Status, ValuationVerdict } from "@prisma/client";
import { CandidateTable } from "@/components/CandidateTable";
import { FilterBar, DEFAULT_FILTERS, Filters } from "@/components/FilterBar";
import { WATCH_THRESHOLD } from "@/lib/research/score";
import { stalenessLevel } from "@/lib/ui";

const PASSIVE_STATUSES: Status[] = ["PASSED", "ADDED_TO_PORTFOLIO"];

function filtersFromParams(params: URLSearchParams): Filters {
  return {
    q: params.get("q") ?? DEFAULT_FILTERS.q,
    theme: params.get("theme") ?? DEFAULT_FILTERS.theme,
    status: params.get("status") ?? DEFAULT_FILTERS.status,
    verdict: params.get("verdict") ?? DEFAULT_FILTERS.verdict,
    research: (params.get("research") as Filters["research"]) ?? DEFAULT_FILTERS.research,
    minScore: Number(params.get("minScore") ?? DEFAULT_FILTERS.minScore),
  };
}

function paramsFromFilters(filters: Filters, extra: Record<string, string | null>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.theme !== "ALL") params.set("theme", filters.theme);
  if (filters.status !== "ALL") params.set("status", filters.status);
  if (filters.verdict !== "ALL") params.set("verdict", filters.verdict);
  if (filters.research !== "ALL") params.set("research", filters.research);
  if (filters.minScore > 0) params.set("minScore", String(filters.minScore));
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const onlyLatestScan = searchParams.get("scan") === "latest";
  const actionableOnly = searchParams.get("quick") === "actionable";

  const [candidates, setCandidates] = useState<CandidateWithLatest[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuote>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/candidates");
    const data = await res.json();
    setCandidates(data);
    setLoading(false);
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
      const res = await fetch(`/api/quotes?tickers=${encodeURIComponent(tickerKey)}`);
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled) setLiveQuotes(data);
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
      ...extra,
    };
    const qs = paramsFromFilters(nextFilters, currentExtra);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function resetFilters() {
    router.replace(pathname, { scroll: false });
  }

  function toggleTile(next: Record<string, string | null>) {
    // Clicking an already-active tile clears back to no filters at all;
    // otherwise it replaces the whole filter set with just this tile's slice.
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const nextQs = params.toString();
    const currentQs = searchParams.toString();
    if (nextQs === currentQs) {
      router.replace(pathname, { scroll: false });
    } else {
      router.replace(nextQs ? `${pathname}?${nextQs}` : pathname, { scroll: false });
    }
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
      if (filters.theme !== "ALL" && c.theme !== filters.theme) return false;
      if (filters.status !== "ALL" && c.status !== filters.status) return false;

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

  const isFiltered =
    JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS) || onlyLatestScan || actionableOnly;

  async function handleStatusChange(id: string, newStatus: Status) {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    await fetch(`/api/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this candidate?")) return;
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/candidates/${id}`, { method: "DELETE" });
  }

  async function handleRunResearch(id: string) {
    setRunningIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/candidates/${id}/research`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Research run failed — check server logs.");
        return;
      }
      // Simplest correct option: refetch the list rather than reconstruct
      // the nested scorecard shape client-side.
      await load();
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Scan Candidates Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Weekly Finviz scan output, logged by theme and scan date.
          </p>
        </div>
        <Link
          href="/candidates/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Add Candidate
        </Link>
      </div>

      {!loading && candidates.length > 0 && (
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
        <span className="whitespace-nowrap text-sm text-gray-600">
          {filtered.length} of {candidates.length} candidate
          {candidates.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-600">Loading…</div>
        ) : (
          <CandidateTable
            candidates={filtered}
            latestDate={latestDate}
            runningIds={runningIds}
            liveQuotes={liveQuotes}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
            onRunResearch={handleRunResearch}
          />
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
          ? "border-blue-500 bg-blue-50"
          : highlight && value > 0
            ? "border-green-200 bg-green-50 hover:border-green-400"
            : "border-gray-200 bg-white hover:border-gray-400"
      }`}
    >
      <div
        className={`text-lg font-semibold ${
          highlight && value > 0 && !active ? "text-green-700" : "text-gray-900"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-gray-600">{label}</div>
    </button>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-gray-600">Loading…</main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
