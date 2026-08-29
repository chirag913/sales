"use client";

import { Dice5 } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { ProspectGenderPreference } from "@/lib/prospect/identity";
import { Scenario } from "@/lib/types";

interface ScenarioPickerProps {
  scenarios: Scenario[];
  onSelect: (scenario: Scenario) => void;
  onBack: () => void;
  voicePreference: ProspectGenderPreference;
  onVoicePreferenceChange: (preference: ProspectGenderPreference) => void;
}

const DIFFICULTY_STYLE: Record<Scenario["difficulty"], string> = {
  Easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Hard: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Expert: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

// Fixed per-tier marker — deliberately the same quiet dot for every
// difficulty, not a per-scenario emoji the model invents (that produced
// things like a skull for "Expert", which reads as gaming-app tone rather
// than the muted, restrained visual language used everywhere else). The
// color alone (DIFFICULTY_STYLE, inherited via currentColor) is what
// actually signals severity here.
const DIFFICULTY_ICON: Record<Scenario["difficulty"], string> = {
  Easy: "●",
  Medium: "●",
  Hard: "●",
  Expert: "●",
};

const VOICE_PREFERENCE_OPTIONS: { value: ProspectGenderPreference; label: string }[] = [
  { value: "any", label: "Any voice" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

// Safety net, not the primary fix (that's the SYSTEM_PROMPT wording in
// src/lib/ai/scenarios.ts) — occasionally the model still degenerates an
// objective into something label-like ("book_demo", "qualifyprospect")
// instead of a natural sentence. Only touches text that actually looks like
// a slug: underscores/hyphens with no spaces at all, or a single bare
// lowercase run — never a real sentence, which always has spaces and/or
// punctuation (so "follow-up call" is left alone: it has a space).
function isSlugLike(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const hasSeparatorWithNoSpaces = /[_-]/.test(trimmed) && !/\s/.test(trimmed);
  const isBareLowercaseWord = /^[a-z]+$/.test(trimmed);
  return hasSeparatorWithNoSpaces || isBareLowercaseWord;
}

function humanize(text: string): string {
  if (!isSlugLike(text)) return text;
  return text
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ScenarioPicker({
  scenarios,
  onSelect,
  onBack,
  voicePreference,
  onVoicePreferenceChange,
}: ScenarioPickerProps) {
  function handleRandomSelect() {
    if (scenarios.length === 0) return;
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    onSelect(randomScenario);
  }

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

      <div className="mb-8 flex flex-col items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Prospect voice
        </span>
        <div className="flex items-center gap-2">
          {VOICE_PREFERENCE_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              selected={voicePreference === option.value}
              onClick={() => onVoicePreferenceChange(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => onSelect(scenario)}
            className="flex flex-col items-start gap-3 rounded-2xl border border-zinc-200/70 bg-white p-5 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${DIFFICULTY_STYLE[scenario.difficulty]}`}
                  aria-hidden
                >
                  {DIFFICULTY_ICON[scenario.difficulty]}
                </span>
                <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{scenario.name}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFFICULTY_STYLE[scenario.difficulty]}`}
              >
                {scenario.difficulty}
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{scenario.description}</p>
            <Chip>{humanize(scenario.objective)}</Chip>
          </button>
        ))}

        <button
          type="button"
          onClick={handleRandomSelect}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-zinc-300 bg-transparent p-5 text-center text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
        >
          <Dice5 className="h-6 w-6" aria-hidden />
          <span className="text-base font-semibold">Random</span>
          <span className="text-sm">Let it pick your challenge</span>
        </button>
      </div>
    </div>
  );
}
