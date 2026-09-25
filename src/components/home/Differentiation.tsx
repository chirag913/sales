import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { FlowRow, Section } from "@/components/home/parts";

const FLOW = ["Lead", "AI Call", "Qualify", "Sales Context", "Your Team"];

// The positioning right under the hero: BetterCallz is the missing step
// between a lead and a salesperson, not a replacement for either.
export function Differentiation() {
  return (
    <section className="border-y border-zinc-200/70 bg-white dark:border-zinc-900 dark:bg-zinc-950/40">
      <Section className="text-center">
        <h2 className="mx-auto max-w-3xl text-3xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          <span className="block text-zinc-500 dark:text-zinc-400">Your CRM already has the lead.</span>
          <span className="block text-zinc-500 dark:text-zinc-400">Your sales team already knows how to sell.</span>
          <span className="mt-2 block">The missing step is the first conversation.</span>
        </h2>
        <p className="mt-5 text-lg text-zinc-500 dark:text-zinc-400">BetterCallz handles that first conversation.</p>

        <RevealOnScroll>
          <FlowRow steps={FLOW} className="mt-12" />
        </RevealOnScroll>
      </Section>
    </section>
  );
}
