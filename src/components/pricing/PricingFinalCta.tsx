import { TrackedLink } from "@/components/home/TrackedLink";
import { PRIMARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

export function PricingFinalCta() {
  return (
    <section className="border-t border-zinc-200/70 dark:border-zinc-900">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 text-center sm:py-28">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Ready to see what BetterCallz can do with your leads?
        </h2>
        <div className="mt-8 flex justify-center">
          <TrackedLink
            href="/#get-started"
            event="pricing_cta_clicked"
            eventProps={{ plan: "final_cta" }}
            className={`${PRIMARY_LINK_CLASSES} px-6 py-3 text-base`}
          >
            Talk to Us
          </TrackedLink>
        </div>
      </div>
    </section>
  );
}
