// Fundamentals via Yahoo Finance — replaces the earlier SEC EDGAR source,
// which returned 403s in production (SEC blocking the serverless host's
// requests). Same caveat as the technicals side: free, no key, unofficial —
// can break without notice. Not an "official" primary source like EDGAR was.
//
// Uses `fundamentalsTimeSeries`, not quoteSummary's incomeStatementHistory
// modules — those have returned almost no data since Nov 2024 per Yahoo's
// own library warning.
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

type IncomeStatementPeriod = {
  date: string;
  totalRevenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
};

export type FundamentalsBundle = {
  found: true;
  ticker: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  keyRatios: {
    revenueGrowth: number | null;
    grossMargins: number | null;
    operatingMargins: number | null;
    profitMargins: number | null;
    returnOnEquity: number | null;
    debtToEquity: number | null;
    currentRatio: number | null;
    freeCashflow: number | null;
    totalCash: number | null;
    totalDebt: number | null;
  };
  annualIncomeStatements: IncomeStatementPeriod[];
  quarterlyIncomeStatements: IncomeStatementPeriod[];
} | {
  found: false;
  ticker: string;
  reason: string;
};

async function fetchIncomeStatements(
  ticker: string,
  type: "annual" | "quarterly"
): Promise<IncomeStatementPeriod[]> {
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 3);

  try {
    const results = await yahooFinance.fundamentalsTimeSeries(ticker, {
      period1,
      type,
      module: "financials",
    });
    return results
      .filter((r) => r.TYPE === "FINANCIALS")
      .map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        totalRevenue: r.totalRevenue ?? null,
        grossProfit: r.grossProfit ?? null,
        operatingIncome: r.operatingIncome ?? null,
        netIncome: r.netIncome ?? null,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 4);
  } catch {
    // fundamentalsTimeSeries can come back empty/error for thinly-covered
    // tickers; the analyst prompt already handles sparse data gracefully.
    return [];
  }
}

export async function fetchFundamentalsData(ticker: string): Promise<FundamentalsBundle> {
  try {
    const [summary, annualIncomeStatements, quarterlyIncomeStatements] = await Promise.all([
      yahooFinance.quoteSummary(ticker, {
        modules: ["price", "assetProfile", "financialData"],
      }),
      fetchIncomeStatements(ticker, "annual"),
      fetchIncomeStatements(ticker, "quarterly"),
    ]);

    if (!summary) {
      return { found: false, ticker, reason: "No quoteSummary data returned by Yahoo Finance." };
    }

    return {
      found: true,
      ticker: ticker.toUpperCase(),
      companyName: summary.price?.longName ?? summary.price?.shortName ?? null,
      sector: summary.assetProfile?.sector ?? null,
      industry: summary.assetProfile?.industry ?? null,
      keyRatios: {
        revenueGrowth: summary.financialData?.revenueGrowth ?? null,
        grossMargins: summary.financialData?.grossMargins ?? null,
        operatingMargins: summary.financialData?.operatingMargins ?? null,
        profitMargins: summary.financialData?.profitMargins ?? null,
        returnOnEquity: summary.financialData?.returnOnEquity ?? null,
        debtToEquity: summary.financialData?.debtToEquity ?? null,
        currentRatio: summary.financialData?.currentRatio ?? null,
        freeCashflow: summary.financialData?.freeCashflow ?? null,
        totalCash: summary.financialData?.totalCash ?? null,
        totalDebt: summary.financialData?.totalDebt ?? null,
      },
      annualIncomeStatements,
      quarterlyIncomeStatements,
    };
  } catch (err) {
    return { found: false, ticker, reason: `Yahoo Finance fundamentals lookup failed: ${(err as Error).message}` };
  }
}
