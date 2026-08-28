import { RevealOnScroll } from "@/components/landing/RevealOnScroll";

const STEPS = [
  {
    number: "01",
    label: "Tell us who you're calling",
    description: "Tell BetterCallz who you sell to and what you're selling.",
  },
  {
    number: "02",
    label: "Take the call",
    description: "Talk to a realistic AI prospect that objects, stalls, and pushes back.",
  },
  {
    number: "03",
    label: "Get coached",
    description: "See your biggest mistake, best moment, and exactly what to try differently next time.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
      <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
        How it works
      </h2>

      <div className="relative mt-16 grid grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
        <div className="absolute left-0 right-0 top-5 hidden h-px bg-zinc-200 dark:bg-zinc-800 sm:block" aria-hidden />
        {STEPS.map((step, i) => (
          <RevealOnScroll key={step.number} delayMs={i * 100} className="relative flex flex-col items-start gap-4 text-left">
            <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white font-mono text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-50">
              {step.number}
            </span>
            <div>
              <p className="font-mono text-xs font-medium tracking-widest text-zinc-400 dark:text-zinc-600">
                {step.label.toUpperCase()}
              </p>
              <p className="mt-2 text-lg text-zinc-800 dark:text-zinc-200">{step.description}</p>
            </div>
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
