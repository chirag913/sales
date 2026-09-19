import { ProspectIdentity, Scenario, TrainingProfile } from "@/lib/types";

// Deterministic fixtures: the profile and scenarios are hand-written (no
// model generation) so a prompt regression can't hide behind a different
// scenario being generated on the day.

export const dentalProfile: TrainingProfile = {
  market: "US",
  offering: "appointment-setting services",
  prospectIndustry: "dental practices",
  icpTitles: ["Office Manager", "Practice Manager", "Practice Owner"],
  companySizeRange: "1-10 dentists",
  additionalCriteria: [],
  painPoints: [
    "Patient no-shows and last-minute cancellations",
    "Front desk too busy to follow up on new patient inquiries",
    "Empty hygiene slots",
  ],
  likelyObjections: [
    "We already have a reminder system",
    "We don't have budget for this right now",
    "Send me an email",
    "We get most of our patients through referrals",
  ],
  salesObjective: "book_meeting",
  salesObjectiveDetail: "Book a 15-minute intro call with the practice manager",
  typicalProspect: "Office or practice manager at a small dental practice who handles scheduling, patient communication and the front desk.",
  callType: "cold",
  priorContextDetail: "",
  assumptions: {},
};

const base = {
  objective: "Get them to agree to a 15-minute intro call",
  successCondition: "The prospect agrees to a specific 15-minute follow-up call or meeting",
  failureCondition: "The prospect ends the call before the caller learns anything about their current setup",
};

export const easyScenario: Scenario = {
  ...base,
  id: "easy",
  name: "Curious Office Manager",
  description: "Friendly office manager who is dealing with rising no-shows and has a minute to talk.",
  difficulty: "Easy",
  whatToExpect: "Gives you room to explain and answers plainly.",
  prospectRole: "Office Manager",
  prospectIndustry: "dental practices",
  situation: "Runs the front desk and scheduling for a three-dentist family practice; no-shows have crept up this quarter.",
  existingSolution: "Front desk staff make reminder calls by hand, plus the basic text reminders in their practice software.",
  authority: "decision_maker",
  urgency: "high",
  budgetSensitivity: "medium",
  painSeverity: "high",
};

export const mediumScenario: Scenario = {
  ...base,
  id: "medium",
  name: "Busy Practice Manager",
  description: "Busy practice manager who already has something in place.",
  difficulty: "Medium",
  whatToExpect: "Short answers until you show you understand their situation.",
  prospectRole: "Practice Manager",
  prospectIndustry: "dental practices",
  situation: "Manages operations for a five-dentist practice; after-hours new-patient inquiries mostly go to voicemail.",
  existingSolution: "An answering service they've used for three years that mostly works.",
  authority: "shared_decision",
  urgency: "medium",
  budgetSensitivity: "medium",
  painSeverity: "medium",
};

export const hardScenario: Scenario = {
  ...base,
  id: "hard",
  name: "Skeptical Practice Owner",
  description: "Skeptical owner who gets many vendor calls.",
  difficulty: "Hard",
  whatToExpect: "Deflects quickly; needs a very specific reason to engage.",
  prospectRole: "Practice Owner",
  prospectIndustry: "dental practices",
  situation: "Owns a two-location practice and is sick of vendor calls; patient volume is steady.",
  existingSolution: "An outsourced call-handling contract that was renewed last spring.",
  authority: "decision_maker",
  urgency: "low",
  budgetSensitivity: "high",
  painSeverity: "low",
};

export const expertScenario: Scenario = {
  ...base,
  id: "expert",
  name: "Locked-In Office Manager",
  description: "Short on time, protective of the current setup.",
  difficulty: "Expert",
  whatToExpect: "Answers in a few words and ends the call quickly if you pitch first.",
  prospectRole: "Office Manager",
  prospectIndustry: "dental practices",
  situation: "Office manager at a busy practice with a tight budget; the owner signs off on anything new.",
  existingSolution: "A 12-month contract with a marketing agency that also handles their appointment booking.",
  authority: "shared_decision",
  urgency: "low",
  budgetSensitivity: "high",
  painSeverity: "low",
};

export const sarah: ProspectIdentity = {
  firstName: "Sarah",
  lastName: "Johnson",
  fullName: "Sarah Johnson",
  title: "Office Manager",
  company: "Oakmont Dental Group",
  gender: "female",
  industry: "dental practices",
  location: { city: "Austin", region: "Texas", timeZone: "Central Time" },
  market: "US",
};

export const mike: ProspectIdentity = {
  firstName: "Mike",
  lastName: "Turner",
  fullName: "Mike Turner",
  title: "Practice Owner",
  company: "Turner Family Dental",
  gender: "male",
  industry: "dental practices",
  location: { city: "Columbus", region: "Ohio", timeZone: "Eastern Time" },
  market: "US",
};
