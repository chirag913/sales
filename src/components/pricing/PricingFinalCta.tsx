import { TalkToUsLink, TryDemoLink } from "@/components/home/CtaLinks";
import { PRIMARY_LINK_CLASSES, SECONDARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

// The closing CTA on both the home page and /pricing. `from` tags the clicks.
export function PricingFinalCta({ from }: { from: string }) {
  return (
    <section className="border-t border-zinc-200/70 dark:border-zinc-900">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 text-center sm:py-28">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Ready to see what BetterCallz can do with your leads?
        </h2>
        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <TryDemoLink from={from} className={`${PRIMARY_LINK_CLASSES} px-6 py-3 text-base`} />
          <TalkToUsLink from={from} className={`${SECONDARY_LINK_CLASSES} px-6 py-3 text-base`} />
        </div>
      </div>
    </section>
  );
}
