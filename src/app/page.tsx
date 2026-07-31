"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Candidate } from "@/lib/types";
import { Status } from "@prisma/client";
import { CandidateTable } from "@/components/CandidateTable";
import { FilterBar } from "@/components/FilterBar";

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (theme !== "ALL") params.set("theme", theme);
    if (status !== "ALL") params.set("status", status);
    const res = await fetch(`/api/candidates?${params.toString()}`);
    const data = await res.json();
    setCandidates(data);
    setLoading(false);
  }, [theme, status]);

  useEffect(() => {
    load();
  }, [load]);

  const latestDate = useMemo(() => {
    if (candidates.length === 0) return null;
    return candidates.reduce(
      (max, c) => (c.dateScanned > max ? c.dateScanned : max),
      candidates[0].dateScanned
    );
  }, [candidates]);

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Scan Candidates Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
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

      <div className="mt-6 flex items-center justify-between">
        <FilterBar
          theme={theme}
          status={status}
          onThemeChange={setTheme}
          onStatusChange={setStatus}
        />
        <span className="text-sm text-gray-400">
          {candidates.length} candidate{candidates.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
        ) : (
          <CandidateTable
            candidates={candidates}
            latestDate={latestDate}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        )}
      </div>
    </main>
  );
}
