import { TalkToUsLink, TryDemoLink } from "@/components/home/CtaLinks";
import { DetailRow, Eyebrow, IllustrativeTag } from "@/components/home/parts";
import { PRIMARY_LINK_CLASSES, SECONDARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

// Five stages: globals.css animates exactly .stage-1 … .stage-5.
const STAGES = ["Lead received", "BetterCallz calls", "AI conversation", "Qualified", "Sales team"];

// Product visualization of the intended workflow: a lead arrives, is called,
// is qualified, and the team gets a structured result. It is a static
// illustration with a slow, looping highlight, NOT a live call: there is no
// timer, no counter and nothing that pretends to be real-time activity.
function LeadFlowVisual() {
  return (
    <figure
      aria-label="Illustration of a new lead being called and qualified"
      className="shadow-premium w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <figcaption className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-900">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Lead workflow
        </span>
        <IllustrativeTag />
      </figcaption>

      <div className="px-5 pt-5">
        <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Meta / website lead</p>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
          >
            RS
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">Rahul Sharma</p>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">Interested in 3 BHK</p>
          </div>
        </div>
      </div>

      <ol className="relative mt-5 flex flex-col gap-3 px-5">
        <span aria-hidden className="absolute bottom-2 left-[25px] top-2 w-px bg-zinc-200 dark:bg-zinc-800" />
        {STAGES.map((stage, i) => (
          <li key={stage} className="relative flex items-center gap-3.5">
            <span
              aria-hidden
              className={`stage-dot stage-${i + 1} relative z-10 h-[11px] w-[11px] shrink-0 rounded-full border-2`}
            />
            <span className={`stage-label stage-${i + 1} font-mono text-xs font-medium uppercase tracking-wide`}>{stage}</span>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-zinc-100 bg-zinc-50/60 px-5 py-4 dark:border-zinc-900 dark:bg-zinc-900/30">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            What your sales team sees
          </span>
          <span className="rounded-md bg-teal-700 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white dark:bg-teal-400 dark:text-zinc-950">
            High intent
          </span>
        </div>
        <dl className="mt-2">
          <DetailRow label="Budget" value="₹1.5–2 Cr" />
          <DetailRow label="Timeline" value="30 days" />
          <DetailRow label="Requirement" value="3 BHK" />
          <DetailRow label="Next step" value="Site visit" />
        </dl>
      </div>
    </figure>
  );
}

export function HomeHero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="bg-dot-grid absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 px-6 pb-20 pt-14 sm:pt-20 lg:flex-row lg:items-center lg:gap-16 lg:pb-28 lg:pt-24">
        <div className="max-w-xl text-center lg:flex-1 lg:text-left">
          <Eyebrow>AI Sales Calling</Eyebrow>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            <span className="block">You already paid for the lead.</span>
            <span className="block">Make sure someone calls it.</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            BetterCallz calls new leads, has the first conversation, qualifies their intent, and gives your sales team the
            context to follow up.
          </p>
          <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
            <TryDemoLink from="hero" className={`${PRIMARY_LINK_CLASSES} px-6 py-3 text-base`} />
            <TalkToUsLink from="hero" className={`${SECONDARY_LINK_CLASSES} px-6 py-3 text-base`} />
          </div>
        </div>

        <div className="flex w-full justify-center lg:w-auto lg:flex-1 lg:justify-end">
          <LeadFlowVisual />
        </div>
      </div>
    </section>
  );
}
