import { ScorecardSummary } from "@/lib/types";
import { RISK_LEVEL_LABELS, CONFIDENCE_LABELS } from "@/lib/labels";
import {
  formatMarketCap,
  formatPE,
  formatPercent,
  formatPrice,
  RISK_LEVEL_STYLES,
  CONFIDENCE_STYLES,
  formatCouncilConsensus,
  councilLeaning,
} from "@/lib/ui";

type Props = {
  latest: ScorecardSummary;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

// The breakdown behind the table row's single Recommendation badge —
// Quality, Risk, Confidence, PE/growth/dividend, the council's one-line
// lean, bull case, and risk flags. Shared by the desktop hover panel
// (CandidateHoverPanel) and the table's click-to-expand row, so mobile and
// desktop show identical detail through different entry points.
export function CandidateDetailBody({ latest }: Props) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Quality" value={latest.qualityScore !== null ? String(latest.qualityScore) : "—"} />
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Risk</div>
          <span
            className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_STYLES[latest.riskLevel]}`}
          >
            {RISK_LEVEL_LABELS[latest.riskLevel]}
          </span>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
          <span
            className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[latest.confidenceRead]}`}
          >
            {CONFIDENCE_LABELS[latest.confidenceRead]}
          </span>
        </div>
        <Stat label="Market Cap" value={formatMarketCap(latest.marketCap)} />
        <Stat label="Avg 1Y Target" value={formatPrice(latest.analystTargetPrice)} />
        <Stat label="PE / Fwd PE" value={`${formatPE(latest.trailingPE)} / ${formatPE(latest.forwardPE)}`} />
        <Stat label="E. Growth" value={formatPercent(latest.earningsGrowth)} />
        <Stat label="Div Yield" value={formatPercent(latest.dividendYield)} />
      </div>

      {latest.councilConsensus !== null && (
        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
          Council {councilLeaning(latest.councilConsensus)} — {formatCouncilConsensus(latest.councilConsensus)}{" "}
          favor entering.
        </p>
      )}

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Why it&rsquo;s interesting
        </h3>
        <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300">{latest.bullCase}</p>
      </div>

      {latest.riskFlags.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Risks
          </h3>
          <ul className="mt-1.5 space-y-1">
            {latest.riskFlags.map((flag, i) => (
              <li key={i} className="flex gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-amber-600 dark:text-amber-400" aria-hidden="true">
                  ⚠
                </span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
