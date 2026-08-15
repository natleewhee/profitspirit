import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma, Theme, Status } from "@prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const theme = searchParams.get("theme");
  const status = searchParams.get("status");

  const where: Prisma.CandidateWhereInput = {};
  if (theme && theme !== "ALL") where.theme = theme as Theme;
  if (status && status !== "ALL") where.status = status as Status;

  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: { dateScanned: "desc" },
    include: {
      // Latest 2 (not just 1) so the table can show a score delta vs the
      // previous run. Deliberately `select`-ed, not a full `include` —
      // fundamentalsSummary/technicalsSummary/bearCase are kilobytes each
      // and don't belong in a list payload. bullCase is included since the
      // hover-preview panel needs it. See docs/dashboard-ux-review.md §2.1.
      scorecards: {
        orderBy: { createdAt: "desc" },
        take: 2,
        select: {
          id: true,
          asOf: true,
          createdAt: true,
          recommendationScore: true,
          recommendation: true,
          valuationVerdict: true,
          fairValueEstimate: true,
          currentPrice: true,
          entryPriceEstimate: true,
          entryZoneLow: true,
          entryZoneHigh: true,
          riskLevel: true,
          riskScore: true,
          confidenceRead: true,
          dataQuality: true,
          sector: true,
          valuationScore: true,
          qualityScore: true,
          marketCap: true,
          fiftyTwoWeekHigh: true,
          fiftyTwoWeekLow: true,
          fiftyDayAverage: true,
          twoHundredDayAverage: true,
          nextEarningsDate: true,
          pegRatio: true,
          councilConsensus: true,
          trailingPE: true,
          forwardPE: true,
          earningsGrowth: true,
          dividendYield: true,
          analystTargetPrice: true,
          bullCase: true,
          riskFlags: true,
        },
      },
      _count: { select: { scorecards: true } },
    },
  });

  const withCount = candidates.map(({ _count, ...c }) => ({
    ...c,
    scorecardCount: _count.scorecards,
  }));

  return NextResponse.json(withCount);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { ticker, dateScanned, theme, triggerReason, status, notes } = body;

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  const candidate = await prisma.candidate.create({
    data: {
      ticker: ticker.toUpperCase().trim(),
      dateScanned: dateScanned ? new Date(dateScanned) : new Date(),
      theme: theme || null,
      triggerReason: triggerReason || null,
      status: status ?? "NEW",
      notes: notes || null,
    },
  });

  return NextResponse.json(candidate, { status: 201 });
}
