import { Theme, Status, ConfidenceRead, Recommendation } from "@prisma/client";

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
  createdAt: string;
};

export type CandidateWithScorecards = Candidate & { scorecards: Scorecard[] };
