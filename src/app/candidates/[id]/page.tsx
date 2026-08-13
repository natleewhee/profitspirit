import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { THEME_LABELS } from "@/lib/labels";
import { StatusBadge } from "@/components/StatusBadge";
import { ResearchPanel } from "@/components/ResearchPanel";

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
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{candidate.ticker}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {THEME_LABELS[candidate.theme]} · scanned{" "}
            {candidate.dateScanned.toLocaleDateString()} · {candidate.triggerReason}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={candidate.status} />
          <Link
            href={`/candidates/${candidate.id}/edit`}
            className="text-sm text-blue-600 hover:underline"
          >
            Edit candidate
          </Link>
        </div>
      </div>

      {candidate.notes && (
        <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {candidate.notes}
        </p>
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
