import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { FlowRow, Section, SectionHeading } from "@/components/home/parts";

// Only sources the product already supports or the site already names
// (Meta / website leads, Google Sheets, webhook / API, a generic CRM
// integration). No named CRM integrations are claimed.
const SOURCES = ["Meta Ads", "Website", "Existing CRM", "Google Sheets / API"];
const AFTER = ["AI Call", "Qualification", "Sales Context", "Your Sales Team"];

function Down() {
  return (
    <div aria-hidden className="flex justify-center py-3 text-zinc-300 dark:text-zinc-700">
      <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
        <path d="M6 0v17M1.5 12.5 6 17l4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Integrations() {
  return (
    <Section id="workflow">
      <SectionHeading
        title="Works with your existing sales workflow."
        description="You don't need to replace your CRM or your sales team. BetterCallz sits between the lead and the salesperson."
      />

      <RevealOnScroll className="mx-auto mt-12 max-w-4xl">
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {SOURCES.map((s) => (
            <li
              key={s}
              className="rounded-xl border border-zinc-200 px-4 py-3 text-center font-mono text-xs font-medium uppercase tracking-wider text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
            >
              {s}
            </li>
          ))}
        </ul>
        <Down />
        <div className="mx-auto w-fit rounded-xl bg-zinc-900 px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-white dark:bg-zinc-50 dark:text-zinc-900">
          BetterCallz
        </div>
        <Down />
        <FlowRow steps={AFTER} />
      </RevealOnScroll>
    </Section>
  );
}
