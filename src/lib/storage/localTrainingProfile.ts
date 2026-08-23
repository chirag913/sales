import { Scenario, TrainingProfile } from "@/lib/types";

const TRAINING_PROFILE_KEY = "cct:trainingProfile";
const SCENARIOS_KEY = "cct:scenarios";

export function loadTrainingProfile(): TrainingProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(TRAINING_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TrainingProfile;
  } catch {
    return null;
  }
}

export function saveTrainingProfile(profile: TrainingProfile): void {
  window.localStorage.setItem(TRAINING_PROFILE_KEY, JSON.stringify(profile));
}

export function clearTrainingProfile(): void {
  window.localStorage.removeItem(TRAINING_PROFILE_KEY);
  window.localStorage.removeItem(SCENARIOS_KEY);
}

export function loadScenarios(): Scenario[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SCENARIOS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Scenario[];
  } catch {
    return null;
  }
}

export function saveScenarios(scenarios: Scenario[]): void {
  window.localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
}
