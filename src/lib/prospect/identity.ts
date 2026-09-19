import { getMarketConfig } from "@/lib/prospect/marketConfig";
import { ProspectIdentity, ProspectMarket, Scenario, TrainingProfile } from "@/lib/types";

const FIRST_NAMES_MALE_BY_MARKET: Record<ProspectMarket, string[]> = {
  US: [
    "Michael", "David", "James", "Robert", "John", "Christopher", "Matthew", "Daniel",
    "Andrew", "Joshua", "Ryan", "Brandon", "Justin", "Kevin", "Brian",
  ],
  UK: [
    "Oliver", "George", "Harry", "Jack", "Charlie", "Jacob", "Thomas", "William",
    "James", "Henry", "Alfie", "Joshua", "Noah", "Ethan", "Leo",
  ],
  Canada: [
    "Liam", "Noah", "Ethan", "Jacob", "William", "Benjamin", "Logan", "Lucas",
    "Jack", "Owen", "Nathan", "Ryan", "Carter", "Jayden", "Alexander",
  ],
  Australia: [
    "Jack", "Oliver", "William", "Noah", "Thomas", "James", "Lucas", "Henry",
    "Ethan", "Cooper", "Mason", "Archie", "Leo", "Hunter", "Charlie",
  ],
  Other: [
    "Alex", "Taylor", "Casey", "Sam", "Drew", "Quinn", "Rowan", "Dana",
    "Emerson", "Peyton",
  ],
};

const FIRST_NAMES_FEMALE_BY_MARKET: Record<ProspectMarket, string[]> = {
  US: [
    "Sarah", "Jessica", "Ashley", "Amanda", "Emily", "Jennifer", "Lisa", "Michelle",
    "Kimberly", "Amy", "Angela", "Melissa", "Stephanie", "Nicole", "Elizabeth",
  ],
  UK: [
    "Olivia", "Amelia", "Isla", "Ava", "Emily", "Grace", "Sophie", "Poppy",
    "Freya", "Charlotte", "Lily", "Ruby", "Isabella", "Evie", "Mia",
  ],
  Canada: [
    "Emma", "Charlotte", "Olivia", "Ava", "Sophia", "Chloe", "Zoey", "Mila",
    "Abigail", "Emily", "Madison", "Ella", "Grace", "Hannah", "Layla",
  ],
  Australia: [
    "Charlotte", "Olivia", "Amelia", "Isla", "Mia", "Grace", "Ava", "Willow",
    "Chloe", "Ivy", "Matilda", "Ruby", "Zoe", "Sophie", "Evie",
  ],
  // Jordan/Morgan/Riley/Kai/Blake were dropped — genuinely unisex, but skew
  // male-leaning enough in most readers' ears that they felt mismatched
  // even when correctly assigned female. Replaced with names that read more
  // clearly female while keeping the pool's international, non-country-
  // specific flavor (distinct from the US/UK/Canada/Australia lists above).
  Other: [
    "Maya", "Nadia", "Sofia", "Elena", "Priya", "Jamie", "Avery", "Reese",
    "Skyler", "Elliot",
  ],
};

// Words that describe a kind of business or a size/quality, not the
// industry itself — dropped when turning a prospectIndustry like
// "independent dental practices" into a company-name word like "Dental".
const NON_INDUSTRY_WORDS = new Set([
  "companies", "company", "businesses", "business", "firms", "firm", "providers", "provider",
  "services", "service", "industry", "industries", "organizations", "organization", "practices",
  "practice", "agencies", "agency", "shops", "shop", "stores", "store", "retailers", "retailer",
  "contractors", "contractor", "brokerages", "brokerage", "operators", "operator", "teams", "team",
  "independent", "small", "smaller", "mid-sized", "midsized", "medium", "large", "local", "regional",
  "growing", "established", "and", "of", "the", "for", "with", "in", "based", "sized", "size",
]);

function titleCase(words: string): string {
  return words
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// The company-name word comes from the prospect's actual industry (the
// generated ICP / target customer) and nothing else. If nothing usable is
// left after stripping, the company simply gets no industry word — a plain
// "Meridian Partners" — rather than an invented or random industry.
export function industryNameWord(prospectIndustry: string): string | null {
  const words = prospectIndustry
    .toLowerCase()
    .replace(/[^a-z0-9\s&-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && !NON_INDUSTRY_WORDS.has(w));
  if (words.length === 0) return null;
  return titleCase(words.slice(0, 3).join(" "));
}

export type ProspectGenderPreference = "male" | "female" | "any";

export interface GenerateProspectIdentityArgs {
  market: ProspectMarket;
  profile: Pick<TrainingProfile, "icpTitles" | "prospectIndustry">;
  // The scenario this person belongs to. Its role and industry win over the
  // profile's global ICP list so the scenario card and the identity agree.
  scenario?: Pick<Scenario, "prospectRole" | "prospectIndustry">;
  genderPreference?: ProspectGenderPreference;
}

export function generateProspectIdentity({
  market,
  profile,
  scenario,
  genderPreference = "any",
}: GenerateProspectIdentityArgs): ProspectIdentity {
  const config = getMarketConfig(market);
  const title =
    scenario?.prospectRole?.trim() || (profile.icpTitles.length > 0 ? pickRandom(profile.icpTitles) : "Manager");
  const industry = scenario?.prospectIndustry?.trim() || profile.prospectIndustry?.trim() || "";
  const gender: "male" | "female" =
    genderPreference === "male" || genderPreference === "female"
      ? genderPreference
      : Math.random() < 0.5
        ? "male"
        : "female";
  const firstNames =
    (gender === "male" ? FIRST_NAMES_MALE_BY_MARKET[market] : FIRST_NAMES_FEMALE_BY_MARKET[market]) ??
    (gender === "male" ? FIRST_NAMES_MALE_BY_MARKET.Other : FIRST_NAMES_FEMALE_BY_MARKET.Other);
  const firstName = pickRandom(firstNames);
  const lastName = pickRandom(config.surnames);
  const industryWord = industry ? industryNameWord(industry) : null;
  const company = [pickRandom(config.companyPrefixes), industryWord, pickRandom(config.companySuffixes)]
    .filter(Boolean)
    .join(" ");
  const location = config.locations.length > 0 ? pickRandom(config.locations) : undefined;

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    title,
    company,
    gender,
    industry: industry || undefined,
    location,
    market,
  };
}
