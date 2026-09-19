import Link from "next/link";
import { LiveCallDemo } from "@/components/landing/LiveCallDemo";
import { PRIMARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

export function Hero() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-16 px-6 pb-24 pt-16 sm:pt-24 lg:flex-row lg:items-center lg:gap-14 lg:pt-28">
      <div className="max-w-xl text-center lg:text-left">
        <p className="font-mono text-xs font-medium tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
          BEFORE THE REAL CALL
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
          Your reps shouldn&apos;t learn on your prospects.
        </h1>
        <p className="mt-6 text-lg text-zinc-500 dark:text-zinc-400">
          Practice realistic sales conversations with AI prospects before your team makes the real call.
        </p>
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          For Indian BPOs, appointment-setting teams, agencies and sales teams selling to the US, UK, Canada and Australia.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
          <Link href="/practice" className={`${PRIMARY_LINK_CLASSES} group px-6 py-3 text-base`}>
            Start 2 Free Calls
            <span aria-hidden className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
          <span className="text-sm text-zinc-400 dark:text-zinc-600">No credit card · 5 min per call</span>
        </div>
      </div>

      <LiveCallDemo />
    </section>
  );
}
