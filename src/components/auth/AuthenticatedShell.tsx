"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { History, LogOut, User } from "lucide-react";
import { BuyCreditsButton } from "@/components/onboarding/BuyCreditsButton";
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

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [entitlement, setEntitlement] = useState<EntitlementStatus | null>(null);

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

          <div className="flex items-center gap-3">
            {entitlement && !entitlement.isAdmin && (
              <span className="hidden rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 sm:inline-block">
                {usageBadgeText(entitlement)}
              </span>
            )}
            {entitlement && !entitlement.isTeamMember && (
              // Always reachable, regardless of remaining balance or admin status —
              // credits can be topped up anytime, not just once fully exhausted.
              // Hidden for team members: reserve_call_entitlement never consults
              // a team member's personal credits_balance, so a purchase here
              // would strand real money on a balance that can never be spent.
              <BuyCreditsButton
                variant="link"
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400"
                onSuccess={() => void fetchEntitlement().then((data) => data && setEntitlement(data))}
              />
            )}
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
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
