"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PRIMARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

export function LandingNav() {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    function onScroll() {
      setSolid(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        solid
          ? "border-zinc-200/70 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/90"
          : "border-transparent bg-white/40 backdrop-blur-sm dark:bg-black/40"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          <Logo />
        </span>
        <nav className="hidden items-center gap-8 font-mono text-xs font-medium tracking-wide text-zinc-600 dark:text-zinc-400 sm:flex">
          <a href="#how-it-works" className="hover:text-zinc-900 dark:hover:text-zinc-50">
            How it works
          </a>
          <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-zinc-50">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/practice" className={PRIMARY_LINK_CLASSES}>
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
