// Fundamentals via Yahoo Finance's quoteSummary — replaces the earlier SEC
// EDGAR source, which returned 403s in production (SEC blocking the
// serverless host's requests, header fix alone didn't resolve it). Same
// caveat as the technicals side: free, no key, unofficial — can break
// without notice. Not an "official" primary source like EDGAR was.
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

type IncomeStatementPeriod = {
  endDate: string;
  totalRevenue: number | null;
  grossProfit: number | null;
  ebit: number | null;
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

export async function fetchFundamentalsData(ticker: string): Promise<FundamentalsBundle> {
  try {
    const summary = await yahooFinance.quoteSummary(ticker, {
      modules: [
        "price",
        "assetProfile",
        "financialData",
        "incomeStatementHistory",
        "incomeStatementHistoryQuarterly",
      ],
    });

    if (!summary) {
      return { found: false, ticker, reason: "No quoteSummary data returned by Yahoo Finance." };
    }

    const annualIncomeStatements: IncomeStatementPeriod[] = (
      summary.incomeStatementHistory?.incomeStatementHistory ?? []
    ).map((p) => ({
      endDate: p.endDate.toISOString().slice(0, 10),
      totalRevenue: p.totalRevenue ?? null,
      grossProfit: p.grossProfit ?? null,
      ebit: p.ebit ?? null,
      netIncome: p.netIncome ?? null,
    }));

    const quarterlyIncomeStatements: IncomeStatementPeriod[] = (
      summary.incomeStatementHistoryQuarterly?.incomeStatementHistory ?? []
    ).map((p) => ({
      endDate: p.endDate.toISOString().slice(0, 10),
      totalRevenue: p.totalRevenue ?? null,
      grossProfit: p.grossProfit ?? null,
      ebit: p.ebit ?? null,
      netIncome: p.netIncome ?? null,
    }));

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
