import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeInitScript } from "@/components/ThemeInitScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Canonical/OG URLs resolve against this. Set NEXT_PUBLIC_SITE_URL per
// environment; the fallback is the production domain.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bettercallz.com";

// Site-wide defaults. Pages that need their own title (the home page and
// /outbound) set it explicitly; every other page gets "<page> | BetterCallz".
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "BetterCallz", template: "%s | BetterCallz" },
  description:
    "AI voice agents for businesses that want to respond to new leads faster and recover the leads they've already paid for.",
  openGraph: { siteName: "BetterCallz", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The theme-init script below adds/omits a "dark" class on this exact
      // element before React hydrates it, based on localStorage — which the
      // server can't know when rendering. That's an intentional, expected
      // mismatch (not a real bug), so hydration warnings are suppressed
      // here specifically, per React/Next's documented pattern for this.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-black">
        <ThemeInitScript />
        {children}
      </body>
    </html>
  );
}
