import { Theme, Status, ConfidenceRead, Recommendation } from "@prisma/client";

export const THEME_LABELS: Record<Theme, string> = {
  AI_INFRA_SEMIS: "AI Infra / Semis",
  NON_TECH_ASYMMETRIC: "Non-Tech Asymmetric",
  SGX: "SGX",
  OTHER: "Other",
};

export const STATUS_LABELS: Record<Status, string> = {
  NEW: "New",
  RESEARCHED: "Researched",
  ADDED_TO_WATCHLIST: "Added to Watchlist",
  ADDED_TO_PORTFOLIO: "Added to Portfolio",
  PASSED: "Passed",
};

export const THEME_OPTIONS = Object.entries(THEME_LABELS) as [Theme, string][];
export const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [Status, string][];

export const CONFIDENCE_LABELS: Record<ConfidenceRead, string> = {
  LOW: "Low confidence",
  MEDIUM: "Medium confidence",
  HIGH: "High confidence",
};

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  WATCH: "Watch",
  RESEARCH_FURTHER: "Research further",
  PASS: "Pass",
};
