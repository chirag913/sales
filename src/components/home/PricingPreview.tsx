import Link from "next/link";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { Section, SectionHeading } from "@/components/home/parts";
import { PLANS } from "@/components/pricing/PricingCards";
import { SECONDARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

// A short preview of /pricing. Reads the same PLANS list as the pricing page,
// so prices can only ever be changed in one place.
export function PricingPreview() {
  return (
    <section className="border-y border-zinc-200/70 bg-white dark:border-zinc-900 dark:bg-zinc-950/40">
      <Section id="pricing">
        <SectionHeading
          title="Simple pricing for standard volumes."
          description="High-volume teams get custom pricing based on actual calling usage."
        />

        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <RevealOnScroll key={plan.id} delayMs={i * 60} className="h-full">
              <div
                className={`h-full rounded-2xl p-6 ${
                  plan.custom
                    ? "border border-dashed border-zinc-300 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-900/30"
                    : "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                }`}
              >
                <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                  {plan.name}
                </p>
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{plan.price}</span>
                  {plan.priceSuffix && <span className="text-sm text-zinc-500 dark:text-zinc-400">{plan.priceSuffix}</span>}
                </p>
                <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">{plan.volume}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>

        <Link href="/pricing" className={`${SECONDARY_LINK_CLASSES} mt-10 px-5 py-2.5`}>
          View Pricing →
        </Link>
      </Section>
    </section>
  );
}
