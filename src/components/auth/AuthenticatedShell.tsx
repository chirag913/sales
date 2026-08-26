"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BuyCreditsButton } from "@/components/onboarding/BuyCreditsButton";
import { EntitlementStatus } from "@/lib/entitlement/types";
import { createClient } from "@/lib/supabase/client";

// Purely a UI convenience — the server remains authoritative for whether a
// call can actually start. Doesn't distinguish "never bought credits" from
// "bought and used them all"; both read as "No calls remaining" to keep this
// a small badge rather than an accounting dashboard.
function usageBadgeText(entitlement: EntitlementStatus): string {
  const trialText = `${entitlement.trialRemaining} free trial call${entitlement.trialRemaining === 1 ? "" : "s"}`;
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

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [entitlement, setEntitlement] = useState<EntitlementStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchEntitlement().then((data) => {
      if (!cancelled && data) setEntitlement(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="relative">
      <div className="fixed right-4 top-4 z-50 flex items-center gap-3">
        {entitlement && !entitlement.isAdmin && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{usageBadgeText(entitlement)}</span>
        )}
        {entitlement && (
          // Always reachable, regardless of remaining balance or admin status —
          // credits can be topped up anytime, not just once fully exhausted.
          <BuyCreditsButton
            variant="link"
            className="text-xs text-zinc-500 dark:text-zinc-400"
            onSuccess={() => void fetchEntitlement().then((data) => data && setEntitlement(data))}
          />
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className="text-xs text-zinc-400 underline-offset-4 hover:underline dark:text-zinc-500"
        >
          Sign out
        </button>
      </div>
      {children}
    </div>
  );
}
