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

export type TrainingProfileFieldKey =
  | "market"
  | "service"
  | "icpTitles"
  | "companySizeRange"
  | "additionalCriteria"
  | "painPoints"
  | "likelyObjections"
  | "salesObjective"
  | "typicalProspect";

export interface TrainingProfile {
  market: ProspectMarket;
  service: string;
  icpTitles: string[];
  companySizeRange: string;
  additionalCriteria: string[];
  painPoints: string[];
  likelyObjections: string[];
  salesObjective: SalesObjective;
  salesObjectiveDetail: string;
  typicalProspect: string;
  assumptions: Partial<Record<TrainingProfileFieldKey, boolean>>;
}

export type ScenarioDifficulty = "Easy" | "Medium" | "Hard" | "Expert";

export interface Scenario {
  id: string;
  icon: string;
  name: string;
  description: string;
  difficulty: ScenarioDifficulty;
  objective: string;
}

export interface ProspectIdentity {
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  company: string;
  gender: "male" | "female";
}

export interface TranscriptEntry {
  id: string;
  role: "user" | "prospect";
  text: string;
  final: boolean;
  timestamp: number;
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
  reason: string;
  betterApproach: string;
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
