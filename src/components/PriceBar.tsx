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
      ? { key: "fair", label: "Fair value", value: fairValueEstimate, color: "bg-purple-600" }
      : null,
  ].filter((m): m is Marker => m !== null);

  if (markers.length < 2) {
    return (
      <div className="text-sm text-gray-600">
        Not enough price data yet to plot entry / current / fair value.
      </div>
    );
  }

  const values = markers.map((m) => m.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.15 || max * 0.1 || 1;
  const lo = min - pad;
  const hi = max + pad;

  function pct(value: number) {
    return ((value - lo) / (hi - lo)) * 100;
  }

  return (
    <div className="pt-6">
      <div className="relative h-1.5 rounded-full bg-gray-200">
        {markers.map((m) => (
          <div
            key={m.key}
            className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${pct(m.value)}%` }}
          >
            <div className={`h-3 w-3 rounded-full border-2 border-white ${m.color}`} />
          </div>
        ))}
      </div>
      <div className="relative mt-2 h-10">
        {markers.map((m) => (
          <div
            key={m.key}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center text-center"
            style={{ left: `${pct(m.value)}%` }}
          >
            <div className="whitespace-nowrap text-xs font-medium text-gray-900">
              {formatPrice(m.value)}
            </div>
            <div className="whitespace-nowrap text-[10px] text-gray-500">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
