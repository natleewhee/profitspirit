import { formatPrice } from "@/lib/ui";

type Props = {
  entryPriceEstimate: number | null;
  currentPrice: number | null;
  fairValueEstimate: number | null;
};

type Marker = { key: string; label: string; value: number; color: string };

// A single horizontal track showing where the current price sits relative to
// the suggested entry point and computed fair value — the one relationship
// the whole scoring pipeline exists to compute, otherwise only readable by
// mentally comparing three separate numbers.
export function PriceBar({ entryPriceEstimate, currentPrice, fairValueEstimate }: Props) {
  const markers: Marker[] = [
    entryPriceEstimate !== null
      ? { key: "entry", label: "Entry", value: entryPriceEstimate, color: "bg-green-600" }
      : null,
    currentPrice !== null
      ? { key: "current", label: "Current", value: currentPrice, color: "bg-blue-600" }
      : null,
    fairValueEstimate !== null
      ? { key: "fair", label: "Intrinsic value", value: fairValueEstimate, color: "bg-purple-600" }
      : null,
  ].filter((m): m is Marker => m !== null);

  if (markers.length < 2) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Not enough price data yet to plot entry / current / intrinsic value.
      </div>
    );
  }

  const sortedByValue = [...markers].sort((a, b) => a.value - b.value);
  const values = sortedByValue.map((m) => m.value);
  const min = values[0];
  const max = values[values.length - 1];
  const pad = (max - min) * 0.15 || max * 0.1 || 1;
  const lo = min - pad;
  const hi = max + pad;

  function pct(value: number) {
    return ((value - lo) / (hi - lo)) * 100;
  }

  // Stagger labels onto a second row when two markers sit within ~12% of
  // each other on the track — otherwise their labels overlap illegibly.
  // See docs/dashboard-ux-review.md A17.
  const COLLISION_THRESHOLD_PCT = 12;
  const rows = sortedByValue.map((m, i) => {
    if (i === 0) return 0;
    const prevPct = pct(sortedByValue[i - 1].value);
    const thisPct = pct(m.value);
    return thisPct - prevPct < COLLISION_THRESHOLD_PCT ? 1 : 0;
  });

  return (
    <div className="pt-6">
      <div className="relative h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
        {markers.map((m) => (
          <div
            key={m.key}
            className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${pct(m.value)}%` }}
          >
            <div className={`h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${m.color}`} />
          </div>
        ))}
      </div>
      <div className="relative mt-2 h-16">
        <div className="absolute left-0 top-0 text-[10px] text-gray-400 dark:text-gray-500">
          {formatPrice(lo)}
        </div>
        <div className="absolute right-0 top-0 text-[10px] text-gray-400 dark:text-gray-500">
          {formatPrice(hi)}
        </div>
        {sortedByValue.map((m, i) => (
          <div
            key={m.key}
            className="absolute flex -translate-x-1/2 flex-col items-center text-center"
            style={{ left: `${pct(m.value)}%`, top: rows[i] === 1 ? "1.5rem" : "0.75rem" }}
          >
            <div className="whitespace-nowrap text-xs font-medium text-gray-900 dark:text-gray-100">
              {formatPrice(m.value)}
            </div>
            <div className="whitespace-nowrap text-[10px] text-gray-500 dark:text-gray-400">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
