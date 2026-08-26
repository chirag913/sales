import Link from "next/link";
import { PRIMARY_LINK_CLASSES, SECONDARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

export function Hero() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-14 px-6 pb-24 pt-20 sm:pt-28 lg:flex-row lg:items-center lg:gap-12">
      <div className="max-w-xl text-center lg:text-left">
        <h1 className="text-4xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Practice cold calls on an AI that argues back — before you call a real lead
        </h1>
        <p className="mt-5 text-lg text-zinc-500 dark:text-zinc-400">
          Set your ICP, dial a realistic AI prospect, and get a scored breakdown of exactly what to fix.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
          <Link href="/practice" className={`${PRIMARY_LINK_CLASSES} px-6 py-3 text-base`}>
            Start your free call
          </Link>
          <a href="#how-it-works" className={`${SECONDARY_LINK_CLASSES} px-6 py-3 text-base`}>
            See how it works
          </a>
        </div>
      </div>

      <div className="w-full max-w-sm shrink-0">
        <div className="rounded-2xl border border-zinc-200/70 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Ashley Taylor</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Operations Manager · Bellwood Cleaning Co.</p>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              04:12
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl bg-zinc-900 px-3 py-1.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                Hi Ashley, quick question about how you&apos;re finding new clients right now.
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl bg-zinc-100 px-3 py-1.5 text-xs text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                Mostly referrals, honestly. Why, what&apos;s this about?
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Call score</span>
            <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">78/100</span>
          </div>
        </div>
      </div>
    </section>
  );
}
