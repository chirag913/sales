"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR } from "@/lib/config/pricing";
import { EntitlementStatus } from "@/lib/entitlement/types";
import { createClient } from "@/lib/supabase/client";

// Purely a UI convenience — the server remains authoritative for whether a
// call can actually start. Doesn't distinguish "never bought credits" from
// "bought and used them all"; both read as "No calls remaining" to keep this
// a small badge rather than an accounting dashboard.
function usageBadgeText(entitlement: EntitlementStatus): string {
  if (entitlement.trialRemaining > 0) {
    return `Free trial: ${entitlement.trialRemaining} call${entitlement.trialRemaining === 1 ? "" : "s"} remaining`;
  }
  if (entitlement.credits > 0) {
    return `${entitlement.credits} call${entitlement.credits === 1 ? "" : "s"} remaining`;
  }
  return "No calls remaining";
}

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [entitlement, setEntitlement] = useState<EntitlementStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/entitlement/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: EntitlementStatus | null) => {
        if (!cancelled && data) setEntitlement(data);
      })
      .catch(() => {});
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
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {usageBadgeText(entitlement)}
            {entitlement.trialRemaining === 0 && entitlement.credits === 0 && (
              <>
                {" · "}
                <Link href="/#pricing" className="underline-offset-4 hover:underline">
                  Buy {CREDIT_PACK_CALLS} calls — ₹{CREDIT_PACK_PRICE_INR}
                </Link>
              </>
            )}
          </span>
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
