// Fast, cost-efficient text model used for structured-output calls
// (profile generation/refine, scenario generation, live coaching).
export const TEXT_MODEL = "gpt-4.1-mini";

// Realtime voice model for the prospect call, plus its audio config.
// Verified live against the current /v1/realtime/client_secrets contract.
export const REALTIME_MODEL = "gpt-realtime-2.1-mini";
export const REALTIME_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

export const REALTIME_VOICES = {
  male: ["cedar", "echo"],
  female: ["marin", "shimmer"],
} as const;

// Deterministic per persona when a seed (the prospect's name) is given, so
// "the same person" keeps the same voice across retries and reloads.
export function pickVoiceForGender(gender: "male" | "female", seed?: string): string {
  const voices = REALTIME_VOICES[gender];
  if (!seed) return voices[Math.floor(Math.random() * voices.length)];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return voices[hash % voices.length];
}
