"use client";

import Link from "next/link";
import { useState } from "react";
import { Candidate } from "@/lib/types";
import { Status } from "@/generated/prisma";
import { THEME_LABELS, STATUS_OPTIONS } from "@/lib/labels";
import { StatusBadge } from "./StatusBadge";

type SortKey = "dateScanned" | "ticker" | "theme";

type Props = {
  candidates: Candidate[];
  latestDate: string | null;
  onStatusChange: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CandidateTable({ candidates, latestDate, onStatusChange, onDelete }: Props) {
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
      <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
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
            <Th onClick={() => toggleSort("dateScanned")}>Date Scanned</Th>
            <Th onClick={() => toggleSort("theme")}>Theme</Th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">Trigger Reason</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
            <th className="px-4 py-2 text-left font-medium text-gray-500">Notes</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {sorted.map((c) => {
            const isNew = latestDate && c.dateScanned.slice(0, 10) === latestDate.slice(0, 10);
            return (
              <tr key={c.id} className={isNew ? "bg-blue-50/60" : undefined}>
                <td className="whitespace-nowrap px-4 py-2 font-semibold">
                  {c.ticker}
                  {isNew && (
                    <span className="ml-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      NEW
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                  {formatDate(c.dateScanned)}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-gray-600">
                  {THEME_LABELS[c.theme]}
                </td>
                <td className="px-4 py-2 text-gray-700">{c.triggerReason}</td>
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
                  <div className="mt-0.5">
                    <StatusBadge status={c.status} />
                  </div>
                </td>
                <td className="max-w-xs truncate px-4 py-2 text-gray-500" title={c.notes ?? ""}>
                  {c.notes}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right">
                  <Link
                    href={`/candidates/${c.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => onDelete(c.id)}
                    className="ml-3 text-gray-400 hover:text-red-600"
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
      className="cursor-pointer select-none whitespace-nowrap px-4 py-2 text-left font-medium text-gray-500 hover:text-gray-700"
      onClick={onClick}
    >
      {children} ↕
    </th>
  );
}
