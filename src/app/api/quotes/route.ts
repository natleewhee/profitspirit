// Live quotes for the dashboard's price chip — separate from the frozen
// research-time currentPrice stored on each Scorecard. This is read-only,
// display-only data: it never touches the valuation gap, which is
// deliberately computed against the research-date price (see lib/ui.ts
// formatGap/formatAsOfTooltip). Conflating the two would make the gap number
// lie about what it's measuring.
import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type LiveQuote = {
  ticker: string;
  regularMarketPrice: number | null;
  regularMarketChangePercent: number | null;
  marketState: string | null;
  prePostPrice: number | null;
  prePostChangePercent: number | null;
  prePostLabel: "Pre-market" | "After hours" | null;
};

export async function GET(request: NextRequest) {
  const tickersParam = request.nextUrl.searchParams.get("tickers");
  if (!tickersParam) {
    return NextResponse.json({ error: "tickers query param is required" }, { status: 400 });
  }

  const tickers = Array.from(
    new Set(tickersParam.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean))
  );
  if (tickers.length === 0) {
    return NextResponse.json({});
  }

  try {
    const quotes = await yahooFinance.quote(tickers, {}, { validateResult: false });
    const list = Array.isArray(quotes) ? quotes : [quotes];

    const result: Record<string, LiveQuote> = {};
    for (const q of list) {
      if (!q?.symbol) continue;
      const marketState = q.marketState ?? null;
      const isPre = marketState === "PRE" || marketState === "PREPRE";
      const isPost = marketState === "POST" || marketState === "POSTPOST";

      result[q.symbol] = {
        ticker: q.symbol,
        regularMarketPrice: q.regularMarketPrice ?? null,
        regularMarketChangePercent: q.regularMarketChangePercent ?? null,
        marketState,
        prePostPrice: isPre ? (q.preMarketPrice ?? null) : isPost ? (q.postMarketPrice ?? null) : null,
        prePostChangePercent: isPre
          ? (q.preMarketChangePercent ?? null)
          : isPost
            ? (q.postMarketChangePercent ?? null)
            : null,
        prePostLabel: isPre ? "Pre-market" : isPost ? "After hours" : null,
      };
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: `Yahoo Finance quote lookup failed: ${(err as Error).message}` },
      { status: 502 }
    );
  }
}
