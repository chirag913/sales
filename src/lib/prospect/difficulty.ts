import { Level3, ProspectAuthority, Scenario, ScenarioDifficulty } from "@/lib/types";

// Difficulty is a real set of underlying conditions, not a label. The
// scenario generator is told to write scenarios that fit these, the values
// are clamped here after generation so a model slip can't leave an "Expert"
// with a friendly, high-urgency decision maker, and the prospect prompt
// turns the same preset into behavior instructions.
//
// Nothing here relies on the prospect interrupting the caller: the realtime
// setup only lets the prospect respond after the caller stops talking.

export interface DifficultyPreset {
  authority: ProspectAuthority[];
  urgency: Level3[];
  budgetSensitivity: Level3[];
  painSeverity: Level3[];
  requiresIncumbent: boolean;
  // Instructions for the prospect prompt.
  temperament: string;
  patience: string;
  // One-line summary for the scenario generator.
  generatorGuide: string;
}

export const DIFFICULTY_PRESETS: Record<ScenarioDifficulty, DifficultyPreset> = {
  Easy: {
    authority: ["decision_maker"],
    urgency: ["medium", "high"],
    budgetSensitivity: ["low", "medium"],
    painSeverity: ["medium", "high"],
    requiresIncumbent: false,
    temperament:
      "You have a minute to talk and you're mildly receptive to hearing why they called. You don't put up walls, but you still don't volunteer everything and you won't agree to anything that doesn't fit your situation.",
    patience: "Reasonably patient. You give a rambling or unclear caller a couple of chances before you get short with them.",
    generatorGuide:
      "Available and mildly receptive. Decision maker, some real pain, medium/high urgency, no strong incumbent (informal or manual process).",
  },
  Medium: {
    authority: ["decision_maker", "shared_decision"],
    urgency: ["medium"],
    budgetSensitivity: ["medium"],
    painSeverity: ["medium"],
    requiresIncumbent: true,
    temperament:
      "You're busy and a bit guarded. You already have something in place, so you need a reason to even discuss it. You warm up only if the caller shows they understand your situation.",
    patience: "Moderate. You'll give a relevant caller a few minutes, but you cut off a generic pitch quickly.",
    generatorGuide: "Busy and neutral with an incumbent provider or system that mostly works. Medium urgency and budget sensitivity.",
  },
  Hard: {
    authority: ["shared_decision", "decision_maker"],
    urgency: ["low"],
    budgetSensitivity: ["medium", "high"],
    painSeverity: ["low", "medium"],
    requiresIncumbent: true,
    temperament:
      "You're skeptical and not looking to change anything. You get a lot of calls like this and your default is to deflect (send an email, we're fine, not now). Only something specific to your situation earns more than a one-line answer.",
    patience: "Low-moderate. You'll say no or ask for an email if the first minute doesn't feel relevant.",
    generatorGuide: "Skeptical, satisfied-enough incumbent, low urgency. Others weigh in on decisions. Needs a very relevant reason to engage.",
  },
  Expert: {
    authority: ["shared_decision", "influencer"],
    urgency: ["low"],
    budgetSensitivity: ["high"],
    painSeverity: ["low"],
    requiresIncumbent: true,
    temperament:
      "You're skeptical, short on time, and protective of your current setup. There are several real reasons not to change (contract, budget, other people involved). You answer in a few words and make the caller work for every detail.",
    patience: "Low. If the caller pitches before understanding you, ignores what you said, or pushes, you'll end the call quickly. A precise, relevant caller can still earn a small next step.",
    generatorGuide:
      "Skeptical, low patience, multiple constraints (locked-in incumbent, tight budget, others involved). Most callers should not get far.",
  },
};

function clampTo<T>(value: T, allowed: T[]): T {
  return allowed.includes(value) ? value : allowed[0];
}

// Deterministic post-processing of a generated scenario so the underlying
// conditions always match its difficulty tier.
export function clampScenarioToDifficulty<T extends Pick<Scenario, "difficulty" | "authority" | "urgency" | "budgetSensitivity" | "painSeverity">>(
  scenario: T
): T {
  const preset = DIFFICULTY_PRESETS[scenario.difficulty];
  return {
    ...scenario,
    authority: clampTo(scenario.authority, preset.authority),
    urgency: clampTo(scenario.urgency, preset.urgency),
    budgetSensitivity: clampTo(scenario.budgetSensitivity, preset.budgetSensitivity),
    painSeverity: clampTo(scenario.painSeverity, preset.painSeverity),
  };
}
