"use client";

import { useState } from "react";
import { Scorecard } from "@/lib/types";
import { ScorecardCard } from "./ScorecardCard";

type Props = {
  candidateId: string;
  initialScorecards: Scorecard[];
};

export function ResearchPanel({ candidateId, initialScorecards }: Props) {
  const [scorecards, setScorecards] = useState(initialScorecards);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRunResearch() {
    setRunning(true);
    setError(null);

    const res = await fetch(`/api/candidates/${candidateId}/research`, { method: "POST" });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Research run failed — check server logs.");
      setRunning(false);
      return;
    }

    const scorecard: Scorecard = await res.json();
    setScorecards((prev) => [scorecard, ...prev]);
    setRunning(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Research scorecards</h2>
        <button
          onClick={handleRunResearch}
          disabled={running}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {running ? "Running… (can take a minute)" : "Run Research"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-4 space-y-4">
        {scorecards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
            No research runs yet. Click &ldquo;Run Research&rdquo; to generate the first
            scorecard.
          </div>
        ) : (
          scorecards.map((sc) => <ScorecardCard key={sc.id} scorecard={sc} />)
        )}
      </div>
    </div>
  );
}
