import {
  BetterResponseMoment,
  CallMetrics,
  CallScoreCategory,
  ObjectiveOutcome,
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
  // Objective outcome, "work on next" and how the call ended. Null on calls
  // saved before migration 0018 added the column.
  extra: {
    objectiveOutcome: ObjectiveOutcome | null;
    workOnNext: string[];
    endedBy: string;
    prospectEndReason: string | null;
  } | null;
}
