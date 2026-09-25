import { RevealOnScroll } from "@/components/landing/RevealOnScroll";

// The one dark band on the page, so this statement stands apart from the
// sections around it.
export function PositioningStatement() {
  return (
    <section className="bg-zinc-900 text-white dark:border-y dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-28">
        <RevealOnScroll className="max-w-3xl">
          <h2 className="font-mono text-xs font-medium uppercase leading-relaxed tracking-[0.2em] text-teal-300">
            <span className="block">Don&apos;t replace your CRM.</span>
            <span className="block">Don&apos;t replace your sales team.</span>
          </h2>
          <p className="mt-6 text-3xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
            Fix what happens between the lead and the salesperson.
          </p>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
            Your existing systems can keep doing what they already do. BetterCallz handles the first conversation and sends the
            useful context back into your workflow.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
