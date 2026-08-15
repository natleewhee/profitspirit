import { CandidateWithLatest } from "@/lib/types";
import { CandidateDetailBody } from "./CandidateDetailBody";

type Props = {
  candidate: CandidateWithLatest | null;
};

export function CandidateHoverPanel({ candidate }: Props) {
  if (!candidate) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Hover a row to preview it here.
      </div>
    );
  }

  const latest = candidate.scorecards[0];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{candidate.ticker}</div>
      {latest?.sector && <div className="text-xs text-gray-500 dark:text-gray-400">{latest.sector}</div>}

      {latest ? (
        <div className="mt-4">
          <CandidateDetailBody latest={latest} />
        </div>
      ) : (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">Not researched yet.</div>
      )}
    </div>
  );
}
