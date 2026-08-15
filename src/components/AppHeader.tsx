import Link from "next/link";

// Persistent site chrome — previously there was no header at all, so the
// page title lived inline in dashboard content and detail/edit pages had no
// shared identity or navigation beyond a bare "← Back" link.
export function AppHeader({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <span className="grid h-7 w-7 place-items-center rounded-md bg-blue-600 text-white">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7.5 10.5l-4.72 4.72a.75.75 0 01-1.06-1.06l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.919z" />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-tight">
            <span className="text-gray-900">Profit</span>
            <span className="text-blue-600">Spirit</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
    </header>
  );
}
