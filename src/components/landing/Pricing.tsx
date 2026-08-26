import Link from "next/link";
import { PRIMARY_LINK_CLASSES, SECONDARY_LINK_CLASSES } from "@/components/landing/linkButtonClasses";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR, TRIAL_CALLS, TRIAL_CALL_MINUTES } from "@/lib/config/pricing";

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-4xl px-6 py-20">
      <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Pricing</h2>
      <p className="mt-3 text-center text-zinc-500 dark:text-zinc-400">Start free. Buy more calls only if you need them.</p>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Free trial</p>
          <p className="mt-3 text-4xl font-semibold text-zinc-900 dark:text-zinc-50">₹0</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {TRIAL_CALLS} calls, {TRIAL_CALL_MINUTES} min each
          </p>
          <Link href="/practice" className={`${SECONDARY_LINK_CLASSES} mt-6 w-full`}>
            Start free
          </Link>
        </div>

        <div className="relative rounded-2xl border-2 border-emerald-600 bg-white p-6 shadow-sm dark:border-emerald-500 dark:bg-zinc-950">
          <span className="absolute -top-3 left-6 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white dark:bg-emerald-500">
            Most popular
          </span>
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Credit pack</p>
          <p className="mt-3 text-4xl font-semibold text-zinc-900 dark:text-zinc-50">₹{CREDIT_PACK_PRICE_INR}</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">~{CREDIT_PACK_CALLS} calls, buy more anytime</p>
          <Link href="/practice" className={`${PRIMARY_LINK_CLASSES} mt-6 w-full`}>
            Buy credits
          </Link>
        </div>
      </div>
    </section>
  );
}
