const INDUSTRIES = ["Commercial cleaning", "SaaS", "Real estate", "Home services", "B2B agencies"];
const PERSONAS = ["Gatekeeper", "Skeptical owner", "Rushed decision-maker", "Budget-conscious"];

export function IcpPreview() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Set your ICP, pick a persona style
        </h2>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">
          Tell it who you actually sell to, then choose how tough the prospect should be.
        </p>
      </div>

      <div className="mt-10 rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Target industry</p>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((industry, i) => (
            <span
              key={industry}
              className={`rounded-full border px-3 py-1 text-sm ${
                i === 0
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              {industry}
            </span>
          ))}
        </div>

        <p className="mb-3 mt-6 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Persona style</p>
        <div className="flex flex-wrap gap-2">
          {PERSONAS.map((persona, i) => (
            <span
              key={persona}
              className={`rounded-full border px-3 py-1 text-sm ${
                i === 1
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              {persona}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
