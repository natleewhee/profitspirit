import { CouncilVerdict } from "@/lib/types";
import { PERSONA_LABELS } from "@/lib/research/council";
import { formatCouncilConsensus, councilConsensusStyles } from "@/lib/ui";

const VERDICT_STYLES: Record<CouncilVerdict["verdict"], string> = {
  enter: "bg-green-100 text-green-800",
  wait: "bg-amber-100 text-amber-800",
  avoid: "bg-red-100 text-red-800",
};

const VERDICT_LABELS: Record<CouncilVerdict["verdict"], string> = {
  enter: "Enter",
  wait: "Wait",
  avoid: "Avoid",
};

type Props = {
  verdicts: CouncilVerdict[] | null;
  consensus: number | null;
};

// Five well-known fundamental-analysis lenses reacting to this scorecard's
// already-computed numbers — not five independent re-analyses. See
// src/lib/research/council.ts for why no persona gets its own price target.
export function CouncilSection({ verdicts, consensus }: Props) {
  if (!verdicts || verdicts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">
        No council verdicts yet — run research to generate them.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Council of 5</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${councilConsensusStyles(consensus)}`}
        >
          {formatCouncilConsensus(consensus)} favor entering
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {verdicts.map((v) => (
          <div key={v.name} className="rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">{PERSONA_LABELS[v.name]}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_STYLES[v.verdict]}`}
              >
                {VERDICT_LABELS[v.verdict]}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-700">{v.reasoning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
