import { FlowRow, Section, SectionHeading } from "@/components/home/parts";

const STAGES = ["Lead", "AI Call", "Qualify", "Sales Context", "Your Team"];

export function PricingFlow() {
  return (
    <Section>
      <SectionHeading title="Every lead gets a conversation." />

      <FlowRow steps={STAGES} className="mt-12" />

      <p className="mx-auto mt-10 max-w-xl text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        BetterCallz handles the first conversation and qualification. Your sales team gets the context they need to
        follow up.
      </p>
    </Section>
  );
}
