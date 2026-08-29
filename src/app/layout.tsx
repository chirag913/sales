import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Applies a stored theme choice before hydration, avoiding a flash of the
// wrong theme. Deliberately does NOT read prefers-color-scheme — light is
// the default for every first-time visitor regardless of OS setting; dark
// only applies once someone has explicitly opted in via ThemeToggle, which
// is what "theme" ever gets set to in localStorage.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

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
        {/* A plain inline script, not next/script — next/script (even
            "beforeInteractive") queues execution through Next's own runtime
            bootstrap rather than running synchronously as the parser hits
            it, which isn't early enough to prevent a flash here. This runs
            the moment the parser reaches it, before anything below paints. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
