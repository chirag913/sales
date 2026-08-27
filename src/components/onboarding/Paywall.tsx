import { Phone, TrendingUp, Zap } from "lucide-react";
import { BuyCreditsButton } from "@/components/onboarding/BuyCreditsButton";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR } from "@/lib/config/pricing";

interface PaywallProps {
  onBack: () => void;
  onPurchased: () => void;
}

const BENEFITS = [
  { icon: Phone, text: `${CREDIT_PACK_CALLS} more practice calls` },
  { icon: TrendingUp, text: "Keep the same coaching and scoring on every call" },
  { icon: Zap, text: "No subscription — credits never expire" },
];

export function Paywall({ onBack, onPurchased }: PaywallProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 self-start text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        ← Back
      </button>

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
