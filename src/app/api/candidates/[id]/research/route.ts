import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchFundamentalsData } from "@/lib/research/fundamentalsData";
import { fetchMarketData } from "@/lib/research/marketData";
import {
  runFundamentalsAnalyst,
  runTechnicalsAnalyst,
  runSynthesizer,
} from "@/lib/research/agents";
import type { Scorecard as AgentScorecard } from "@/lib/research/scorecard";

// Three sequential model calls plus two data fetches can take well past
// Vercel's default 10s function timeout — give this route real headroom.
export const maxDuration = 60;

const CONFIDENCE_MAP: Record<AgentScorecard["confidenceRead"], "LOW" | "MEDIUM" | "HIGH"> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

const RECOMMENDATION_MAP: Record<
  AgentScorecard["recommendation"],
  "WATCH" | "RESEARCH_FURTHER" | "PASS"
> = {
  watch: "WATCH",
  "research further": "RESEARCH_FURTHER",
  pass: "PASS",
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({ where: { id } });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const [fundamentals, market] = await Promise.all([
    fetchFundamentalsData(candidate.ticker),
    fetchMarketData(candidate.ticker),
  ]);

  const [fundamentalsSummary, technicalsSummary] = await Promise.all([
    runFundamentalsAnalyst(fundamentals),
    runTechnicalsAnalyst(market),
  ]);

  const agentScorecard = await runSynthesizer({
    ticker: candidate.ticker,
    triggerReason: candidate.triggerReason,
    fundamentalsSummary,
    technicalsSummary,
  });

  const scorecard = await prisma.scorecard.create({
    data: {
      candidateId: candidate.id,
      asOf: new Date(agentScorecard.asOf),
      fundamentalsSummary: agentScorecard.fundamentalsSummary,
      technicalsSummary: agentScorecard.technicalsSummary,
      bullCase: agentScorecard.bullCase,
      bearCase: agentScorecard.bearCase,
      confidenceRead: CONFIDENCE_MAP[agentScorecard.confidenceRead],
      riskFlags: agentScorecard.riskFlags,
      recommendation: RECOMMENDATION_MAP[agentScorecard.recommendation],
      entryPriceEstimate: agentScorecard.entryPriceEstimate,
      fairValueEstimate: agentScorecard.fairValueEstimate,
      targetsBasis: agentScorecard.targetsBasis,
    },
  });

  return NextResponse.json(scorecard, { status: 201 });
}
