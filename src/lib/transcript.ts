import { TranscriptEntry } from "@/lib/types";

// The transcript a scorer/coach may treat as "what was actually said":
// finished, non-empty, and not a prospect turn the caller cut off (its text
// can include words that were generated but never heard).
export function scorableTranscript(transcript: TranscriptEntry[]): TranscriptEntry[] {
  return transcript.filter((entry) => entry.final && !entry.interrupted && entry.text.trim().length > 0);
}

export function transcriptToText(transcript: TranscriptEntry[]): string {
  return scorableTranscript(transcript)
    .map((entry) => `${entry.role === "user" ? "Caller" : "Prospect"}: ${entry.text.trim()}`)
    .join("\n");
}
