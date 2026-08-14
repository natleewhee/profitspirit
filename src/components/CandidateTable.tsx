"use client";

import Link from "next/link";
import { useState } from "react";
import { CandidateWithLatest } from "@/lib/types";
import { Status, ConfidenceRead } from "@prisma/client";
import {
  STATUS_OPTIONS,
  RECOMMENDATION_LABELS,
  VALUATION_VERDICT_LABELS,
  RISK_LEVEL_LABELS,
} from "@/lib/labels";
import {
  RECOMMENDATION_BORDER,
  VALUATION_VERDICT_STYLES,
  RISK_LEVEL_STYLES,
  scoreStyles,
  scoreBarStyle,
  formatPrice,
  formatGap,
  formatRelativeDate,
  stalenessLevel,
  STALENESS_TEXT_STYLES,
} from "@/lib/ui";

type SortKey = "dateScanned" | "ticker";

type Props = {
  candidates: CandidateWithLatest[];
  latestDate: string | null;
  runningIds: Set<string>;
  onStatusChange: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
  onRunResearch: (id: string) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const CONFIDENCE_DOT_COUNT: Record<ConfidenceRead, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

function ConfidenceDots({ confidence }: { confidence: ConfidenceRead }) {
  const filled = CONFIDENCE_DOT_COUNT[confidence];
  return (
    <span className="inline-flex items-center gap-0.5" title={`${confidence} confidence`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i <= filled ? "bg-gray-700" : "bg-gray-300"}`}
        />
      ))}
    </span>
  );
}

function DeltaChip({ latest, previous }: { latest: number | null; previous: number | null }) {
  if (latest === null || previous === null) return null;
  const diff = latest - previous;
  if (diff === 0) return <span className="text-xs text-gray-500">→ 0</span>;
  const up = diff > 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-green-700" : "text-red-700"}`}>
      {up ? "▲" : "▼"} {up ? "+" : ""}
      {diff}
    </span>
  );
}

export function CandidateTable({
  candidates,
  latestDate,
  runningIds,
  onStatusChange,
  onDelete,
  onRunResearch,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("dateScanned");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...candidates].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "dateScanned") {
      cmp = new Date(a.dateScanned).getTime() - new Date(b.dateScanned).getTime();
    } else {
      cmp = a[sortKey].localeCompare(b[sortKey]);
    }
    return sortAsc ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-600">
        No candidates match these filters yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <Th onClick={() => toggleSort("ticker")}>Ticker</Th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Score</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Call</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Valuation</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Price</th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Risk</th>
            <Th onClick={() => toggleSort("dateScanned")}>Researched</Th>
            <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {sorted.map((c) => {
            const isNew = latestDate && c.dateScanned.slice(0, 10) === latestDate.slice(0, 10);
            const latest = c.scorecards[0];
            const previous = c.scorecards[1];
            const running = runningIds.has(c.id);

            const rowBorder = latest ? RECOMMENDATION_BORDER[latest.recommendation] : "border-l-gray-200";

            return (
              <tr key={c.id} className={`border-l-4 ${rowBorder} ${isNew ? "bg-blue-50/60" : ""}`}>
                <td className="whitespace-nowrap px-4 py-2">
                  <div className="font-semibold text-gray-900">
                    {c.ticker}
                    {isNew && (
                      <span className="ml-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        NEW
                      </span>
                    )}
                  </div>
                  {latest?.sector && <div className="text-xs text-gray-500">{latest.sector}</div>}
                </td>

                {c.scorecardCount === 0 ? (
                  <td colSpan={6} className="px-4 py-2 text-gray-600">
                    <div className="flex items-center gap-3">
                      <span>Not researched yet</span>
                      <button
                        onClick={() => onRunResearch(c.id)}
                        disabled={running}
                        className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {running ? "Running… (up to a minute)" : "Run research"}
                      </button>
                    </div>
                  </td>
                ) : (
                  <>
                    <td className="whitespace-nowrap px-4 py-2">
                      <div
                        className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-bold ${scoreStyles(latest.recommendationScore)}`}
                      >
                        {latest.recommendationScore ?? "—"}
                      </div>
                      <div className="mt-1 h-1 w-16 rounded-full bg-gray-200">
                        <div
                          className={`h-1 rounded-full ${scoreBarStyle(latest.recommendationScore)}`}
                          style={{ width: `${latest.recommendationScore ?? 0}%` }}
                        />
                      </div>
                      <DeltaChip
                        latest={latest.recommendationScore}
                        previous={previous?.recommendationScore ?? null}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                      {RECOMMENDATION_LABELS[latest.recommendation]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${VALUATION_VERDICT_STYLES[latest.valuationVerdict]}`}
                      >
                        {VALUATION_VERDICT_LABELS[latest.valuationVerdict]}
                      </span>
                      <div className="mt-0.5 text-xs text-gray-600">
                        {formatGap(latest.currentPrice, latest.fairValueEstimate)}
                        {latest.fairValueEstimate !== null &&
                          ` vs ${formatPrice(latest.fairValueEstimate)}`}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <div className="text-gray-900">{formatPrice(latest.currentPrice)}</div>
                      {latest.entryPriceEstimate !== null && (
                        <div className="text-xs text-gray-500">
                          → {formatPrice(latest.entryPriceEstimate)} entry
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLES[latest.riskLevel]}`}
                      >
                        {RISK_LEVEL_LABELS[latest.riskLevel]}
                      </span>
                      <div className="mt-1">
                        <ConfidenceDots confidence={latest.confidenceRead} />
                      </div>
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-2 ${STALENESS_TEXT_STYLES[stalenessLevel(latest.createdAt)]}`}
                      title={`Last researched ${formatDate(latest.createdAt)}`}
                    >
                      {formatRelativeDate(latest.createdAt)}
                    </td>
                  </>
                )}

                <td className="whitespace-nowrap px-4 py-2">
                  <select
                    className="rounded border-none bg-transparent text-xs focus:ring-1 focus:ring-blue-400"
                    value={c.status}
                    onChange={(e) => onStatusChange(c.id, e.target.value as Status)}
                  >
                    {STATUS_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right">
                  <Link href={`/candidates/${c.id}`} className="text-blue-600 hover:underline">
                    Detail
                  </Link>
                  <Link
                    href={`/candidates/${c.id}/edit`}
                    className="ml-3 text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="ml-3 text-gray-500 hover:text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <th
      className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-left font-medium text-gray-600 hover:text-gray-900"
      onClick={onClick}
    >
      {children} ↕
    </th>
  );
}
