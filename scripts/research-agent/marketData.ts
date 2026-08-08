// yfinance-equivalent for Node — yahoo-finance2. Free, no key, unofficial
// (can break without notice; wrap failures rather than crashing the run).
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type MarketDataBundle = {
  found: true;
  ticker: string;
  price: number | null;
  currency: string | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  averageVolume: number | null;
  fiftyDayAverage: number | null;
  twoHundredDayAverage: number | null;
  recentClose: { date: string; close: number }[];
} | {
  found: false;
  ticker: string;
  reason: string;
};

export async function fetchMarketData(ticker: string): Promise<MarketDataBundle> {
  try {
    const quote = await yahooFinance.quote(ticker);
    if (!quote) {
      return { found: false, ticker, reason: "No quote returned by Yahoo Finance." };
    }

    let recentClose: { date: string; close: number }[] = [];
    try {
      const period2 = new Date();
      const period1 = new Date();
      period1.setDate(period1.getDate() - 90);
      const chart = await yahooFinance.chart(ticker, {
        period1,
        period2,
        interval: "1d",
      });
      recentClose = chart.quotes
        .filter((q) => q.close != null)
        .map((q) => ({ date: q.date.toISOString().slice(0, 10), close: q.close as number }));
    } catch {
      // Trend context is a nice-to-have; proceed without it if the chart call fails.
    }

    return {
      found: true,
      ticker: ticker.toUpperCase(),
      price: quote.regularMarketPrice ?? null,
      currency: quote.currency ?? null,
      marketCap: quote.marketCap ?? null,
      trailingPE: quote.trailingPE ?? null,
      forwardPE: quote.forwardPE ?? null,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
      averageVolume: quote.averageDailyVolume3Month ?? null,
      fiftyDayAverage: quote.fiftyDayAverage ?? null,
      twoHundredDayAverage: quote.twoHundredDayAverage ?? null,
      recentClose,
    };
  } catch (err) {
    return { found: false, ticker, reason: `Yahoo Finance lookup failed: ${(err as Error).message}` };
  }
}
