"use client";

import { useState } from "react";

interface ProspectExample {
  industry: string;
  name: string;
  title: string;
  company: string;
  style: string;
}

const PROSPECTS: ProspectExample[] = [
  { industry: "Commercial Cleaning", name: "James Miller", title: "Owner", company: "ABC Commercial Cleaning", style: "Skeptical" },
  { industry: "SaaS", name: "Sarah Miller", title: "VP Sales", company: "Acme Software", style: "Rushed" },
  { industry: "Real Estate", name: "Diana Cole", title: "Broker", company: "Cole & Associates Realty", style: "Busy" },
  { industry: "Home Services", name: "Mike Torres", title: "Owner", company: "Torres Home Services", style: "Guarded" },
  { industry: "B2B Agencies", name: "Priya Nair", title: "Head of Growth", company: "Northbridge Agency", style: "Direct" },
];

export function IcpPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  const prospect = PROSPECTS[activeIndex];

  return (
    <section className="mx-auto max-w-4xl px-6 py-24 sm:py-32">
      <div className="text-center">
        <p className="font-mono text-xs font-medium tracking-widest text-emerald-600 dark:text-emerald-400">
          WHO YOU&apos;RE CALLING
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Practice against the prospects you actually sell to
        </h2>
        <p className="mx-auto mt-4 max-w-md text-zinc-500 dark:text-zinc-400">
          Choose your industry, decision-maker, and difficulty. BetterCallz adapts the prospect to your offer.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2" role="tablist" aria-label="Industries">
        {PROSPECTS.map((p, i) => (
          <button
            key={p.industry}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            onClick={() => setActiveIndex(i)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black ${
              i === activeIndex
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600"
            }`}
          >
            {p.industry}
          </button>
        ))}
      </div>

      <div
        key={prospect.industry}
        className="animate-reveal-up mx-auto mt-8 max-w-sm rounded-3xl border border-zinc-200/70 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{prospect.name}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {prospect.title} · {prospect.company}
        </p>
        <span className="mt-4 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {prospect.style}
        </span>
      </div>
    </section>
  );
}
