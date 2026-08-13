// SEC EDGAR — free, no key, official filings. US-listed tickers only.
// Requires a descriptive User-Agent per SEC's fair-access policy.

const USER_AGENT = "profitspirit-research-agent (contact: research-agent@localhost)";

const FUNDAMENTAL_TAGS = [
  "Revenues",
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "NetIncomeLoss",
  "OperatingIncomeLoss",
  "Assets",
  "Liabilities",
  "LongTermDebtNoncurrent",
  "CashAndCashEquivalentsAtCarryingValue",
  "GrossProfit",
];

type TickerMapEntry = { cik_str: number; ticker: string; title: string };

type SubmissionsResponse = {
  name?: string;
  filings?: {
    recent?: {
      form?: string[];
      filingDate?: string[];
      primaryDocDescription?: (string | null)[];
    };
  };
};

type XbrlFactValue = { form: string; end: string; val: number };
type CompanyFactsResponse = {
  facts?: {
    "us-gaap"?: Record<string, { units?: Record<string, XbrlFactValue[]> }>;
  };
};

let tickerMapCache: Record<string, TickerMapEntry> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`EDGAR request failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

async function getTickerMap(): Promise<Record<string, TickerMapEntry>> {
  if (tickerMapCache) return tickerMapCache;
  const raw = await fetchJson<Record<string, TickerMapEntry>>(
    "https://www.sec.gov/files/company_tickers.json"
  );
  const byTicker: Record<string, TickerMapEntry> = {};
  for (const entry of Object.values(raw)) {
    byTicker[entry.ticker.toUpperCase()] = entry;
  }
  tickerMapCache = byTicker;
  return byTicker;
}

function paddedCik(cik: number): string {
  return String(cik).padStart(10, "0");
}

export type EdgarBundle = {
  found: true;
  ticker: string;
  companyName: string;
  cik: string;
  recentFilings: { form: string; filingDate: string; primaryDocDescription: string | null }[];
  facts: Record<string, { unit: string; end: string; val: number; form: string }[]>;
} | {
  found: false;
  ticker: string;
  reason: string;
};

export async function fetchEdgarBundle(ticker: string): Promise<EdgarBundle> {
  const map = await getTickerMap();
  const entry = map[ticker.toUpperCase()];
  if (!entry) {
    return { found: false, ticker, reason: "No CIK match in SEC's ticker list (not a US-listed filer, or delisted)." };
  }
  const cik = paddedCik(entry.cik_str);

  const submissions = await fetchJson<SubmissionsResponse>(
    `https://data.sec.gov/submissions/CIK${cik}.json`
  );
  const recentForms: string[] = submissions.filings?.recent?.form ?? [];
  const recentDates: string[] = submissions.filings?.recent?.filingDate ?? [];
  const recentDocDesc: (string | null)[] = submissions.filings?.recent?.primaryDocDescription ?? [];

  const recentFilings = recentForms
    .map((form, i) => ({ form, filingDate: recentDates[i], primaryDocDescription: recentDocDesc[i] ?? null }))
    .filter((f) => ["10-K", "10-Q", "8-K"].includes(f.form))
    .slice(0, 8);

  const factsOut: Record<string, { unit: string; end: string; val: number; form: string }[]> = {};
  try {
    const companyFacts = await fetchJson<CompanyFactsResponse>(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`
    );
    const usGaap = companyFacts.facts?.["us-gaap"] ?? {};
    for (const tag of FUNDAMENTAL_TAGS) {
      const tagData = usGaap[tag];
      if (!tagData) continue;
      const units = tagData.units ?? {};
      const unitKey = Object.keys(units)[0];
      if (!unitKey) continue;
      const values = units[unitKey]
        .filter((v) => v.form === "10-K" || v.form === "10-Q")
        .sort((a, b) => (a.end < b.end ? 1 : -1))
        .slice(0, 4)
        .map((v) => ({ unit: unitKey, end: v.end, val: v.val, form: v.form }));
      if (values.length) factsOut[tag] = values;
    }
  } catch {
    // companyfacts can 404 for some filers even when submissions exist; proceed with filings only.
  }

  return {
    found: true,
    ticker: ticker.toUpperCase(),
    companyName: submissions.name ?? entry.title,
    cik,
    recentFilings,
    facts: factsOut,
  };
}
