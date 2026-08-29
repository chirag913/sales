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

export const metadata: Metadata = {
  title: "bettercallz — Practice cold calls before the real ones",
  description:
    "Tell us who you're calling, then talk to a realistic AI prospect that argues back and get coached on exactly what to fix.",
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
