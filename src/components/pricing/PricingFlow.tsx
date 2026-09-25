import { Section, SectionHeading } from "@/components/home/parts";

const STAGES = ["Lead", "AI Call", "Qualify", "Sales Context", "Your Team"];

function Arrow() {
  return (
    <span aria-hidden className="mx-1 shrink-0 text-zinc-300 dark:text-zinc-700 sm:mx-2">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden rotate-90 sm:block sm:rotate-0">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="block sm:hidden">
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </span>
  );
}

export function PricingFlow() {
  return (
    <Section>
      <SectionHeading title="Every lead gets a conversation." />

      <div className="mt-12 flex flex-col items-center sm:flex-row sm:flex-wrap sm:justify-center">
        {STAGES.map((stage, i) => (
          <div key={stage} className="flex flex-col items-center sm:flex-row">
            {i > 0 && <Arrow />}
            <span
              className={`rounded-xl border px-5 py-3 font-mono text-xs font-medium uppercase tracking-wider ${
                i === STAGES.length - 1
                  ? "border-teal-600 text-teal-700 dark:border-teal-400 dark:text-teal-400"
                  : "border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              }`}
            >
              {stage}
            </span>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-xl text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        BetterCallz handles the first conversation and qualification. Your sales team gets the context they need to
        follow up.
      </p>
    </Section>
  );
}
