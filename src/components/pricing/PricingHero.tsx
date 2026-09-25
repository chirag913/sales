import { Eyebrow } from "@/components/home/parts";

// Deliberately short: the visitor should have the headline's point in under
// 10 seconds, not a wall of marketing copy.
export function PricingHero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-16 pb-10 sm:pt-24 sm:pb-14">
      <Eyebrow>Pricing</Eyebrow>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-5xl">
        AI calling that scales with your leads.
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
        Simple pricing for standard volumes. Custom plans for high-volume teams.
      </p>

      <div className="mt-10 inline-flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">
          Lead-to-Speed
        </span>
        <span className="hidden h-3.5 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" aria-hidden />
        <span className="hidden text-sm text-zinc-500 dark:text-zinc-400 sm:block">
          For new leads that need to be called, qualified and handed to your sales team.
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 sm:hidden">
        For new leads that need to be called, qualified and handed to your sales team.
      </p>
    </section>
  );
}
