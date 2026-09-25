import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { TryDemoLink } from "@/components/home/CtaLinks";
import { Section, SectionHeading } from "@/components/home/parts";

const SECONDARY = [
  { label: "Education", text: "Respond to admission enquiries quickly and identify serious applicants." },
  {
    label: "High-ticket services",
    text: "Have the first conversation before your sales team spends time qualifying.",
  },
];

// Deliberately short: one primary market and two secondary ones. The
// product is focused, and this page doesn't claim traction in any of them.
export function Industries() {
  return (
    <section className="border-y border-zinc-200/70 bg-white dark:border-zinc-900 dark:bg-zinc-950/40">
      <Section id="industries">
        <SectionHeading eyebrow="Built for lead-driven businesses" title="One problem. Many sales teams." />

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-5">
          <RevealOnScroll className="lg:col-span-2">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-900 bg-zinc-900 p-7 text-white dark:border-zinc-700 dark:bg-zinc-900">
              <div>
                <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-teal-300">Primary</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">Real Estate</h3>
                <p className="mt-3 text-lg leading-relaxed text-zinc-200">
                  Call and qualify every property enquiry before your salesperson follows up.
                </p>
              </div>
              <TryDemoLink
                from="industries_real_estate"
                className="mt-8 inline-flex items-center justify-center self-start rounded-xl bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                See a Real Estate AI Call →
              </TryDemoLink>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-span-3">
            {SECONDARY.map((item, i) => (
              <RevealOnScroll key={item.label} delayMs={(i + 1) * 80}>
                <div className="h-full rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                  <h3 className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">{item.label}</h3>
                  <p className="mt-3 text-lg font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-50">{item.text}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </Section>
    </section>
  );
}
