const STEPS = [
  {
    number: "01",
    title: "Set your ICP once",
    description: "Describe who you sell to and what you're selling — takes under a minute.",
  },
  {
    number: "02",
    title: "Take the call",
    description: "Dial a realistic AI prospect that objects, stalls, and pushes back like a real one would.",
  },
  {
    number: "03",
    title: "See exactly what to fix",
    description: "Get a scored breakdown — biggest mistake, best moment, and what to say differently next time.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">How it works</h2>
      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.number} className="text-center sm:text-left">
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{step.number}</span>
            <h3 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{step.title}</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
