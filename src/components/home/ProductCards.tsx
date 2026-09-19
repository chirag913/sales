import Link from "next/link";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { Eyebrow, Section, SectionHeading, WorkflowList } from "@/components/home/parts";
import { SECONDARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

interface ProductCard {
  label: string;
  headline: string;
  description: string;
  steps: string[];
  cta: string;
  href: string;
}

const CARDS: ProductCard[] = [
  {
    label: "Instant Lead Calling",
    headline: "New lead? Start the conversation right away.",
    description:
      "When a new lead comes in, BetterCallz can start the first conversation before your salesperson gets to it, find out what the lead wants, and hand your team an opportunity with context.",
    steps: ["New lead", "First conversation", "Qualification", "Sales opportunity"],
    cta: "Explore Instant Calling",
    href: "#instant-calling",
  },
  {
    label: "Lead Recovery",
    headline: "Your old leads aren't necessarily dead.",
    description: "Give your existing database a new conversation. BetterCallz finds out who is still interested and hands those people to your sales team.",
    steps: ["Existing database", "New conversation", "Identify interest", "Sales opportunity"],
    cta: "Explore Lead Recovery",
    href: "#lead-recovery",
  },
];

export function ProductCards() {
  return (
    <Section id="products">
      <SectionHeading title="Two ways BetterCallz turns leads into conversations." />
      <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2">
        {CARDS.map((card, i) => (
          <RevealOnScroll key={card.label} delayMs={i * 100} className="h-full">
            <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 sm:p-8">
              <Eyebrow>{card.label}</Eyebrow>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50">
                {card.headline}
              </h3>
              <p className="mt-3 leading-relaxed text-zinc-500 dark:text-zinc-400">{card.description}</p>
              <div className="mt-8 flex-1 border-t border-zinc-100 pt-7 dark:border-zinc-900">
                <WorkflowList steps={card.steps} />
              </div>
              <Link href={card.href} className={`${SECONDARY_LINK_CLASSES} mt-8 self-start`}>
                {card.cta}
                <span aria-hidden className="ml-1.5">
                  →
                </span>
              </Link>
            </article>
          </RevealOnScroll>
        ))}
      </div>
    </Section>
  );
}
