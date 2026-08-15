import { CandidateForm } from "@/components/CandidateForm";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({ where: { id } });

  if (!candidate) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-gray-900">
        Edit {candidate.ticker}
      </h1>
      <div className="mt-6">
        <CandidateForm
          initial={{
            ...candidate,
            dateScanned: candidate.dateScanned.toISOString(),
            createdAt: candidate.createdAt.toISOString(),
            updatedAt: candidate.updatedAt.toISOString(),
          }}
        />
      </div>
    </main>
  );
}
