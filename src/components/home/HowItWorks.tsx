import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { Section, SectionHeading } from "@/components/home/parts";

const STEPS = [
  { n: "01", title: "Lead comes in", text: "A new lead arrives from Meta Ads, your website, or your existing workflow." },
  { n: "02", title: "BetterCallz calls", text: "AI starts the first conversation with the lead." },
  { n: "03", title: "AI qualifies", text: "The conversation captures intent and relevant information." },
  {
    n: "04",
    title: "Your team gets context",
    text: "Your salesperson knows who is interested and what they need before following up.",
  },
];

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <SectionHeading eyebrow="How BetterCallz works" title="From lead to conversation in minutes." />

      <ol className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {STEPS.map((step, i) => (
          <li key={step.n} className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <RevealOnScroll delayMs={i * 60}>
              <span className="font-mono text-sm font-medium text-teal-700 dark:text-teal-400">{step.n}</span>
              <h3 className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{step.text}</p>
            </RevealOnScroll>
          </li>
        ))}
      </ol>
    </Section>
  );
}
