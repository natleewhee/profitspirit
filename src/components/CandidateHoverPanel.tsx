import { CandidateWithLatest } from "@/lib/types";
import { formatMarketCap, formatPE, formatPercent, formatPrice } from "@/lib/ui";

type Props = {
  candidate: CandidateWithLatest | null;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold tabular-nums text-gray-900">{value}</div>
    </div>
  );
}

export function CandidateHoverPanel({ candidate }: Props) {
  if (!candidate) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        Hover a row to preview it here.
      </div>
    );
  }

  const latest = candidate.scorecards[0];

  if (!latest) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <div className="text-lg font-bold text-gray-900">{candidate.ticker}</div>
        <div className="mt-2 text-sm text-gray-500">Not researched yet.</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-lg font-bold text-gray-900">{candidate.ticker}</div>
      {latest.sector && <div className="text-xs text-gray-500">{latest.sector}</div>}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Market Cap" value={formatMarketCap(latest.marketCap)} />
        <Stat label="Avg 1Y Price Target" value={formatPrice(latest.analystTargetPrice)} />
        <Stat label="PE" value={formatPE(latest.trailingPE)} />
        <Stat label="Fwd PE" value={formatPE(latest.forwardPE)} />
        <Stat label="E. Growth" value={formatPercent(latest.earningsGrowth)} />
        <Stat label="Div Yield" value={formatPercent(latest.dividendYield)} />
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Why it&rsquo;s interesting
        </h3>
        <p className="mt-1.5 text-sm text-gray-700">{latest.bullCase}</p>
      </div>

      {latest.riskFlags.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Risks</h3>
          <ul className="mt-1.5 space-y-1">
            {latest.riskFlags.map((flag, i) => (
              <li key={i} className="flex gap-1.5 text-sm text-gray-700">
                <span className="text-amber-600" aria-hidden="true">
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
