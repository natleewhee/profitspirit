"use client";

import Link from "next/link";
import { CandidateWithLatest, LiveQuote } from "@/lib/types";
import { ConfidenceRead } from "@prisma/client";
import { STATUS_LABELS, VALUATION_VERDICT_LABELS } from "@/lib/labels";
import {
  RECOMMENDATION_BORDER,
  VALUATION_VERDICT_STYLES,
  scoreStyles,
  scoreBarStyle,
  qualityStyles,
  qualityBarStyle,
  RISK_SCORE_DOT_STYLES,
  formatPrice,
  formatGap,
  formatRelativeDate,
  formatDateTime,
  stalenessLevel,
  STALENESS_TEXT_STYLES,
  VALUATION_CELL_OPACITY,
  formatAsOfTooltip,
  formatEntryZone,
  formatEntryDistance,
  format52WeekPosition,
  formatTrend,
  formatMarketCap,
  formatEarningsProximity,
  formatCouncilConsensus,
  councilConsensusStyles,
} from "@/lib/ui";
import { computeValuationGapPct } from "@/lib/research/gap";
import { deriveRiskLevel } from "@/lib/research/risk";
import type { SortKey } from "@/app/page";

type Props = {
  candidates: CandidateWithLatest[];
  latestDate: string | null;
  runningIds: Set<string>;
  liveQuotes: Record<string, LiveQuote>;
  isFiltered: boolean;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  onDelete: (id: string) => void;
  onRunResearch: (id: string) => void;
  onHover?: (id: string) => void;
};

function LivePriceChip({ quote }: { quote: LiveQuote | undefined }) {
  if (!quote || quote.regularMarketPrice === null) return null;

  const up = (quote.regularMarketChangePercent ?? 0) >= 0;
  const changeColor = up ? "text-green-700" : "text-red-700";

  return (
    <div>
      <span className="font-semibold text-gray-900">{formatPrice(quote.regularMarketPrice)}</span>{" "}
      {quote.regularMarketChangePercent !== null && (
        <span className={`text-xs font-medium ${changeColor}`}>
          {up ? "+" : ""}
          {quote.regularMarketChangePercent.toFixed(2)}%
        </span>
      )}
      {quote.prePostLabel && quote.prePostPrice !== null && (
        <div className="text-xs text-gray-500">
          {quote.prePostLabel}: {formatPrice(quote.prePostPrice)}
          {quote.prePostChangePercent !== null && (
            <span className={quote.prePostChangePercent >= 0 ? "text-green-700" : "text-red-700"}>
              {" "}
              {quote.prePostChangePercent >= 0 ? "+" : ""}
              {quote.prePostChangePercent.toFixed(2)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
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

function RiskDots({ riskScore }: { riskScore: number | null }) {
  const level = deriveRiskLevel(riskScore);
  const filled = riskScore ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5" title={`Risk ${riskScore ?? "—"}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i <= filled ? RISK_SCORE_DOT_STYLES[level] : "bg-gray-300"}`}
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
  liveQuotes,
  isFiltered,
  sortKey,
  sortAsc,
  onSort,
  onDelete,
  onRunResearch,
  onHover,
}: Props) {
  // Score/gap/researched are only meaningful once a candidate has been
  // researched — rows with no scorecard always sort to the bottom
  // regardless of direction, so they never scatter through a ranked list.
  const sorted = [...candidates].sort((a, b) => {
    if (sortKey === "score" || sortKey === "gap" || sortKey === "researched") {
      const aLatest = a.scorecards[0] ?? null;
      const bLatest = b.scorecards[0] ?? null;
      if (!aLatest && !bLatest) return 0;
      if (!aLatest) return 1;
      if (!bLatest) return -1;

      let cmp = 0;
      if (sortKey === "score") {
        cmp = (aLatest.recommendationScore ?? -1) - (bLatest.recommendationScore ?? -1);
      } else if (sortKey === "gap") {
        const aGap = computeValuationGapPct(aLatest.currentPrice, aLatest.fairValueEstimate);
        const bGap = computeValuationGapPct(bLatest.currentPrice, bLatest.fairValueEstimate);
        cmp = (aGap ?? -Infinity) - (bGap ?? -Infinity);
      } else {
        cmp = new Date(aLatest.createdAt).getTime() - new Date(bLatest.createdAt).getTime();
      }
      return sortAsc ? cmp : -cmp;
    }

    let cmp = 0;
    if (sortKey === "dateScanned") {
      cmp = new Date(a.dateScanned).getTime() - new Date(b.dateScanned).getTime();
    } else {
      cmp = a[sortKey].localeCompare(b[sortKey]);
    }
    return sortAsc ? cmp : -cmp;
  });

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-600">
        {isFiltered ? "No candidates match these filters." : "No candidates yet — add one to get started."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <Th sortKey="ticker" activeKey={sortKey} asc={sortAsc} onSort={onSort}>
              Ticker
            </Th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">
              Price
              <div className="text-[11px] font-normal normal-case text-gray-500">live / at research</div>
            </th>
            <Th sortKey="gap" activeKey={sortKey} asc={sortAsc} onSort={onSort}>
              Intrinsic value
            </Th>
            <Th sortKey="score" activeKey={sortKey} asc={sortAsc} onSort={onSort}>
              Score
            </Th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">Quality</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">Risk</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">Entry zone</th>
            <Th sortKey="researched" activeKey={sortKey} asc={sortAsc} onSort={onSort}>
              Researched
            </Th>
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {sorted.map((c) => {
            const isNew = latestDate && c.dateScanned.slice(0, 10) === latestDate.slice(0, 10);
            const latest = c.scorecards[0];
            const previous = c.scorecards[1];
            const running = runningIds.has(c.id);
            const liveQuote = liveQuotes[c.ticker];

            const rowBorder = latest ? RECOMMENDATION_BORDER[latest.recommendation] : "border-l-gray-200";

            return (
              <tr
                key={c.id}
                onMouseEnter={() => onHover?.(c.id)}
                className={`border-l-4 ${rowBorder} ${isNew ? "bg-blue-50/60" : ""}`}
              >
                <td className="whitespace-nowrap px-3 py-2.5">
                  <Link
                    href={`/candidates/${c.id}`}
                    className="rounded font-semibold text-gray-900 hover:text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    {c.ticker}
                  </Link>
                  {isNew && (
                    <span className="ml-2 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      NEW
                    </span>
                  )}
                  <div className="mt-0.5">
                    <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                  {latest?.sector && <div className="text-xs text-gray-500">{latest.sector}</div>}
                  {latest?.marketCap !== null && latest?.marketCap !== undefined && (
                    <div className="text-xs text-gray-500">{formatMarketCap(latest.marketCap)}</div>
                  )}
                </td>

                {c.scorecardCount === 0 ? (
                  <td colSpan={7} className="px-3 py-2.5 text-gray-600">
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
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <LivePriceChip quote={liveQuote} />
                      <div className="text-xs text-gray-500">
                        {formatPrice(latest.currentPrice)} at research
                      </div>
                      {format52WeekPosition(latest.currentPrice, latest.fiftyTwoWeekLow, latest.fiftyTwoWeekHigh) && (
                        <div className="text-xs text-gray-500">
                          {format52WeekPosition(latest.currentPrice, latest.fiftyTwoWeekLow, latest.fiftyTwoWeekHigh)}
                          {formatTrend(latest.currentPrice, latest.fiftyDayAverage, latest.twoHundredDayAverage) &&
                            ` · ${formatTrend(latest.currentPrice, latest.fiftyDayAverage, latest.twoHundredDayAverage)}`}
                        </div>
                      )}
                      {formatEarningsProximity(latest.nextEarningsDate) && (
                        <div className="text-xs font-medium text-amber-700">
                          {formatEarningsProximity(latest.nextEarningsDate)}
                        </div>
                      )}
                    </td>
                    <td
                      className={`whitespace-nowrap px-3 py-2.5 ${VALUATION_CELL_OPACITY[stalenessLevel(latest.createdAt)]}`}
                      title={formatAsOfTooltip(latest.createdAt)}
                    >
                      <div className="font-semibold tabular-nums text-gray-900">
                        {formatPrice(latest.fairValueEstimate)}
                      </div>
                      <div
                        className={`text-xs font-medium tabular-nums ${
                          (computeValuationGapPct(latest.currentPrice, latest.fairValueEstimate) ?? 0) >= 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {formatGap(latest.currentPrice, latest.fairValueEstimate)}
                      </div>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${VALUATION_VERDICT_STYLES[latest.valuationVerdict]}`}
                      >
                        {VALUATION_VERDICT_LABELS[latest.valuationVerdict]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div
                        className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-bold ${scoreStyles(latest.recommendationScore)}`}
                      >
                        {latest.recommendationScore ?? "—"}
                      </div>
                      <div className="mt-1 h-1 w-16 rounded-full bg-gray-200">
                        <div
                          className={`h-1 rounded-full ${scoreBarStyle(latest.recommendationScore)}`}
                          style={{ width: `${Math.min(100, Math.max(0, latest.recommendationScore ?? 0))}%` }}
                        />
                      </div>
                      <DeltaChip
                        latest={latest.recommendationScore}
                        previous={previous?.recommendationScore ?? null}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div
                        className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-bold ${qualityStyles(latest.qualityScore)}`}
                      >
                        {latest.qualityScore ?? "—"}
                      </div>
                      <div className="mt-1 h-1 w-16 rounded-full bg-gray-200">
                        <div
                          className={`h-1 rounded-full ${qualityBarStyle(latest.qualityScore)}`}
                          style={{ width: `${Math.min(100, Math.max(0, latest.qualityScore ?? 0))}%` }}
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <RiskDots riskScore={latest.riskScore} />
                      <div className="mt-1">
                        <ConfidenceDots confidence={latest.confidenceRead} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="text-gray-900">
                        {formatEntryZone(latest.entryZoneLow, latest.entryZoneHigh)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatEntryDistance(
                          liveQuote?.regularMarketPrice ?? latest.currentPrice,
                          latest.entryZoneLow,
                          latest.entryZoneHigh
                        )}
                      </div>
                      {latest.councilConsensus !== null && (
                        <span
                          className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${councilConsensusStyles(latest.councilConsensus)}`}
                          title="Council of 5 — how many favor entering"
                        >
                          {formatCouncilConsensus(latest.councilConsensus)} council
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <time
                        dateTime={latest.createdAt}
                        className={`block font-medium ${STALENESS_TEXT_STYLES[stalenessLevel(latest.createdAt)]}`}
                      >
                        {formatRelativeDate(latest.createdAt)}
                      </time>
                      <span className="block text-[11px] text-gray-500">
                        {formatDateTime(latest.createdAt)}
                      </span>
                    </td>
                  </>
                )}

                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {c.scorecardCount > 0 && (
                      <button
                        onClick={() => onRunResearch(c.id)}
                        disabled={running}
                        className="text-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
                      >
                        {running ? "Running…" : "Re-research"}
                      </button>
                    )}
                    <Link
                      href={`/candidates/${c.id}/edit`}
                      className="text-gray-600 hover:text-gray-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => onDelete(c.id)}
                      className="text-gray-400 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  sortKey,
  activeKey,
  asc,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  activeKey: SortKey;
  asc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  const indicator = active ? (asc ? "↑" : "↓") : "↕";
  return (
    <th
      scope="col"
      className="px-3 py-2.5 text-left font-medium text-gray-600"
      aria-sort={active ? (asc ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 whitespace-nowrap rounded hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
          active ? "font-semibold text-gray-900" : ""
        }`}
      >
        {children}
        <span aria-hidden="true">{indicator}</span>
      </button>
    </th>
  );
}
