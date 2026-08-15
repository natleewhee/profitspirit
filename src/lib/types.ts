import {
  Theme,
  Status,
  ConfidenceRead,
  Recommendation,
  DataQuality,
  RiskLevel,
  ValuationVerdict,
} from "@prisma/client";
export type { CouncilVerdict } from "@/lib/research/council";
import type { CouncilVerdict } from "@/lib/research/council";

export type Candidate = {
  id: string;
  ticker: string;
  dateScanned: string;
  theme: Theme | null;
  triggerReason: string | null;
  status: Status;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Scorecard = {
  id: string;
  candidateId: string;
  asOf: string;
  fundamentalsSummary: string;
  technicalsSummary: string;
  bullCase: string;
  bearCase: string;
  confidenceRead: ConfidenceRead;
  riskFlags: string[];
  recommendation: Recommendation;
  entryPriceEstimate: number | null;
  fairValueEstimate: number | null;
  entryZoneLow: number | null;
  entryZoneHigh: number | null;
  targetsBasis: string;
  currentPrice: number | null;
  sector: string | null;
  industry: string | null;
  dataQuality: DataQuality;
  riskLevel: RiskLevel;
  riskScore: number | null;
  valuationVerdict: ValuationVerdict;
  recommendationScore: number | null;
  valuationScore: number | null;
  qualityScore: number | null;
  marketCap: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyDayAverage: number | null;
  twoHundredDayAverage: number | null;
  nextEarningsDate: string | null;
  pegRatio: number | null;
  councilVerdicts: CouncilVerdict[] | null;
  councilConsensus: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  earningsGrowth: number | null;
  dividendYield: number | null;
  analystTargetPrice: number | null;
  createdAt: string;
};

export type CandidateWithScorecards = Candidate & { scorecards: Scorecard[] };

// The narrow projection returned by GET /api/candidates for the dashboard
// list — excludes fundamentalsSummary/technicalsSummary/bearCase (long
// prose not needed in a list payload). bullCase and riskFlags ARE included
// despite being prose/array, since the hover-preview panel renders them
// directly from this list payload without a second fetch. See
// docs/dashboard-ux-review.md §2.1.
export type ScorecardSummary = Pick<
  Scorecard,
  | "id"
  | "asOf"
  | "createdAt"
  | "recommendationScore"
  | "recommendation"
  | "valuationVerdict"
  | "fairValueEstimate"
  | "currentPrice"
  | "entryPriceEstimate"
  | "entryZoneLow"
  | "entryZoneHigh"
  | "riskLevel"
  | "riskScore"
  | "confidenceRead"
  | "dataQuality"
  | "sector"
  | "valuationScore"
  | "qualityScore"
  | "marketCap"
  | "fiftyTwoWeekHigh"
  | "fiftyTwoWeekLow"
  | "fiftyDayAverage"
  | "twoHundredDayAverage"
  | "nextEarningsDate"
  | "pegRatio"
  | "councilConsensus"
  | "trailingPE"
  | "forwardPE"
  | "earningsGrowth"
  | "dividendYield"
  | "analystTargetPrice"
  | "bullCase"
  | "riskFlags"
>;

// Latest-two scorecards (for the delta chip) plus a total count, attached
// to each candidate in the dashboard list.
export type CandidateWithLatest = Candidate & {
  scorecards: ScorecardSummary[];
  scorecardCount: number;
};

// Mirrors LiveQuote from src/app/api/quotes/route.ts — kept as a plain type
// here (not imported) since that file is a server route module.
export type LiveQuote = {
  ticker: string;
  regularMarketPrice: number | null;
  regularMarketChangePercent: number | null;
  marketState: string | null;
  prePostPrice: number | null;
  prePostChangePercent: number | null;
  prePostLabel: "Pre-market" | "After hours" | null;
};
