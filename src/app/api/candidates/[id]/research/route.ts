import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchFundamentalsData } from "@/lib/research/fundamentalsData";
import { fetchMarketData } from "@/lib/research/marketData";
import { runFundamentalsAnalyst, runTechnicalsAnalyst, runSynthesizer } from "@/lib/research/agents";
import type { Scorecard as AgentScorecard } from "@/lib/research/scorecard";
import { buildScorecardExtras } from "@/lib/research/enrich";
import type { DataQuality as AgentDataQuality } from "@/lib/research/enrich";
import { computeValuation, type ValuationVerdict as AgentValuationVerdict } from "@/lib/research/valuation";
import {
  computeRecommendationScore,
  deriveRecommendation,
  capConfidenceByDataQuality,
  type RecommendationBucket,
} from "@/lib/research/score";

// Three sequential model calls plus two data fetches can take well past
// Vercel's default 10s function timeout — give this route real headroom.
export const maxDuration = 60;

const CONFIDENCE_MAP: Record<AgentScorecard["confidenceRead"], "LOW" | "MEDIUM" | "HIGH"> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

const RISK_LEVEL_MAP: Record<AgentScorecard["riskLevel"], "LOW" | "MEDIUM" | "HIGH"> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

const RECOMMENDATION_MAP: Record<RecommendationBucket, "WATCH" | "RESEARCH_FURTHER" | "PASS"> = {
  watch: "WATCH",
  research_further: "RESEARCH_FURTHER",
  pass: "PASS",
};

const VALUATION_VERDICT_MAP: Record<
  AgentValuationVerdict,
  "UNDERVALUED" | "OVERVALUED" | "FAIRLY_VALUED" | "INSUFFICIENT_DATA"
> = {
  undervalued: "UNDERVALUED",
  overvalued: "OVERVALUED",
  fairly_valued: "FAIRLY_VALUED",
  insufficient_data: "INSUFFICIENT_DATA",
};

const DATA_QUALITY_MAP: Record<AgentDataQuality, "THIN" | "ADEQUATE" | "RICH"> = {
  thin: "THIN",
  adequate: "ADEQUATE",
  rich: "RICH",
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
    fundamentalsSummary,
    technicalsSummary,
    riskSignals: {
      debtToEquity: fundamentals.found ? fundamentals.keyRatios.debtToEquity : null,
      currentRatio: fundamentals.found ? fundamentals.keyRatios.currentRatio : null,
      fiftyTwoWeekHigh: market.found ? market.fiftyTwoWeekHigh : null,
      fiftyTwoWeekLow: market.found ? market.fiftyTwoWeekLow : null,
    },
  });

  const extras = buildScorecardExtras(fundamentals, market);
  const valuation = computeValuation(fundamentals, market);
  const cappedConfidence = capConfidenceByDataQuality(agentScorecard.confidenceRead, extras.dataQuality);
  const recommendationScore = computeRecommendationScore(
    extras.currentPrice,
    valuation.fairValueEstimate,
    agentScorecard.riskLevel,
    cappedConfidence
  );
  const recommendation = deriveRecommendation(recommendationScore);

  const scorecard = await prisma.scorecard.create({
    data: {
      candidateId: candidate.id,
      asOf: new Date(agentScorecard.asOf),
      fundamentalsSummary: agentScorecard.fundamentalsSummary,
      technicalsSummary: agentScorecard.technicalsSummary,
      bullCase: agentScorecard.bullCase,
      bearCase: agentScorecard.bearCase,
      confidenceRead: CONFIDENCE_MAP[cappedConfidence],
      riskFlags: agentScorecard.riskFlags,
      riskLevel: RISK_LEVEL_MAP[agentScorecard.riskLevel],
      recommendation: RECOMMENDATION_MAP[recommendation],
      recommendationScore,
      entryPriceEstimate: valuation.entryPriceEstimate,
      fairValueEstimate: valuation.fairValueEstimate,
      valuationVerdict: VALUATION_VERDICT_MAP[valuation.valuationVerdict],
      targetsBasis: valuation.targetsBasis,
      currentPrice: extras.currentPrice,
      sector: extras.sector,
      industry: extras.industry,
      dataQuality: DATA_QUALITY_MAP[extras.dataQuality],
    },
  });

  // Status is a human decision field (watchlist/portfolio/passed); it
  // shouldn't also have to answer "has this been researched" — that's
  // derived from scorecards.length elsewhere. But a candidate untouched
  // since creation is fair to promote automatically. Never overwrites a
  // deliberate status (PASSED, ADDED_TO_WATCHLIST, etc.) — only NEW.
  if (candidate.status === "NEW") {
    await prisma.candidate.update({ where: { id }, data: { status: "RESEARCHED" } });
  }

  return NextResponse.json(scorecard, { status: 201 });
}
