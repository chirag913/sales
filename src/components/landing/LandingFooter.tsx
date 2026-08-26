import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-200/70 py-10 dark:border-zinc-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-sm text-zinc-500 dark:text-zinc-400 sm:flex-row sm:justify-between">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">bettercallz</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/terms" className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-50">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-50">
            Privacy
          </Link>
          <Link href="/refund" className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-50">
            Refund Policy
          </Link>
          <a href="mailto:hello@bettercallz.com" className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-50">
            hello@bettercallz.com
          </a>
        </nav>
        <span>© {new Date().getFullYear()} bettercallz. All rights reserved.</span>
      </div>
    </footer>
  );
}
