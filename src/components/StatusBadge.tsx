import { Status } from "@/generated/prisma";
import { STATUS_LABELS } from "@/lib/labels";

const STYLES: Record<Status, string> = {
  NEW: "bg-blue-100 text-blue-800",
  RESEARCHED: "bg-amber-100 text-amber-800",
  ADDED_TO_WATCHLIST: "bg-purple-100 text-purple-800",
  ADDED_TO_PORTFOLIO: "bg-green-100 text-green-800",
  PASSED: "bg-gray-100 text-gray-500",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
