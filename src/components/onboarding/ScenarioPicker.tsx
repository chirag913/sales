"use client";

import { Scenario } from "@/lib/types";

interface ScenarioPickerProps {
  scenarios: Scenario[];
  onSelect: (scenario: Scenario) => void;
  onBack: () => void;
}

const DIFFICULTY_STYLE: Record<Scenario["difficulty"], string> = {
  Easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Hard: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Expert: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export function ScenarioPicker({ scenarios, onSelect, onBack }: ScenarioPickerProps) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
      >
        ← Edit setup
      </button>

      <div className="mb-8 mt-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Choose your challenge.</h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Pick a scenario to start practicing.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onSelect(scenario)}
            className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-200/70 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                <span aria-hidden>{scenario.icon}</span>
                {scenario.name}
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFFICULTY_STYLE[scenario.difficulty]}`}
              >
                {scenario.difficulty}
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{scenario.description}</p>
            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Objective: {scenario.objective}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
