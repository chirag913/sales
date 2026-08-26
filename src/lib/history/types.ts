import {
  BetterResponseMoment,
  CallMetrics,
  CallScoreCategory,
  ProspectIdentity,
  Scenario,
  TranscriptEntry,
} from "@/lib/types";

// Mirrors a row from the `calls` table (supabase/migrations/0001_init.sql).
export interface CallHistoryEntry {
  id: string;
  created_at: string;
  scenario: Scenario;
  identity: ProspectIdentity;
  duration_seconds: number;
  overall_score: number;
  categories: CallScoreCategory[];
  metrics: CallMetrics;
  biggest_mistake: string;
  best_moment: string;
  better_responses: BetterResponseMoment[];
  transcript: TranscriptEntry[];
  objection_tags: string[];
}
