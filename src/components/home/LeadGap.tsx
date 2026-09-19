import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { Section, SectionHeading } from "@/components/home/parts";

// An illustrative sequence, not measured data: the times are examples of how a
// missed follow-up tends to play out, not figures from any customer.
const TIMELINE = [
  { time: "9:00 AM", label: "Lead comes in" },
  { time: "9:02 AM", label: "No call yet" },
  { time: "9:35 AM", label: "First follow-up attempt" },
  { time: "Next day", label: "Still no response" },
  { time: "After that", label: "Lead forgotten" },
];

// Each step's marker is a little fainter than the last: the lead fading out of
// view. Only the markers fade; the text stays fully legible.
const OPACITY = ["opacity-100", "opacity-85", "opacity-70", "opacity-55", "opacity-40"];

export function LeadGap() {
  return (
    <section className="border-y border-zinc-200/70 bg-white dark:border-zinc-900 dark:bg-zinc-950/40">
      <Section>
        <SectionHeading
          eyebrow="The gap"
          title="The lead came in. The conversation didn't."
          description="A lead is only worth what happens next, and what happens next often depends on a busy person remembering to pick up the phone."
        />

        <RevealOnScroll className="mt-14">
          <ol className="relative grid grid-cols-1 gap-5 lg:grid-cols-5 lg:gap-4">
            <span aria-hidden className="absolute bottom-3 left-[5px] top-3 w-px bg-zinc-200 dark:bg-zinc-800 lg:hidden" />
            <span
              aria-hidden
              className="absolute left-0 right-0 top-[5px] hidden h-px bg-gradient-to-r from-zinc-300 to-transparent dark:from-zinc-700 lg:block"
            />
            {TIMELINE.map((step, i) => (
              <li key={step.label} className="relative flex items-center gap-4 lg:flex-col lg:items-start lg:gap-4">
                <span
                  aria-hidden
                  className={`relative z-10 h-[11px] w-[11px] shrink-0 rounded-full border-2 ${OPACITY[i]} ${
                    i === TIMELINE.length - 1
                      ? "border-zinc-400 bg-zinc-400 dark:border-zinc-600 dark:bg-zinc-600"
                      : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"
                  }`}
                />
                <span className="flex flex-col gap-1">
                  <span className="font-mono text-xs font-medium uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                    {step.time}
                  </span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{step.label}</span>
                </span>
              </li>
            ))}
          </ol>
        </RevealOnScroll>

        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
          An illustrative example, not measured customer data.
        </p>

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
