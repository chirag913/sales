import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { Section, SectionHeading } from "@/components/home/parts";

const TIMELINE = [
  "Lead generated",
  "Sales team notified",
  "Manual follow-up",
  "Missed call",
  "No response",
  "Lead forgotten",
];

// Each step's marker is a little fainter than the last: the lead fading out of
// view. Only the markers fade; the text stays fully legible.
const OPACITY = ["opacity-100", "opacity-90", "opacity-75", "opacity-60", "opacity-50", "opacity-40"];

export function LeadGap() {
  return (
    <section className="border-y border-zinc-200/70 bg-white dark:border-zinc-900 dark:bg-zinc-950/40">
      <Section>
        <SectionHeading
          eyebrow="The gap"
          title="You already paid for the lead."
          description="The hardest part isn't always generating leads. It's reaching them at the right time and following up consistently."
        />

        <RevealOnScroll className="mt-14">
          <ol className="relative grid grid-cols-1 gap-5 lg:grid-cols-6 lg:gap-4">
            <span aria-hidden className="absolute bottom-3 left-[5px] top-3 w-px bg-zinc-200 dark:bg-zinc-800 lg:hidden" />
            <span
              aria-hidden
              className="absolute left-0 right-0 top-[5px] hidden h-px bg-gradient-to-r from-zinc-300 to-transparent dark:from-zinc-700 lg:block"
            />
            {TIMELINE.map((step, i) => (
              <li key={step} className="relative flex items-center gap-4 lg:flex-col lg:items-start lg:gap-4">
                <span
                  aria-hidden
                  className={`relative z-10 h-[11px] w-[11px] shrink-0 rounded-full border-2 ${OPACITY[i]} ${
                    i === TIMELINE.length - 1
                      ? "border-zinc-400 bg-zinc-400 dark:border-zinc-600 dark:bg-zinc-600"
                      : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"
                  }`}
                />
                <span className="font-mono text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </RevealOnScroll>

        <RevealOnScroll className="mt-14 flex items-center gap-4">
          <span aria-hidden className="h-px w-10 shrink-0 bg-teal-600 dark:bg-teal-400" />
          <p className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl">
            BetterCallz helps turn that gap into a conversation.
          </p>
        </RevealOnScroll>
      </Section>
    </section>
  );
}
