"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { TrackedLink } from "@/components/home/TrackedLink";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PRIMARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";
import { trackEvent } from "@/lib/analytics";

interface NavItem {
  label: string;
  href: string;
}

const PRODUCTS: NavItem[] = [
  { label: "Instant Lead Calling", href: "/#instant-calling" },
  { label: "Lead Recovery", href: "/#lead-recovery" },
];

const USE_CASES: NavItem[] = [
  { label: "Real Estate", href: "/#real-estate" },
  { label: "Lead-Driven Businesses", href: "/#industries" },
];

const LINK = "text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50";

function Dropdown({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={`${LINK} inline-flex items-center gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40`}
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-3 w-60 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-premium dark:border-zinc-800 dark:bg-zinc-950">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none dark:text-zinc-300 dark:hover:bg-zinc-900 dark:focus-visible:bg-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function HomeNav() {
  const [solid, setSolid] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    trackEvent("landing_view");
  }, []);

  useEffect(() => {
    function onScroll() {
      setSolid(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        solid || mobileOpen
          ? "border-zinc-200/70 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/90"
          : "border-transparent bg-white/40 backdrop-blur-sm dark:bg-black/40"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" aria-label="BetterCallz home" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          <Dropdown label="Products" items={PRODUCTS} />
          <TrackedLink href="/outbound" event="outbound_clicked" eventProps={{ from: "nav" }} className={LINK}>
            Outbound
          </TrackedLink>
          <Dropdown label="Use Cases" items={USE_CASES} />
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {/* Wrapper, not `hidden` on the link: PRIMARY_LINK_CLASSES sets display itself. */}
          <span className="hidden sm:block">
            <Link href="/#get-started" className={PRIMARY_LINK_CLASSES}>
              Get a Custom AI Call
            </Link>
          </span>
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40 dark:border-zinc-800 dark:text-zinc-300 lg:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-zinc-200/70 bg-white px-6 pb-6 pt-4 dark:border-zinc-800 dark:bg-black lg:hidden">
          <div className="flex flex-col gap-1">
            {[...PRODUCTS, { label: "Outbound", href: "/outbound" }, ...USE_CASES].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setMobileOpen(false);
                  if (item.href === "/outbound") trackEvent("outbound_clicked", { from: "mobile_nav" });
                }}
                className="rounded-lg px-2 py-3 text-base text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <Link
            href="/#get-started"
            onClick={() => setMobileOpen(false)}
            className={`${PRIMARY_LINK_CLASSES} mt-4 w-full py-3 text-base`}
          >
            Get a Custom AI Call
          </Link>
        </nav>
      )}
    </header>
  );
}
