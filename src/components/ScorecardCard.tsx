import { Scorecard } from "@/lib/types";
import {
  CONFIDENCE_LABELS,
  RECOMMENDATION_LABELS,
  DATA_QUALITY_LABELS,
  RISK_LEVEL_LABELS,
  VALUATION_VERDICT_LABELS,
} from "@/lib/labels";
import {
  CONFIDENCE_STYLES,
  RECOMMENDATION_BORDER,
  DATA_QUALITY_STYLES,
  RISK_LEVEL_STYLES,
  VALUATION_VERDICT_STYLES,
  scoreStyles,
  formatDate,
  formatPrice,
} from "@/lib/ui";

export function ScorecardCard({ scorecard }: { scorecard: Scorecard }) {
  return (
    <div
      className={`rounded-lg border border-gray-200 border-l-4 p-4 dark:border-gray-800 ${RECOMMENDATION_BORDER[scorecard.recommendation]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
          <span>As of {formatDate(scorecard.asOf)}</span>
          {scorecard.currentPrice !== null && (
            <span>Price at research: {formatPrice(scorecard.currentPrice)}</span>
          )}
          {(scorecard.sector || scorecard.industry) && (
            <span>{[scorecard.sector, scorecard.industry].filter(Boolean).join(" / ")}</span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${DATA_QUALITY_STYLES[scorecard.dataQuality]}`}
          >
            {DATA_QUALITY_LABELS[scorecard.dataQuality]}
          </span>
        </div>

        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${scoreStyles(scorecard.recommendationScore)}`}
        >
          <span className="text-2xl font-bold leading-none">
            {scorecard.recommendationScore ?? "—"}
          </span>
          <div className="text-xs leading-tight">
            <div className="font-semibold">{RECOMMENDATION_LABELS[scorecard.recommendation]}</div>
            <div>score / 100</div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${VALUATION_VERDICT_STYLES[scorecard.valuationVerdict]}`}
        >
          {VALUATION_VERDICT_LABELS[scorecard.valuationVerdict]}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLES[scorecard.riskLevel]}`}
        >
          {RISK_LEVEL_LABELS[scorecard.riskLevel]}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[scorecard.confidenceRead]}`}
        >
          {CONFIDENCE_LABELS[scorecard.confidenceRead]}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Fundamentals
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
            {scorecard.fundamentalsSummary}
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Technicals
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
            {scorecard.technicalsSummary}
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
            Bull case
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{scorecard.bullCase}</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
            Bear case
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{scorecard.bearCase}</p>
        </div>
      </div>

      {scorecard.riskFlags.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Risk flags
          </h4>
          <ul className="mt-1 list-inside list-disc text-sm text-gray-700 dark:text-gray-300">
            {scorecard.riskFlags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 rounded-md bg-gray-50 p-3 dark:bg-gray-800/50">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>
            <span className="text-gray-600 dark:text-gray-400">Entry estimate: </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatPrice(scorecard.entryPriceEstimate)}
            </span>
          </span>
          <span>
            <span className="text-gray-600 dark:text-gray-400">Intrinsic value: </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {formatPrice(scorecard.fairValueEstimate)}
            </span>
          </span>
          {scorecard.currentPrice !== null && (
            <span>
              <span className="text-gray-600 dark:text-gray-400">Current price: </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatPrice(scorecard.currentPrice)}
              </span>
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{scorecard.targetsBasis}</p>
      </div>
    </div>
  );
}
