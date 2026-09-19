import { TrainingProfile } from "@/lib/types";

// A training profile saved before offering/prospectIndustry were split
// carries a single `service` field. Every new field defaults safely so
// old rows keep loading; nothing here needs a database migration.
type StoredTrainingProfile = Omit<TrainingProfile, "offering" | "prospectIndustry"> & {
  offering?: string;
  prospectIndustry?: string;
  // Legacy: what the caller sells (it was never reliably the prospect's
  // industry, even though parts of the app treated it that way).
  service?: string;
};

export function normalizeTrainingProfile(stored: StoredTrainingProfile): TrainingProfile {
  const { service, ...rest } = stored;
  return {
    ...rest,
    offering: stored.offering ?? service ?? "",
    // Deliberately empty for a legacy profile rather than guessed from the
    // offering — that guess is exactly the bug this split removes. The
    // profile review screen asks the user to fill it in.
    prospectIndustry: stored.prospectIndustry ?? "",
  };
}

export function isLegacyTrainingProfile(stored: { prospectIndustry?: string } | null | undefined): boolean {
  return Boolean(stored) && !stored?.prospectIndustry;
}
