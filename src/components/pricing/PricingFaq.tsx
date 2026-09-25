import { Section, SectionHeading } from "@/components/home/parts";

const FAQ = [
  {
    q: "Do you replace our sales team?",
    a: "No. BetterCallz handles the first conversation and qualification. Your sales team handles the opportunities.",
  },
  {
    q: "Can you handle more than 5,000 leads?",
    a: "Yes. High-volume plans are custom based on lead volume and actual calling usage.",
  },
  {
    q: "How does high-volume pricing work?",
    a: "Pricing depends mainly on connect rate and average conversation duration. We can measure actual usage during a pilot and then finalize the plan.",
  },
  {
    q: "Can BetterCallz work with our existing CRM?",
    a: "Yes. Integration depends on your CRM and workflow. Setup requirements are quoted separately when needed.",
  },
  {
    q: "Can I test BetterCallz before committing?",
    a: "For larger deployments, we can start with a controlled pilot and use the actual calling data to finalize the plan.",
  },
];

export function PricingFaq() {
  return (
    <Section>
      <SectionHeading eyebrow="FAQ" title="Questions worth answering upfront." />

      <dl className="mt-10 max-w-3xl divide-y divide-zinc-200 dark:divide-zinc-800">
        {FAQ.map(({ q, a }) => (
          <div key={q} className="py-6 first:pt-0">
            <dt className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{a}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
