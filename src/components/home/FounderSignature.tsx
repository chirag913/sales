import Image from "next/image";

// A quiet signature, not a card: a small circular photo, one line, a name.
// Shared by the home page and /about so the two read as the same person.
export function FounderSignature({ quote = true }: { quote?: boolean }) {
  return (
    <figure className="flex items-start gap-4">
      <Image
        src="/founder-chirag.png"
        alt="Chirag Sharma"
        width={48}
        height={48}
        className="mt-0.5 h-12 w-12 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0">
        {quote && (
          <blockquote className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
            &ldquo;Don&apos;t give your sales team more leads. Give them more conversations worth having.&rdquo;
          </blockquote>
        )}
        <figcaption className={`${quote ? "mt-2 " : ""}text-sm text-zinc-500 dark:text-zinc-400`}>
          — Chirag Sharma, Founder, BetterCallz
        </figcaption>
      </div>
    </figure>
  );
}

export function FounderLine() {
  return (
    <section aria-label="From the founder" className="mx-auto w-full max-w-6xl px-6 pb-16 sm:pb-20">
      <div className="max-w-xl">
        <FounderSignature />
      </div>
    </section>
  );
}
