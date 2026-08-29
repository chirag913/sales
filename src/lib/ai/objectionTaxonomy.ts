// Shared objection-type taxonomy. Used by both the live coach (coach.ts) and
// the post-call objection tagger (objectionTags.ts) so the two can never drift.
export const OBJECTION_TYPES = [
  "TIME",
  "PRICE",
  "TRUST",
  "LOCATION",
  "NO LOCAL PRESENCE",
  "CREDIBILITY",
  "COMPETITOR",
  "NO NEED",
  "NO BUDGET",
  "ALREADY HAVE PROVIDER",
  "SEND EMAIL",
  "AUTHORITY",
  "TIMING",
] as const;

export type ObjectionType = (typeof OBJECTION_TYPES)[number];
