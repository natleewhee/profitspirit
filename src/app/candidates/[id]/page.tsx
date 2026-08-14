import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { THEME_LABELS } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import { ResearchPanel } from "@/components/ResearchPanel";
import { formatDate } from "@/lib/ui";

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

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{candidate.ticker}</h1>
        <Link
          href={`/candidates/${candidate.id}/edit`}
          className="text-sm text-blue-600 hover:underline"
        >
          Edit candidate
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">Theme</dt>
          <dd className="mt-0.5 text-sm text-gray-900">{THEME_LABELS[candidate.theme]}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Date Scanned
          </dt>
          <dd className="mt-0.5 text-sm text-gray-900">
            {formatDate(candidate.dateScanned.toISOString())}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">Status</dt>
          <dd className="mt-0.5">
            <StatusBadge status={candidate.status} />
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
            Scorecards
          </dt>
          <dd className="mt-0.5 text-sm text-gray-900">{candidate.scorecards.length}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          Trigger Reason
        </h2>
        <p className="mt-1 text-sm text-gray-800">{candidate.triggerReason}</p>
      </div>

      {candidate.notes && (
        <div className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600">Notes</h2>
          <p className="mt-1 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-800">
            {candidate.notes}
          </p>
        </div>
      )}

      <div className="mt-8">
        <ResearchPanel
          candidateId={candidate.id}
          initialScorecards={candidate.scorecards.map((sc) => ({
            ...sc,
            asOf: sc.asOf.toISOString(),
            createdAt: sc.createdAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
