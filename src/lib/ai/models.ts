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

export function pickVoiceForGender(gender: "male" | "female"): string {
  const voices = REALTIME_VOICES[gender];
  return voices[Math.floor(Math.random() * voices.length)];
}
