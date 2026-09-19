export type SalesObjective =
  | "book_meeting"
  | "book_demo"
  | "qualify_prospect"
  | "make_sale";

export const SALES_OBJECTIVE_OPTIONS: { value: SalesObjective; label: string }[] = [
  { value: "book_meeting", label: "Book a meeting" },
  { value: "book_demo", label: "Book a demo" },
  { value: "qualify_prospect", label: "Qualify prospect" },
  { value: "make_sale", label: "Make sale" },
];

export interface SalesProfile {
  company: {
    name: string;
    location: string;
    website: string;
    yearsOperating: string;
    teamSize: string;
  };
  offer: {
    whatYouSell: string;
    problemSolved: string;
    price: string;
    pricingModel: string;
    mainOutcome: string;
    usp: string;
  };
  targetCustomer: {
    industry: string;
    companySize: string;
    jobTitle: string;
    country: string;
    typicalProspect: string;
  };
  proof: {
    noClientsYet: boolean;
    usClients: string;
    numberOfClients: string;
    caseStudies: string;
    results: string;
    testimonials: string;
    guarantees: string;
    otherCredibility: string;
  };
  salesObjective: SalesObjective;
  importantInfo: {
    companyBasedIn: string;
    hasUSOffice: string;
    teamLocation: string;
    deliveryMethod: string;
    workingHours: string;
    communicationMethod: string;
  };
}

export type ProspectMarket = "US" | "UK" | "Canada" | "Australia" | "Other";

export const PROSPECT_MARKET_OPTIONS: { value: ProspectMarket; label: string }[] = [
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "Other", label: "Other" },
];

export type CallType = "cold" | "cold_after_outreach" | "warm";

export const CALL_TYPE_OPTIONS: { value: CallType; label: string; description: string }[] = [
  { value: "cold", label: "Cold call", description: "First contact — they've never heard from you at all." },
  {
    value: "cold_after_outreach",
    label: "Following up on an email",
    description: "You've emailed or messaged them, but never actually spoken — no reply required.",
  },
  {
    value: "warm",
    label: "Warm call",
    description: "A real prior connection — an inbound lead, referral, or previous conversation.",
  },
];

export type TrainingProfileFieldKey =
  | "market"
  | "offering"
  | "prospectIndustry"
  | "icpTitles"
  | "companySizeRange"
  | "additionalCriteria"
  | "painPoints"
  | "likelyObjections"
  | "salesObjective"
  | "typicalProspect"
  | "callType"
  | "priorContextDetail";

export interface TrainingProfile {
  market: ProspectMarket;
  // What the CALLER sells (e.g. "appointment-setting services"). Never the
  // prospect's own business — see prospectIndustry below. Replaces the old
  // single `service` field, which was used both ways and made the prospect
  // claim to be in the caller's own business. Legacy saved profiles are
  // upgraded on load by normalizeTrainingProfile (src/lib/profile/normalize.ts).
  offering: string;
  // What the PROSPECT'S company does (e.g. "dental practices"). Comes from
  // the ICP / target customer, never from the offering. May be empty on a
  // legacy profile until the user fills it in.
  prospectIndustry: string;
  icpTitles: string[];
  companySizeRange: string;
  additionalCriteria: string[];
  painPoints: string[];
  likelyObjections: string[];
  salesObjective: SalesObjective;
  salesObjectiveDetail: string;
  typicalProspect: string;
  callType: CallType;
  // Required (specific, never vague) for "cold_after_outreach" and "warm" —
  // meaningless for pure "cold". For cold_after_outreach: describe the
  // actual outreach sent (e.g. "You emailed them on [rough timeframe] about
  // pricing, no reply yet"). For warm: describe the real established
  // context (e.g. "They filled out a contact form last week asking for a
  // quote"). See buildProspectPrompt.ts's "Your relationship with this
  // caller" section, which is what actually uses this.
  priorContextDetail?: string;
  assumptions: Partial<Record<TrainingProfileFieldKey, boolean>>;
}

export type ScenarioDifficulty = "Easy" | "Medium" | "Hard" | "Expert";

export type ProspectAuthority = "decision_maker" | "shared_decision" | "influencer";
export type Level3 = "low" | "medium" | "high";

export interface Scenario {
  id: string;
  name: string;
  description: string;
  difficulty: ScenarioDifficulty;
  // The CALLER's goal for this call. Never shown to the prospect model —
  // see buildProspectPrompt.ts. Used for the ready screen, coach and scorer.
  objective: string;
  // How the prospect actually behaves during this specific call, written
  // for the caller's preview. Descriptive only — the prospect's real
  // behavior comes from the fields below plus the difficulty presets
  // (src/lib/prospect/difficulty.ts).
  whatToExpect: string;
  // The person this scenario is about. Identity generation uses
  // prospectRole as the title, so the card, the ready screen and the live
  // call always describe the same person.
  prospectRole: string;
  prospectIndustry: string;
  // The prospect's private business situation, incumbent solution and
  // hidden buying state. The caller has to discover these.
  situation: string;
  existingSolution: string;
  authority: ProspectAuthority;
  urgency: Level3;
  budgetSensitivity: Level3;
  painSeverity: Level3;
  // Caller-facing only (scorer/coach), never given to the prospect.
  successCondition: string;
  failureCondition: string;
  // The persona generated for this scenario, persisted with it so a reload
  // doesn't turn the same scenario into a different person. Set by
  // TrainingSetup; regenerated only on an explicit "fresh prospect" or a
  // voice-preference change.
  identity?: ProspectIdentity;
}

export interface ProspectLocation {
  city: string;
  region: string;
  timeZone: string;
}

export interface ProspectIdentity {
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  company: string;
  gender: "male" | "female";
  // Optional so calls saved before these existed still deserialize from
  // history/DB storage.
  industry?: string;
  location?: ProspectLocation;
  market?: ProspectMarket;
}

export interface TranscriptEntry {
  id: string;
  role: "user" | "prospect";
  text: string;
  final: boolean;
  timestamp: number;
  // The caller cut the prospect off mid-response. The text may include words
  // that were generated but never heard, so it is excluded from scoring and
  // coaching (see scorableTranscript in src/lib/transcript.ts).
  interrupted?: boolean;
}

export type CoachMode = "training" | "practice" | "exam";
export type CoachTipType = "objection" | "buying_signal" | "mistake";

export interface CoachTip {
  type: CoachTipType;
  label: string;
  note: string;
  suggestedResponse: string;
}

export const CALL_SCORE_CATEGORY_NAMES = [
  "Opening",
  "Confidence",
  "Discovery",
  "Listening",
  "Credibility",
  "Value proposition",
  "Objection handling",
  "Question quality",
  "Call control",
  "Closing",
] as const;

export type CallScoreCategoryName = (typeof CALL_SCORE_CATEGORY_NAMES)[number];

export interface CallScoreCategory {
  name: CallScoreCategoryName;
  score: number;
  // WHAT HAPPENED — evidence from the transcript. (Named `reason` because
  // calls saved before the richer feedback existed store it under this key.)
  reason: string;
  // WHAT TO CHANGE. (Legacy key name, as above.)
  betterApproach: string;
  // WHY IT MATTERED and BETTER EXAMPLE are absent on calls scored before
  // per-category feedback was shown; the UI falls back gracefully.
  whyItMattered?: string;
  betterExample?: string;
}

export type ObjectiveOutcomeStatus = "achieved" | "partially_achieved" | "not_achieved" | "not_reachable";

export interface ObjectiveOutcome {
  status: ObjectiveOutcomeStatus;
  reason: string;
}

export interface CallMetrics {
  durationSeconds: number;
  questionCount: number;
  userWordCount: number;
  prospectWordCount: number;
  userSpeakingPercent: number;
  prospectSpeakingPercent: number;
  longestUserMonologueWords: number;
  objectionCount: number;
  objectionsHandled: number;
  missedBuyingSignals: number;
  pitchCount: number;
  nextStepAskCount: number;
}

export interface BetterResponseMoment {
  whatHappened: string;
  whatYouSaid: string;
  betterResponse: string;
  whyItsBetter: string;
}

export interface CallScoreResult {
  overallScore: number;
  categories: CallScoreCategory[];
  metrics: CallMetrics;
  biggestMistake: string;
  bestMoment: string;
  betterResponses: BetterResponseMoment[];
  // Both absent on calls scored before the retry loop existed.
  objectiveOutcome?: ObjectiveOutcome;
  workOnNext?: string[];
}

export function emptySalesProfile(): SalesProfile {
  return {
    company: { name: "", location: "", website: "", yearsOperating: "", teamSize: "" },
    offer: { whatYouSell: "", problemSolved: "", price: "", pricingModel: "", mainOutcome: "", usp: "" },
    targetCustomer: { industry: "", companySize: "", jobTitle: "", country: "United States", typicalProspect: "" },
    proof: {
      noClientsYet: false,
      usClients: "",
      numberOfClients: "",
      caseStudies: "",
      results: "",
      testimonials: "",
      guarantees: "",
      otherCredibility: "",
    },
    salesObjective: "book_meeting",
    importantInfo: {
      companyBasedIn: "",
      hasUSOffice: "",
      teamLocation: "",
      deliveryMethod: "",
      workingHours: "",
      communicationMethod: "",
    },
  };
}
