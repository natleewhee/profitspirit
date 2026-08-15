"use client";

import { useEffect, useState } from "react";

type ThemePref = "light" | "dark" | "system";

function applyTheme(pref: ThemePref) {
  const isDark =
    pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

const ICONS: Record<ThemePref, string> = { light: "☀️", dark: "🌙", system: "🖥️" };
const NEXT: Record<ThemePref, ThemePref> = { light: "dark", dark: "system", system: "light" };
const LABELS: Record<ThemePref, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

// Three-state toggle (light / dark / system) — the actual dark/light
// switch happens via the blocking inline script in layout.tsx (avoids a
// white flash on load) and this component's own effect for live changes.
export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = (localStorage.getItem("theme") as ThemePref | null) ?? "system";
    setPref(stored);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(pref);
    if (pref === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", pref);
  }, [pref, mounted]);

  // Avoid rendering a state that might not match the (script-set) DOM
  // before hydration settles.
  if (!mounted) {
    return <span className="h-8 w-8" aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      onClick={() => setPref(NEXT[pref])}
      title={LABELS[pref]}
      aria-label={`Theme: ${LABELS[pref]}. Click to change.`}
      className="grid h-8 w-8 place-items-center rounded-md text-base hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-gray-800"
    >
      <span aria-hidden="true">{ICONS[pref]}</span>
    </button>
  );
}
