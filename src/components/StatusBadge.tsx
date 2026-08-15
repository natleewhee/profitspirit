import { Status } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/labels";

const STYLES: Record<Status, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  RESEARCHED: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  ADDED_TO_WATCHLIST: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300",
  ADDED_TO_PORTFOLIO: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  PASSED: "bg-gray-200 text-gray-800 dark:bg-gray-500/15 dark:text-gray-300",
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
