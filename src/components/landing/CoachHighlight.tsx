"use client";

import { useEffect, useRef, useState } from "react";
import { useCountUp } from "@/components/landing/LiveCallDemo";
import { useReducedMotion } from "@/components/landing/useReducedMotion";

const SUB_SCORES = [
  { label: "Opening", value: 82 },
  { label: "Discovery", value: 76 },
  { label: "Objection handling", value: 61 },
  { label: "Close", value: 73 },
];

function ScoreBar({ label, value, active, delayMs }: { label: string; value: number; active: boolean; delayMs: number }) {
  const display = useCountUp(value, active, 900);
  const reducedMotion = useReducedMotion();

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
        <span className="font-mono text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{display}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-[900ms] ease-out"
          style={{
            width: active ? `${value}%` : "0%",
            transitionDelay: reducedMotion ? "0ms" : `${delayMs}ms`,
          }}
        />
      </div>
    </div>
  );
}

export function CoachHighlight() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const headlineScore = useCountUp(61, active, 900);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="border-y border-zinc-200/70 bg-zinc-50/60 py-24 dark:border-zinc-800 dark:bg-zinc-950/40 sm:py-32">
      <div ref={sectionRef} className="mx-auto max-w-5xl px-6">
        <p className="font-mono text-xs font-medium tracking-widest text-emerald-600 dark:text-emerald-400">
          AI COACH
        </p>
        <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Know exactly where you lost them.
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="rounded-3xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
            <p className="font-mono text-[10px] font-medium tracking-widest text-zinc-400 dark:text-zinc-600">
              OBJECTION HANDLING
            </p>
            <p className="mt-2 text-4xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
              {headlineScore}
              <span className="text-lg text-zinc-400 dark:text-zinc-600"> / 100</span>
            </p>
            <p className="mt-5 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
              &ldquo;You defended your offer too quickly.&rdquo;
            </p>
            <p className="mt-3 text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">Better move:</span> &ldquo;Ask what
              they&apos;re currently doing instead.&rdquo;
            </p>
          </div>

          <div className="flex flex-col justify-center gap-7">
            {SUB_SCORES.map((score, i) => (
              <ScoreBar key={score.label} label={score.label} value={score.value} active={active} delayMs={i * 120} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
