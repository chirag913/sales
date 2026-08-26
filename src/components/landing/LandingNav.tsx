import Link from "next/link";
import { PRIMARY_LINK_CLASSES } from "@/components/landing/linkButtonClasses";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">bettercallz</span>
        <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-600 dark:text-zinc-400 sm:flex">
          <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-zinc-50">
            How it works
          </a>
          <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-zinc-50">
            Pricing
          </a>
        </nav>
        <Link href="/practice" className={PRIMARY_LINK_CLASSES}>
          Try it free
        </Link>
      </div>
    </header>
  );
}
