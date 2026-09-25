import Link from "next/link";
import { CONTACT_HREF, TryDemoLink } from "@/components/home/CtaLinks";
import { TrackedLink } from "@/components/home/TrackedLink";
import { Logo } from "@/components/ui/Logo";

const SITE_LINKS = [
  { label: "Product", href: "/#products" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Use Cases", href: "/#industries" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: CONTACT_HREF },
];

const FOOTER_LINK = "hover:text-zinc-900 hover:underline dark:hover:text-zinc-50";

// `hideOutbound` drops the Outbound link on /outbound itself, where it would point back at the current page.
export function LandingFooter({ hideOutbound = false }: { hideOutbound?: boolean }) {
  return (
    <footer className="border-t border-zinc-200/70 py-10 dark:border-zinc-800">
      <nav
        aria-label="Footer"
        className="mx-auto mb-8 flex max-w-6xl flex-wrap items-center justify-center gap-x-6 gap-y-3 border-b border-zinc-200/70 px-6 pb-8 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 sm:justify-start"
      >
        {SITE_LINKS.map((l) => (
          <Link key={l.label} href={l.href} className={FOOTER_LINK}>
            {l.label}
          </Link>
        ))}
        <TryDemoLink from="footer" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50 sm:ml-auto" />
      </nav>
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 font-mono text-xs text-zinc-500 dark:text-zinc-400 sm:flex-row sm:justify-between">
        <span className="font-semibold text-zinc-900 dark:text-zinc-50">
          <Logo />
        </span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/about" className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-50">
            About
          </Link>
          <Link href="/terms" className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-50">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-50">
            Privacy
          </Link>
          <Link href="/refund" className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-50">
            Refund Policy
          </Link>
          {!hideOutbound && (
            <TrackedLink
              href="/outbound"
              event="outbound_clicked"
              eventProps={{ from: "footer" }}
              className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-50"
            >
              Outbound
            </TrackedLink>
          )}
          <a href="mailto:hello@bettercallz.com" className="hover:text-zinc-900 hover:underline dark:hover:text-zinc-50">
            hello@bettercallz.com
          </a>
        </nav>
        <span>© {new Date().getFullYear()} bettercallz. All rights reserved.</span>
      </div>
    </footer>
  );
}
