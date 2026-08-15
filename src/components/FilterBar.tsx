"use client";

import { VALUATION_VERDICT_LABELS } from "@/lib/labels";
import { WATCH_THRESHOLD, RESEARCH_FURTHER_THRESHOLD } from "@/lib/research/score";

export type ResearchStateFilter = "ALL" | "NEEDS" | "RESEARCHED" | "STALE";

export type Filters = {
  q: string;
  verdict: string;
  research: ResearchStateFilter;
  minScore: number;
};

export const DEFAULT_FILTERS: Filters = {
  q: "",
  verdict: "ALL",
  research: "ALL",
  minScore: 0,
};

const MIN_SCORE_PRESETS = [0, RESEARCH_FURTHER_THRESHOLD, 50, WATCH_THRESHOLD];

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  isFiltered: boolean;
};

export function FilterBar({ filters, onChange, onReset, isFiltered }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        placeholder="Search ticker…"
        value={filters.q}
        onChange={(e) => onChange({ q: e.target.value })}
        className="w-36 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
      />

      <label className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Research</span>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={filters.research}
          onChange={(e) => onChange({ research: e.target.value as ResearchStateFilter })}
        >
          <option value="ALL">All</option>
          <option value="NEEDS">Needs research</option>
          <option value="RESEARCHED">Researched</option>
          <option value="STALE">Stale (&gt;60d)</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Verdict</span>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={filters.verdict}
          onChange={(e) => onChange({ verdict: e.target.value })}
        >
          <option value="ALL">All verdicts</option>
          {Object.entries(VALUATION_VERDICT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Min score</span>
        <select
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          value={filters.minScore}
          onChange={(e) => onChange({ minScore: Number(e.target.value) })}
        >
          {MIN_SCORE_PRESETS.map((p) => (
            <option key={p} value={p}>
              {p === 0 ? "Any" : `${p}+`}
            </option>
          ))}
        </select>
      </label>

      {isFiltered && (
        <button onClick={onReset} className="text-sm text-blue-600 hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
