import { BuyCreditsButton } from "@/components/onboarding/BuyCreditsButton";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR } from "@/lib/config/pricing";

interface PaywallProps {
  onBack: () => void;
  onPurchased: () => void;
}

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

      <div className="mt-8 w-full rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Credit pack</p>
        <p className="mt-3 text-4xl font-semibold text-zinc-900 dark:text-zinc-50">₹{CREDIT_PACK_PRICE_INR}</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">~{CREDIT_PACK_CALLS} calls, buy more anytime</p>
        <div className="mt-6">
          <BuyCreditsButton onSuccess={onPurchased} />
        </div>
      </div>
    </div>
  );
}
