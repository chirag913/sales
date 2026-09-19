import { TrackedLink } from "@/components/home/TrackedLink";
import { SECONDARY_LINK_CLASSES } from "@/components/ui/linkButtonClasses";

// Deliberately smaller and quieter than the lead-response sections: a
// different audience (teams selling abroad) with a different product.
export function OutboundCallout() {
  return (
    <section aria-labelledby="outbound-heading" className="mx-auto w-full max-w-6xl px-6 pb-20 sm:pb-28">
      <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white px-6 py-8 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="max-w-2xl">
          <h2 id="outbound-heading" className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Building an international outbound sales team?
          </h2>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            BetterCallz also helps Indian sales teams practice realistic sales conversations before calling prospects in the US,
            UK, Canada and Australia.
          </p>
        </div>
        <TrackedLink
          href="/outbound"
          event="outbound_clicked"
          eventProps={{ from: "home_callout" }}
          className={`${SECONDARY_LINK_CLASSES} shrink-0 self-start sm:self-center`}
        >
          Explore Outbound →
        </TrackedLink>
      </div>
    </section>
  );
}
