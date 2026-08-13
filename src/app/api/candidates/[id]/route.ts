import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { scorecards: { orderBy: { createdAt: "desc" } } },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(candidate);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { ticker, dateScanned, theme, triggerReason, status, notes } = body;

  const candidate = await prisma.candidate.update({
    where: { id },
    data: {
      ...(ticker !== undefined && { ticker: ticker.toUpperCase().trim() }),
      ...(dateScanned !== undefined && { dateScanned: new Date(dateScanned) }),
      ...(theme !== undefined && { theme }),
      ...(triggerReason !== undefined && { triggerReason }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes: notes || null }),
    },
  });

  return NextResponse.json(candidate);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.candidate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
