import { Phone, TrendingUp, Users, Zap } from "lucide-react";
import { BuyCreditsButton } from "@/components/onboarding/BuyCreditsButton";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR } from "@/lib/config/pricing";
import { EntitlementStatus } from "@/lib/entitlement/types";

interface PaywallProps {
  onBack: () => void;
  onPurchased: () => void;
  entitlement?: EntitlementStatus | null;
}

const BENEFITS = [
  { icon: Phone, text: `${CREDIT_PACK_CALLS} more practice calls` },
  { icon: TrendingUp, text: "Keep the same coaching and scoring on every call" },
  { icon: Zap, text: "No subscription — credits never expire" },
];

export function Paywall({ onBack, onPurchased, entitlement }: PaywallProps) {
  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="mb-8 self-start text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
    >
      ← Back
    </button>
  );

  // Team members draw from the team's pool, never their own credits_balance
  // (reserve_call_entitlement in supabase/migrations/0013_teams.sql) — an
  // individual credit purchase here would strand real money on a balance
  // that call reservation never looks at. Point them at their team owner
  // instead of offering to buy personal credits.
  if (entitlement?.isTeamMember) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        {backButton}

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Your team&apos;s credit pool is empty.
        </h1>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">
          Ask your team owner to add more credits to {entitlement.teamName ? `${entitlement.teamName}'s` : "your team's"} pool.
        </p>

        <div className="shadow-premium mt-8 flex w-full items-start gap-3 rounded-3xl border border-zinc-200/70 bg-white p-6 text-left dark:border-zinc-800 dark:bg-zinc-950">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You&apos;re on a team, so calls draw from the shared pool rather than a personal balance — buying credits
            individually isn&apos;t available while you&apos;re on a team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      {backButton}

      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Your 2 free practice calls are complete.
      </h1>
      <p className="mt-3 text-zinc-500 dark:text-zinc-400">Buy credits to keep practicing.</p>

      <div className="shadow-premium mt-8 w-full rounded-3xl border border-zinc-200/70 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Credit pack</p>
        <p className="mt-3 text-4xl font-semibold text-zinc-900 dark:text-zinc-50">₹{CREDIT_PACK_PRICE_INR}</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{CREDIT_PACK_CALLS} calls, buy more anytime</p>

        <ul className="mt-5 space-y-2.5 border-t border-zinc-100 pt-5 text-left text-sm text-zinc-600 dark:border-zinc-900 dark:text-zinc-400">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              {text}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <BuyCreditsButton onSuccess={onPurchased} />
        </div>
      </div>
    </div>
  );
}
