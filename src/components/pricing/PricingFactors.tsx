import { Section, SectionHeading } from "@/components/home/parts";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";

const FACTORS = [
  {
    n: "01",
    label: "Lead volume",
    text: "How many new leads enter your system each month.",
  },
  {
    n: "02",
    label: "Connect rate",
    text: "How many leads actually answer the AI call.",
  },
  {
    n: "03",
    label: "Conversation length",
    text: "How long each connected conversation lasts.",
  },
];

export function PricingFactors() {
  return (
    <section className="border-y border-zinc-200/70 bg-white dark:border-zinc-900 dark:bg-zinc-950/40">
      <Section>
        <SectionHeading title="What determines your price?" />

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
          {FACTORS.map((f, i) => (
            <RevealOnScroll key={f.n} delayMs={i * 80}>
              <p className="font-mono text-xs font-medium tracking-widest text-zinc-400 dark:text-zinc-600">{f.n}</p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{f.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{f.text}</p>
            </RevealOnScroll>
          ))}
        </div>

        <p className="mt-12 max-w-2xl border-t border-zinc-200 pt-6 text-sm leading-relaxed text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          For high-volume deployments, we can start with a controlled pilot and use actual calling data to finalize
          the commercial.
        </p>
      </Section>
    </section>
  );
}
