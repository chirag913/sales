import { Section, SectionHeading } from "@/components/home/parts";

const ITEMS = ["Google Sheets", "Webhook / API", "CRM Integration"];

export function PricingWorkflow() {
  return (
    <section className="border-y border-zinc-200/70 bg-white dark:border-zinc-900 dark:bg-zinc-950/40">
      <Section>
        <SectionHeading
          title="Works with your existing workflow."
          description="Keep your CRM. Keep your sales team. BetterCallz handles the conversation between the lead and the salesperson."
        />

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {ITEMS.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-zinc-200 px-5 py-4 text-sm font-medium text-zinc-800 dark:border-zinc-800 dark:text-zinc-200"
            >
              {item}
            </div>
          ))}
        </div>
      </Section>
    </section>
  );
}
