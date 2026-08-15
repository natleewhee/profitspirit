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
  title: "Coah | Scan Candidates",
  description: "Weekly stock scan candidate tracker",
};

// This app is light-mode-only today. Without this, browsers that force dark
// mode on pages with no declared color-scheme invert the background but
// leave authored text colors alone — producing dark-gray-on-near-black text
// that's barely legible (exactly what shows up on a device/browser set to
// dark mode).
export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-white font-sans text-gray-900 antialiased`}
      >
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
