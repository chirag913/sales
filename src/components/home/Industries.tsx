import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { Section, SectionHeading } from "@/components/home/parts";

const SECONDARY = [
  {
    label: "Education",
    situation: "A prospective student comparing programs.",
    text: "While the enquiry is still active, a timely conversation helps you understand what they're looking for and whether the program fits.",
  },
  {
    label: "Healthcare",
    situation: "An appointment or treatment enquiry.",
    text: "A timely, relevant response helps you understand what they need and get them to the right next step.",
  },
  {
    label: "High-ticket services",
    situation: "A consultation request from someone comparing providers.",
    text: "They may be weighing price and fit. A first conversation helps you see who is serious before your team spends time on it.",
  },
];

// Deliberately short: one primary market and three secondary ones. The
// product is focused, and this page doesn't claim traction in any of them.
export function Industries() {
  return (
    <section className="border-y border-zinc-200/70 bg-white dark:border-zinc-900 dark:bg-zinc-950/40">
      <Section id="industries">
        <SectionHeading eyebrow="Who it's for" title="Built for lead-driven businesses." />

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-5">
          <RevealOnScroll className="lg:col-span-2">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-900 bg-zinc-900 p-7 text-white dark:border-zinc-700 dark:bg-zinc-900">
              <div>
                <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-teal-300">Primary</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">Real Estate</h3>
                <p className="mt-3 leading-relaxed text-zinc-300">
                  Project enquiries, buyer qualification and site visits, where each lead is worth a lot and the window to reach
                  them is short.
                </p>
              </div>
              <a href="#real-estate" className="mt-8 text-sm font-medium text-teal-300 underline-offset-4 hover:underline">
                See the example →
              </a>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 lg:col-span-3">
            {SECONDARY.map((item, i) => (
              <RevealOnScroll key={item.label} delayMs={(i + 1) * 80}>
                <div className="h-full rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                  <p className="font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{item.label}</p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{item.situation}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{item.text}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </Section>
    </section>
  );
}
