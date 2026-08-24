import { TranscriptEntry } from "@/lib/types";

export interface ComputedTranscriptMetrics {
  questionCount: number;
  userWordCount: number;
  prospectWordCount: number;
  userSpeakingPercent: number;
  prospectSpeakingPercent: number;
  longestUserMonologueWords: number;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Deterministic metrics computed directly from the transcript text — no AI
 * involved. Speaking share is approximated by word count (we don't have
 * precise per-utterance audio duration), which is exact once accepted as
 * the proxy, unlike anything an LLM would have to estimate.
 */
export function computeTranscriptMetrics(transcript: TranscriptEntry[]): ComputedTranscriptMetrics {
  const userEntries = transcript.filter((e) => e.role === "user");
  const prospectEntries = transcript.filter((e) => e.role === "prospect");

  const questionCount = userEntries.reduce((sum, e) => sum + (e.text.match(/\?/g)?.length ?? 0), 0);
  const userWordCount = userEntries.reduce((sum, e) => sum + wordCount(e.text), 0);
  const prospectWordCount = prospectEntries.reduce((sum, e) => sum + wordCount(e.text), 0);
  const totalWords = userWordCount + prospectWordCount;
  const userSpeakingPercent = totalWords > 0 ? Math.round((userWordCount / totalWords) * 100) : 0;
  const prospectSpeakingPercent = totalWords > 0 ? 100 - userSpeakingPercent : 0;
  const longestUserMonologueWords = userEntries.reduce((max, e) => Math.max(max, wordCount(e.text)), 0);

  return {
    questionCount,
    userWordCount,
    prospectWordCount,
    userSpeakingPercent,
    prospectSpeakingPercent,
    longestUserMonologueWords,
  };
}
