import { ProspectIdentity, ProspectMarket } from "@/lib/types";

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
  Other: [
    "Jordan", "Morgan", "Riley", "Jamie", "Avery", "Reese", "Skyler", "Kai",
    "Blake", "Elliot",
  ],
};

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Chen", "Wilson", "Anderson", "Taylor", "Thomas", "Moore",
  "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark", "Lewis",
  "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Green",
  "Baker", "Nelson", "Carter", "Mitchell", "Roberts", "Turner", "Phillips", "Campbell",
];

const COMPANY_PREFIXES = [
  "Meridian", "Crestline", "Harbor", "Summit", "Northgate", "Alderwood", "Bluepeak",
  "Ridgeview", "Fairmont", "Cascade", "Ironwood", "Silverline", "Brightwater", "Highland",
  "Sterling", "Lakeside", "Riverside", "Oakmont", "Westbrook", "Clearview", "Ashford",
  "Bellwood", "Granite", "Hartwell",
];

const COMPANY_SUFFIXES = ["Group", "Partners", "Solutions", "Services", "Holdings", "Enterprises", "Associates", "Ventures"];

const GENERIC_INDUSTRY_WORDS = ["Business", "Commercial", "Regional", "Metro", "National", "Pacific"];

const TITLE_ROLE_WORDS = /\b(Manager|Director|Officer|Lead|Coordinator|Owner|Head|VP|Supervisor|Administrator|Executive|Chief)\b/gi;

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function extractIndustryWord(title: string): string | null {
  const stripped = title
    .replace(TITLE_ROLE_WORDS, "")
    .replace(/\bof\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 0 ? stripped : null;
}

export type ProspectGenderPreference = "male" | "female" | "any";

export function generateProspectIdentity(
  market: ProspectMarket,
  icpTitles: string[],
  genderPreference: ProspectGenderPreference = "any"
): ProspectIdentity {
  const title = icpTitles.length > 0 ? pickRandom(icpTitles) : "Manager";
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
  const lastName = pickRandom(LAST_NAMES);
  const industryWord = extractIndustryWord(title) ?? pickRandom(GENERIC_INDUSTRY_WORDS);
  const company = `${pickRandom(COMPANY_PREFIXES)} ${industryWord} ${pickRandom(COMPANY_SUFFIXES)}`;

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    title,
    company,
    gender,
  };
}
