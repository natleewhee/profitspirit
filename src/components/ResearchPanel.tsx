"use client";

import { useState } from "react";
import { Scorecard } from "@/lib/types";
import { ScorecardCard } from "./ScorecardCard";
import { useRunResearch } from "@/hooks/useRunResearch";
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
  RUNNING_RESEARCH_LABEL,
} from "@/lib/ui";

type Props = {
  candidateId: string;
  initialScorecards: Scorecard[];
};

export function ResearchPanel({ candidateId, initialScorecards }: Props) {
  const [scorecards, setScorecards] = useState(initialScorecards);
  const { run, runningIds, error } = useRunResearch();
  const running = runningIds.has(candidateId);
  // Only the latest run starts expanded; older runs are one-line headers.
  const [expandedId, setExpandedId] = useState<string | null>(
    initialScorecards[0]?.id ?? null
  );

  async function handleRunResearch() {
    const scorecard = await run(candidateId);
    if (scorecard) {
      setScorecards((prev) => [scorecard, ...prev]);
      setExpandedId(scorecard.id);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Research scorecards</h2>
        <button
          onClick={handleRunResearch}
          disabled={running}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          {running ? RUNNING_RESEARCH_LABEL : "Run Research"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>
      )}

      <div className="mt-4 space-y-3">
        {scorecards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
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
                  className="mb-1 text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
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
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
    >
      <span className="text-gray-600 dark:text-gray-400">{formatDate(scorecard.asOf)}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-xs font-bold ${scoreStyles(scorecard.recommendationScore)}`}
      >
        {scorecard.recommendationScore ?? "—"}
      </span>
      {delta !== null && delta !== 0 && (
        <span className={`text-xs font-medium ${delta > 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
          {delta > 0 ? "▲" : "▼"} {delta > 0 ? "+" : ""}
          {delta}
        </span>
      )}
      <span className="text-gray-700 dark:text-gray-300">{RECOMMENDATION_LABELS[scorecard.recommendation]}</span>
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
      <span className="ml-auto text-xs text-blue-600 dark:text-blue-400">Expand ▸</span>
    </button>
  );
}
