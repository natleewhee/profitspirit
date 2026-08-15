"use client";

import { useState } from "react";
import { Scorecard } from "@/lib/types";
import { fetchJson, ApiError } from "@/lib/http";

// Single implementation of "run research" shared by the dashboard table and
// the candidate detail page — previously two independent copies with
// different loading copy and error surfaces (alert() vs inline banner). See
// docs/dashboard-ux-review.md C4.
export function useRunResearch() {
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function run(candidateId: string): Promise<Scorecard | null> {
    setRunningIds((prev) => new Set(prev).add(candidateId));
    setError(null);
    try {
      return await fetchJson<Scorecard>(`/api/candidates/${candidateId}/research`, {
        method: "POST",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Research run failed — check server logs.");
      return null;
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  }

  return { run, runningIds, error, clearError: () => setError(null) };
}
