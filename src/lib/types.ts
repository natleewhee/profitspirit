import {
  Theme,
  Status,
  ConfidenceRead,
  Recommendation,
  DataQuality,
  RiskLevel,
  ValuationVerdict,
} from "@prisma/client";

export type Candidate = {
  id: string;
  ticker: string;
  dateScanned: string;
  theme: Theme;
  triggerReason: string;
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
  targetsBasis: string;
  currentPrice: number | null;
  sector: string | null;
  industry: string | null;
  dataQuality: DataQuality;
  riskLevel: RiskLevel;
  valuationVerdict: ValuationVerdict;
  recommendationScore: number | null;
  createdAt: string;
};

export type CandidateWithScorecards = Candidate & { scorecards: Scorecard[] };

// The narrow projection returned by GET /api/candidates for the dashboard
// list — excludes the four long prose fields (fundamentalsSummary,
// technicalsSummary, bullCase, bearCase), which don't belong in a list
// payload. See docs/dashboard-ux-review.md §2.1.
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
  | "riskLevel"
  | "confidenceRead"
  | "dataQuality"
  | "sector"
>;

// Latest-two scorecards (for the delta chip) plus a total count, attached
// to each candidate in the dashboard list.
export type CandidateWithLatest = Candidate & {
  scorecards: ScorecardSummary[];
  scorecardCount: number;
};
