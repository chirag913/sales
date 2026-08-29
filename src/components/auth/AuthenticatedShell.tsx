"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, History, User } from "lucide-react";
import { BuyCreditsButton } from "@/components/onboarding/BuyCreditsButton";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { Logo } from "@/components/ui/Logo";
import { EntitlementStatus } from "@/lib/entitlement/types";
import { createClient } from "@/lib/supabase/client";

// Purely a UI convenience — the server remains authoritative for whether a
// call can actually start. Doesn't distinguish "never bought credits" from
// "bought and used them all"; both read as "No calls remaining" to keep this
// a small badge rather than an accounting dashboard.
function usageBadgeText(entitlement: EntitlementStatus): string {
  const trialText = `${entitlement.trialRemaining} free trial call${entitlement.trialRemaining === 1 ? "" : "s"}`;

  // Team members draw from the team's pool, never their own credits_balance
  // (see reserve_call_entitlement in supabase/migrations/0013_teams.sql) —
  // show the pool, not a personal credit count that reserve never consults.
  if (entitlement.isTeamMember) {
    const poolText = `Team pool: ${entitlement.teamCredits ?? 0} call${entitlement.teamCredits === 1 ? "" : "s"}`;
    return entitlement.trialRemaining > 0 ? `${trialText} + ${poolText}` : poolText;
  }

  const creditsText = `${entitlement.credits} credit${entitlement.credits === 1 ? "" : "s"}`;

  // Buying credits is now reachable at any time (not just once the trial is
  // exhausted), so both can be nonzero at once — surface both rather than
  // silently hiding the credits someone just paid for.
  if (entitlement.trialRemaining > 0 && entitlement.credits > 0) {
    return `${trialText} + ${creditsText} remaining`;
  }
  if (entitlement.trialRemaining > 0) {
    return `Free trial: ${entitlement.trialRemaining} call${entitlement.trialRemaining === 1 ? "" : "s"} remaining`;
  }
  if (entitlement.credits > 0) {
    return `${entitlement.credits} call${entitlement.credits === 1 ? "" : "s"} remaining`;
  }
  return "No calls remaining";
}

async function fetchEntitlement(): Promise<EntitlementStatus | null> {
  try {
    const res = await fetch("/api/entitlement/status");
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const NAV_LINKS = [
  { href: "/practice", label: "Practice" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
];

// The avatar/dropdown trigger plus its menu — sign-out moved here from a
// standalone icon button so it stays reachable at every width (this
// renders with no `hidden`/`sm:` breakpoint), while the existing mobile-only
// History/Profile icon shortcuts below it are untouched.
function UserMenu({ label, onSignOut }: { label: string; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1 rounded-full py-1 pl-1 pr-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 dark:text-zinc-500 dark:hover:bg-zinc-900"
      >
        <InitialsAvatar label={label} size="sm" />
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="shadow-premium absolute right-0 top-full z-10 mt-2 w-52 rounded-xl border border-zinc-200/70 bg-white py-1.5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <p className="truncate border-b border-zinc-100 px-3 pb-2 text-xs text-zinc-400 dark:border-zinc-900 dark:text-zinc-500">
            {label}
          </p>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Profile &amp; settings
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [entitlement, setEntitlement] = useState<EntitlementStatus | null>(null);
  const [accountLabel, setAccountLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      const fullName = data.user.user_metadata?.full_name;
      setAccountLabel(typeof fullName === "string" && fullName.trim() ? fullName.trim() : (data.user.email ?? "Account"));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchEntitlement().then((data) => {
      if (!cancelled && data) setEntitlement(data);
    });

    // Creating/joining a team changes what this badge should show without
    // a page navigation (see TeamSection.tsx) — listen for that rather than
    // only ever fetching once on mount.
    function handleEntitlementChanged() {
      void fetchEntitlement().then((data) => {
        if (!cancelled && data) setEntitlement(data);
      });
    }
    window.addEventListener("team-entitlement-changed", handleEntitlementChanged);

    return () => {
      cancelled = true;
      window.removeEventListener("team-entitlement-changed", handleEntitlementChanged);
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-8">
            <Link href="/practice" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-6 font-mono text-xs font-medium tracking-wide sm:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    pathname === link.href
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                  }
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {entitlement && !entitlement.isAdmin && (
              <span className="hidden rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 sm:inline-flex sm:items-center">
                {usageBadgeText(entitlement)}
              </span>
            )}
            {entitlement && !entitlement.isTeamMember && (
              // Always reachable, regardless of remaining balance or admin status —
              // credits can be topped up anytime, not just once fully exhausted.
              // Hidden for team members: reserve_call_entitlement never consults
              // a team member's personal credits_balance, so a purchase here
              // would strand real money on a balance that can never be spent.
              // Same pill treatment/breakpoint as the balance badge above —
              // neither is muted or hidden based on remaining balance.
              <BuyCreditsButton
                variant="link"
                label="Top up"
                className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 sm:inline-flex sm:items-center"
                onSuccess={() => void fetchEntitlement().then((data) => data && setEntitlement(data))}
              />
            )}
            {accountLabel && <UserMenu label={accountLabel} onSignOut={() => void handleSignOut()} />}
            <Link
              href="/history"
              aria-label="Call history"
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 sm:hidden"
            >
              <History className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/profile"
              aria-label="Profile"
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200 sm:hidden"
            >
              <User className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
