import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma, Theme, Status } from "@/generated/prisma";

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
  });

  return NextResponse.json(candidates);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { ticker, dateScanned, theme, triggerReason, status, notes } = body;

  if (!ticker || !dateScanned || !theme || !triggerReason) {
    return NextResponse.json(
      { error: "ticker, dateScanned, theme, and triggerReason are required" },
      { status: 400 }
    );
  }

  const candidate = await prisma.candidate.create({
    data: {
      ticker: ticker.toUpperCase().trim(),
      dateScanned: new Date(dateScanned),
      theme,
      triggerReason,
      status: status ?? "NEW",
      notes: notes || null,
    },
  });

  return NextResponse.json(candidate, { status: 201 });
}
