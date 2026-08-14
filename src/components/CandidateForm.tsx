"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Candidate } from "@/lib/types";
import { THEME_OPTIONS, STATUS_OPTIONS } from "@/lib/labels";

type Props = {
  initial?: Candidate;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function CandidateForm({ initial }: Props) {
  const router = useRouter();
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [dateScanned, setDateScanned] = useState(
    initial ? initial.dateScanned.slice(0, 10) : todayIso()
  );
  const [theme, setTheme] = useState(initial?.theme ?? "");
  const [triggerReason, setTriggerReason] = useState(initial?.triggerReason ?? "");
  const [status, setStatus] = useState(initial?.status ?? "NEW");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const body = { ticker, dateScanned, theme, triggerReason, status, notes };
    const url = initial ? `/api/candidates/${initial.id}` : "/api/candidates";
    const method = initial ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Ticker</label>
        <input
          required
          autoFocus
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="NVDA"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Date Scanned</label>
        <input
          required
          type="date"
          value={dateScanned}
          onChange={(e) => setDateScanned(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Theme (optional)</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as typeof theme)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">— None —</option>
          {THEME_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Trigger Reason (optional)</label>
        <input
          value={triggerReason}
          onChange={(e) => setTriggerReason(e.target.value)}
          placeholder="Broke 3-month high on 2x volume"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes (optional)</label>
        <textarea
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : initial ? "Save Changes" : "Add Candidate"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
