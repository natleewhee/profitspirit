import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { THEME_LABELS, RECOMMENDATION_LABELS } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import { ResearchPanel } from "@/components/ResearchPanel";
import { PriceBar } from "@/components/PriceBar";
import {
  formatDate,
  scoreStyles,
  RECOMMENDATION_BORDER,
  qualityStyles,
  RISK_SCORE_DOT_STYLES,
  formatEntryZone,
} from "@/lib/ui";
import { deriveRiskLevel } from "@/lib/research/risk";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { scorecards: { orderBy: { createdAt: "desc" } } },
  });

  if (!candidate) notFound();

  const latest = candidate.scorecards[0];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        ← Back to dashboard
      </Link>

      {/* Hero: the latest scorecard's verdict is the most valuable thing on
          this page, so it leads — not the candidate metadata. */}
      <div
        className={`mt-2 rounded-lg border border-gray-200 border-l-4 p-5 dark:border-gray-800 ${
          latest ? RECOMMENDATION_BORDER[latest.recommendation] : "border-l-gray-300 dark:border-l-gray-700"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{candidate.ticker}</h1>
            {latest?.sector && <p className="text-sm text-gray-500 dark:text-gray-400">{latest.sector}</p>}
          </div>
          <div className="flex items-center gap-3">
            {latest && (
              <div
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${scoreStyles(latest.recommendationScore)}`}
              >
                <span className="text-2xl font-bold leading-none">
                  {latest.recommendationScore ?? "—"}
                </span>
                <div className="text-xs leading-tight">
                  <div className="font-semibold">
                    {RECOMMENDATION_LABELS[latest.recommendation]}
                  </div>
                  <div>score / 100</div>
                </div>
              </div>
            )}
            <Link
              href={`/candidates/${candidate.id}/edit`}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Edit
            </Link>
          </div>
        </div>

        {latest ? (
          <>
            <PriceBar
              entryPriceEstimate={latest.entryPriceEstimate}
              currentPrice={latest.currentPrice}
              fairValueEstimate={latest.fairValueEstimate}
            />
            {/* Stat strip — the table row already shows quality/risk/entry
                zone; the detail page shouldn't show less. See
                docs/dashboard-ux-review.md A7. */}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-200 pt-4 dark:border-gray-800 sm:grid-cols-3">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Quality</div>
                <div className={`mt-0.5 inline-block rounded px-1.5 py-0.5 font-bold ${qualityStyles(latest.qualityScore)}`}>
                  {latest.qualityScore ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Risk</div>
                <div className="mt-1 inline-flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i <= (latest.riskScore ?? 0)
                          ? RISK_SCORE_DOT_STYLES[deriveRiskLevel(latest.riskScore)]
                          : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Entry zone</div>
                <div className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {formatEntryZone(latest.entryZoneLow, latest.entryZoneHigh)}
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            No research run yet — run one below to populate this candidate&rsquo;s scorecard.
          </p>
        )}
      </div>

      {/* Candidate metadata demoted to a single compact line — it's input,
          not output. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
        {candidate.theme && (
          <>
            <span>{THEME_LABELS[candidate.theme]}</span>
            <span>·</span>
          </>
        )}
        <span>scanned {formatDate(candidate.dateScanned.toISOString())}</span>
        <span>·</span>
        <span>
          {candidate.scorecards.length} research run
          {candidate.scorecards.length === 1 ? "" : "s"}
        </span>
        <span>·</span>
        <StatusBadge status={candidate.status} />
      </div>

      {(candidate.triggerReason || candidate.notes) && (
        <details className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/50">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Scan context
          </summary>
          <div className="mt-2 space-y-2">
            {candidate.triggerReason && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  Trigger reason
                </h3>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{candidate.triggerReason}</p>
              </div>
            )}
            {candidate.notes && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  Notes
                </h3>
                <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">{candidate.notes}</p>
              </div>
            )}
          </div>
        </details>
      )}

      <div className="mt-8">
        <ResearchPanel
          candidateId={candidate.id}
          initialScorecards={candidate.scorecards.map((sc) => ({
            ...sc,
            asOf: sc.asOf.toISOString(),
            createdAt: sc.createdAt.toISOString(),
            nextEarningsDate: sc.nextEarningsDate ? sc.nextEarningsDate.toISOString() : null,
          }))}
        />
      </div>
    </main>
  );
}
