"use client";

import { useEffect, useRef, useState } from "react";
import { fetchJson, ApiError } from "@/lib/http";

type Props = {
  onAdded: () => void;
};

// Ticker-only add flow — everything else (dateScanned, theme, trigger
// reason, status) either defaults sensibly server-side or is optional and
// editable later. The old full-page form asked for four fields before you
// could even start; this is the one field that actually blocks anything.
export function AddCandidateModal({ onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function openModal() {
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setTicker("");
    setError(null);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      await fetchJson("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: ticker.trim() }),
      });
      close();
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={openModal}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        + Add Candidate
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={() => {
            if (!ticker.trim()) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-candidate-title"
            className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg dark:bg-gray-800"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <h2 id="add-candidate-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Add Candidate
              </h2>
              {error && (
                <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </div>
              )}
              <label htmlFor="add-candidate-ticker" className="sr-only">
                Ticker symbol
              </label>
              <input
                id="add-candidate-ticker"
                autoFocus
                required
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="NVDA"
                className="mt-3 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  {submitting ? "Adding…" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
