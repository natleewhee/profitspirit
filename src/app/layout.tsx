import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppHeader } from "@/components/AppHeader";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ProfitSpirit",
  description: "Weekly stock scan candidate tracker",
};

// Now that the app authors real dark-mode colors (dark: variants across
// every component, see docs/dashboard-ux-review.md Phase 4), "light dark"
// is correct — the old "light" pin was a patch for a different bug (forced
// dark inverting a page with no authored dark colors) that no longer
// applies once a real theme exists.
export const viewport: Viewport = {
  colorScheme: "light dark",
};

// Blocking script so the theme class is set before first paint — otherwise
// a dark-preferring browser flashes light, then flips dark on hydration.
const THEME_INIT_SCRIPT = `try {
  var t = localStorage.getItem('theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-white font-sans text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100`}
      >
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
