import { Scorecard } from "@/lib/types";
import { CONFIDENCE_LABELS, RECOMMENDATION_LABELS } from "@/lib/labels";

const CONFIDENCE_STYLES: Record<Scorecard["confidenceRead"], string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-green-100 text-green-800",
};

const RECOMMENDATION_STYLES: Record<Scorecard["recommendation"], string> = {
  WATCH: "bg-blue-100 text-blue-800",
  RESEARCH_FURTHER: "bg-purple-100 text-purple-800",
  PASS: "bg-gray-100 text-gray-500",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPrice(value: number | null) {
  return value === null ? "insufficient data" : `$${value.toFixed(2)}`;
}

export function ScorecardCard({ scorecard }: { scorecard: Scorecard }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-gray-400">As of {formatDate(scorecard.asOf)}</span>
        <div className="flex gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RECOMMENDATION_STYLES[scorecard.recommendation]}`}
          >
            {RECOMMENDATION_LABELS[scorecard.recommendation]}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[scorecard.confidenceRead]}`}
          >
            {CONFIDENCE_LABELS[scorecard.confidenceRead]}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Fundamentals
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
            {scorecard.fundamentalsSummary}
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Technicals
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
            {scorecard.technicalsSummary}
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Bull case
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{scorecard.bullCase}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Bear case
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{scorecard.bearCase}</p>
        </div>
      </div>

      {scorecard.riskFlags.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Risk flags
          </h4>
          <ul className="mt-1 list-inside list-disc text-sm text-gray-700">
            {scorecard.riskFlags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-gray-100 pt-3 text-sm">
        <span>
          <span className="text-gray-500">Entry estimate: </span>
          {formatPrice(scorecard.entryPriceEstimate)}
        </span>
        <span>
          <span className="text-gray-500">Fair value estimate: </span>
          {formatPrice(scorecard.fairValueEstimate)}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-400">{scorecard.targetsBasis}</p>
    </div>
  );
}
