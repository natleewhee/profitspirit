import { Theme, Status } from "@/generated/prisma";

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
