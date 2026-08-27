"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BuyCreditsButton } from "@/components/onboarding/BuyCreditsButton";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { SECONDARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";
import { CREDIT_PACK_CALLS, CREDIT_PACK_PRICE_INR, TRIAL_CALLS, TRIAL_CALL_MINUTES } from "@/lib/config/pricing";

export function Pricing() {
  const router = useRouter();

  return (
    <section id="pricing" className="mx-auto max-w-4xl px-6 py-24 sm:py-32">
      <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
        Pricing
      </h2>
      <p className="mt-3 text-center text-zinc-500 dark:text-zinc-400">Start free. Buy more calls only if you need them.</p>

      <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <RevealOnScroll className="rounded-3xl border border-zinc-200/70 bg-white p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="font-mono text-xs font-medium tracking-widest text-zinc-400 dark:text-zinc-600">FREE</p>
          <p className="mt-3 text-4xl font-semibold text-zinc-900 dark:text-zinc-50">₹0</p>
          <ul className="mt-5 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>{TRIAL_CALLS} practice calls</li>
            <li>{TRIAL_CALL_MINUTES} min max per call</li>
            <li>No credit card</li>
          </ul>
          <Link href="/practice" className={`${SECONDARY_LINK_CLASSES} mt-7 w-full`}>
            Start free
          </Link>
        </RevealOnScroll>

        <RevealOnScroll
          delayMs={100}
          className="relative rounded-3xl border-2 border-emerald-600 bg-white p-7 shadow-sm dark:border-emerald-500 dark:bg-zinc-950"
        >
          <p className="font-mono text-xs font-medium tracking-widest text-emerald-600 dark:text-emerald-400">PAID</p>
          <p className="mt-3 text-4xl font-semibold text-zinc-900 dark:text-zinc-50">₹{CREDIT_PACK_PRICE_INR}</p>
          <ul className="mt-5 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            <li>{CREDIT_PACK_CALLS} practice calls</li>
            <li>{TRIAL_CALL_MINUTES} min max per call</li>
            <li>No subscription</li>
          </ul>
          <div className="mt-7">
            <BuyCreditsButton onSuccess={() => router.push("/practice")} label="Buy 40 calls" />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
