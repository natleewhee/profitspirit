import Link from "next/link";

// Persistent site chrome — previously there was no header at all, so the
// page title lived inline in dashboard content and detail/edit pages had no
// shared identity or navigation beyond a bare "← Back" link.
export function AppHeader({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-gray-900">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-blue-600 text-xs font-bold text-white">
            C
          </span>
          Coah
        </Link>
        <span className="hidden text-sm text-gray-500 sm:inline">Scan Candidates</span>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
    </header>
  );
}
