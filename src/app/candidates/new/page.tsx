import { CandidateForm } from "@/components/CandidateForm";
import Link from "next/link";

export default function NewCandidatePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-blue-600 hover:underline">
        ← Back to dashboard
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-gray-900">Log a New Candidate</h1>
      <div className="mt-6">
        <CandidateForm />
      </div>
    </main>
  );
}
