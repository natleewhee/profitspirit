import { Scorecard } from "@/lib/types";
import {
  CONFIDENCE_LABELS,
  RECOMMENDATION_LABELS,
  DATA_QUALITY_LABELS,
  RISK_LEVEL_LABELS,
  VALUATION_VERDICT_LABELS,
} from "@/lib/labels";

const CONFIDENCE_STYLES: Record<Scorecard["confidenceRead"], string> = {
  LOW: "bg-gray-200 text-gray-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-green-100 text-green-800",
};

const RECOMMENDATION_BORDER: Record<Scorecard["recommendation"], string> = {
  WATCH: "border-l-blue-500",
  RESEARCH_FURTHER: "border-l-purple-500",
  PASS: "border-l-gray-400",
};

const DATA_QUALITY_STYLES: Record<Scorecard["dataQuality"], string> = {
  THIN: "bg-red-50 text-red-700",
  ADEQUATE: "bg-slate-100 text-slate-700",
  RICH: "bg-slate-100 text-slate-700",
};

const RISK_LEVEL_STYLES: Record<Scorecard["riskLevel"], string> = {
  LOW: "bg-green-100 text-green-800",
  MEDIUM: "bg-amber-100 text-amber-800",
  HIGH: "bg-red-100 text-red-800",
};

const VALUATION_VERDICT_STYLES: Record<Scorecard["valuationVerdict"], string> = {
  UNDERVALUED: "bg-green-100 text-green-800",
  OVERVALUED: "bg-red-100 text-red-800",
  FAIRLY_VALUED: "bg-blue-100 text-blue-800",
  INSUFFICIENT_DATA: "bg-gray-200 text-gray-800",
};

function scoreStyles(score: number | null): string {
  if (score === null) return "bg-gray-200 text-gray-700";
  if (score >= 65) return "bg-green-100 text-green-800";
  if (score >= 35) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

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
    <div
      className={`rounded-lg border border-gray-200 border-l-4 p-4 ${RECOMMENDATION_BORDER[scorecard.recommendation]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
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
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Fundamentals
          </h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
            {scorecard.fundamentalsSummary}
          </p>
        </div>
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
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
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Risk flags
          </h4>
          <ul className="mt-1 list-inside list-disc text-sm text-gray-700">
            {scorecard.riskFlags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 rounded-md bg-gray-50 p-3">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>
            <span className="text-gray-600">Entry estimate: </span>
            <span className="font-medium text-gray-900">
              {formatPrice(scorecard.entryPriceEstimate)}
            </span>
          </span>
          <span>
            <span className="text-gray-600">Intrinsic value: </span>
            <span className="font-medium text-gray-900">
              {formatPrice(scorecard.fairValueEstimate)}
            </span>
          </span>
          {scorecard.currentPrice !== null && (
            <span>
              <span className="text-gray-600">Current price: </span>
              <span className="font-medium text-gray-900">
                {formatPrice(scorecard.currentPrice)}
              </span>
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-600">{scorecard.targetsBasis}</p>
      </div>
    </div>
  );
}
