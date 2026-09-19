import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { IllustrativeTag, Section, SectionHeading } from "@/components/home/parts";
import { ViewTracker } from "@/components/home/ViewTracker";

// Outcomes are shown WITHOUT numbers on purpose: no share of a database is
// claimed to be recoverable. The only figure is the example database size.
const OUTCOMES: { label: string; tone: "positive" | "neutral" | "muted" }[] = [
  { label: "Interested", tone: "positive" },
  { label: "Call later", tone: "neutral" },
  { label: "Not interested", tone: "muted" },
  { label: "Wrong number", tone: "muted" },
];

const DOT: Record<(typeof OUTCOMES)[number]["tone"], string> = {
  positive: "bg-teal-600 dark:bg-teal-400",
  neutral: "bg-zinc-400 dark:bg-zinc-500",
  muted: "bg-zinc-200 dark:bg-zinc-800",
};

function StageLabel({ children }: { children: string }) {
  return <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{children}</p>;
}

function Down() {
  return (
    <div aria-hidden className="flex justify-center py-1 text-zinc-300 dark:text-zinc-700">
      <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
        <path d="M6 0v17M1.5 12.5 6 17l4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function RecoveryFlow() {
  return (
    <figure
      aria-label="Illustration of an existing database being called and sorted by outcome"
      className="shadow-premium overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <figcaption className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-900">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Recovery workflow
        </span>
        <IllustrativeTag>Illustrative workflow</IllustrativeTag>
      </figcaption>

      <div className="px-5 py-6">
        <div className="rounded-xl border border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <StageLabel>Existing leads</StageLabel>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">10,000</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">e.g. leads already sitting in your CRM or sheets</p>
        </div>

        <Down />

        <div className="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <StageLabel>AI calling</StageLabel>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">Every lead gets a conversation, not just a missed-call notification.</p>
        </div>

        <Down />

        <div>
          <StageLabel>Sorted by what they say</StageLabel>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {OUTCOMES.map((o) => (
              <li
                key={o.label}
                className="flex items-center gap-2.5 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              >
                <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${DOT[o.tone]}`} />
                {o.label}
              </li>
            ))}
          </ul>
        </div>

        <Down />

        <div className="rounded-xl border border-teal-600/40 bg-teal-50/60 px-4 py-4 dark:border-teal-400/30 dark:bg-teal-400/5">
          <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-teal-700 dark:text-teal-400">
            Recovered opportunities
          </p>
          <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">The interested prospects, handed to your sales team to follow up.</p>
        </div>
      </div>
    </figure>
  );
}

export function LeadRecovery() {
  return (
    <section className="border-y border-zinc-200/70 bg-white dark:border-zinc-900 dark:bg-zinc-950/40">
      <Section id="lead-recovery">
        <ViewTracker event="lead_recovery_view" />
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <SectionHeading
              eyebrow="Lead Recovery"
              title="Go back to the leads you've already paid for."
              description={
                <>
                  Your CRM may already contain hundreds or thousands of leads that were never reached, stopped responding, or
                  weren&apos;t ready when your team called.
                  <span className="mt-4 block">
                    BetterCallz can reconnect with those prospects and identify who is still interested.
                  </span>
                </>
              }
            />
            <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
              Results depend on your database and offer. We don&apos;t promise a recovery rate.
            </p>
          </div>

          <RevealOnScroll>
            <RecoveryFlow />
          </RevealOnScroll>
        </div>
      </Section>
    </section>
  );
}
