"use client";

import { useState } from "react";
import { Scorecard } from "@/lib/types";
import { ScorecardCard } from "./ScorecardCard";
import {
  RECOMMENDATION_LABELS,
  VALUATION_VERDICT_LABELS,
  RISK_LEVEL_LABELS,
} from "@/lib/labels";
import {
  scoreStyles,
  VALUATION_VERDICT_STYLES,
  RISK_LEVEL_STYLES,
  formatDate,
} from "@/lib/ui";

type Props = {
  candidateId: string;
  initialScorecards: Scorecard[];
};

export function ResearchPanel({ candidateId, initialScorecards }: Props) {
  const [scorecards, setScorecards] = useState(initialScorecards);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the latest run starts expanded; older runs are one-line headers.
  const [expandedId, setExpandedId] = useState<string | null>(
    initialScorecards[0]?.id ?? null
  );

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
    setExpandedId(scorecard.id);
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

      <div className="mt-4 space-y-3">
        {scorecards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600">
            No research runs yet. Click &ldquo;Run Research&rdquo; to generate the first
            scorecard.
          </div>
        ) : (
          scorecards.map((sc, i) => {
            const expanded = expandedId === sc.id;
            const previous = scorecards[i + 1];
            return expanded ? (
              <div key={sc.id}>
                <button
                  onClick={() => setExpandedId(null)}
                  className="mb-1 text-xs text-gray-500 hover:text-gray-800"
                >
                  ▾ Collapse
                </button>
                <ScorecardCard scorecard={sc} />
              </div>
            ) : (
              <HistoryRow
                key={sc.id}
                scorecard={sc}
                previous={previous}
                onExpand={() => setExpandedId(sc.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  scorecard,
  previous,
  onExpand,
}: {
  scorecard: Scorecard;
  previous?: Scorecard;
  onExpand: () => void;
}) {
  const delta =
    previous && scorecard.recommendationScore !== null && previous.recommendationScore !== null
      ? scorecard.recommendationScore - previous.recommendationScore
      : null;

  return (
    <button
      onClick={onExpand}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50"
    >
      <span className="text-gray-600">{formatDate(scorecard.asOf)}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-xs font-bold ${scoreStyles(scorecard.recommendationScore)}`}
      >
        {scorecard.recommendationScore ?? "—"}
      </span>
      {delta !== null && delta !== 0 && (
        <span className={`text-xs font-medium ${delta > 0 ? "text-green-700" : "text-red-700"}`}>
          {delta > 0 ? "▲" : "▼"} {delta > 0 ? "+" : ""}
          {delta}
        </span>
      )}
      <span className="text-gray-700">{RECOMMENDATION_LABELS[scorecard.recommendation]}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${VALUATION_VERDICT_STYLES[scorecard.valuationVerdict]}`}
      >
        {VALUATION_VERDICT_LABELS[scorecard.valuationVerdict]}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLES[scorecard.riskLevel]}`}
      >
        {RISK_LEVEL_LABELS[scorecard.riskLevel]}
      </span>
      <span className="ml-auto text-xs text-blue-600">Expand ▸</span>
    </button>
  );
}
