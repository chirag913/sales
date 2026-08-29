"use client";

import { ComponentType } from "react";
import { Briefcase, Building2, ChevronRight, Dice5, PhoneCall, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { AVATAR_PALETTES, hashString, ProspectAvatar } from "@/components/ui/ProspectAvatar";
import { ProspectGenderPreference } from "@/lib/prospect/identity";
import { ProspectIdentity, Scenario, TrainingProfile } from "@/lib/types";

interface ScenarioPickerProps {
  scenarios: Scenario[];
  profile: TrainingProfile;
  // One identity per scenario.id, generated once by TrainingSetup (the
  // single source of truth) — NOT generated here, so the persona shown on
  // this card is the exact same one that carries through to Ready/Call/
  // Score when the scenario is selected, rather than a second, unrelated
  // roll of the dice.
  identities: Map<string, ProspectIdentity>;
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

// Role-icon circles in the "More challenges" grid deliberately reuse the
// SAME muted palette ProspectAvatar already uses for persona portraits
// (AVATAR_PALETTES) rather than inventing a new accent-color set — these
// cards represent personas, so the color language should match. Icon choice
// and color are both hashed off the scenario id: stable across re-renders,
// varied for visual interest, but not encoding difficulty (that's the
// separate pill).
const ROLE_ICONS: ComponentType<{ className?: string }>[] = [Briefcase, Building2, UserRound, Users];

const VOICE_PREFERENCE_OPTIONS: { value: ProspectGenderPreference; label: string }[] = [
  { value: "any", label: "Any voice" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

function expectText(scenario: Scenario): string {
  // Defensive fallback for scenario batches persisted before whatToExpect
  // existed (see lib/types.ts) — freshly generated scenarios always have
  // this field, so this text should never actually appear in practice.
  return scenario.whatToExpect || "No behavior preview available — regenerate scenarios to get one.";
}

function RoleIcon({ scenarioId }: { scenarioId: string }) {
  const hash = hashString(scenarioId);
  const [from, to] = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
  const Icon = ROLE_ICONS[hash % ROLE_ICONS.length];
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-700"
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}

export function ScenarioPicker({
  scenarios,
  profile,
  identities,
  onSelect,
  onBack,
  voicePreference,
  onVoicePreferenceChange,
}: ScenarioPickerProps) {
  const featured = scenarios.find((s) => s.difficulty === "Easy") ?? scenarios[0];
  const rest = featured ? scenarios.filter((s) => s.id !== featured.id) : scenarios;
  const featuredIdentity = featured ? identities.get(featured.id) : undefined;

  const icpSummary =
    profile.icpTitles.length > 0
      ? profile.icpTitles.slice(0, 3).join(", ") + (profile.icpTitles.length > 3 ? "…" : "")
      : "Any role";

  function handleRandomSelect() {
    if (scenarios.length === 0) return;
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    onSelect(randomScenario);
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400"
        >
          ← Edit setup
        </button>
        <Chip tone="positive">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden />
            AI prospect ready
          </span>
        </Chip>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400">
          Practice session
        </p>
        <h1 className="mt-2 text-4xl font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-50">
          Pick your prospect.
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">Choose who you want to practice on next.</p>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <PhoneCall className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
          <p className="min-w-0 truncate text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Calling</span>{" "}
            <span className="text-zinc-900 dark:text-zinc-50">{profile.service}</span> · {icpSummary}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 self-start text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400 sm:self-auto"
        >
          View setup →
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Voice</span>
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

      {featured && (
        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Recommended for you
          </p>
          <div className="mt-3 rounded-3xl border-2 border-emerald-200 bg-white p-6 shadow-sm dark:border-emerald-900/50 dark:bg-zinc-950 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {featuredIdentity && (
                <div className="flex shrink-0 flex-col items-center text-center sm:items-start sm:text-left">
                  <ProspectAvatar identity={featuredIdentity} size="lg" />
                  <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {featuredIdentity.fullName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {featuredIdentity.title} · {featuredIdentity.company}
                  </p>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{featured.name}</h2>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFFICULTY_STYLE[featured.difficulty]}`}>
                    {featured.difficulty}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{featured.description}</p>
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                    What to expect
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{expectText(featured)}</p>
                </div>
                <Button onClick={() => onSelect(featured)} className="mt-5 gap-2 px-6 py-3 text-base">
                  Start practice
                  <span aria-hidden>→</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            More challenges
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rest.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                onClick={() => onSelect(scenario)}
                className="flex items-start gap-3 rounded-2xl border border-zinc-200/70 bg-white p-5 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
              >
                <RoleIcon scenarioId={scenario.id} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{scenario.name}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${DIFFICULTY_STYLE[scenario.difficulty]}`}>
                      <span className="mr-1" aria-hidden>
                        {DIFFICULTY_ICON[scenario.difficulty]}
                      </span>
                      {scenario.difficulty}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400">{scenario.description}</p>
                  <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                    <span className="font-medium uppercase tracking-wide">What to expect</span> {expectText(scenario)}
                  </p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-700" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleRandomSelect}
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 bg-transparent px-5 py-4 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
      >
        <Dice5 className="h-4 w-4" aria-hidden />
        Surprise me — random prospect
      </button>
    </div>
  );
}
