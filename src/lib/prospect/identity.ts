import { ProspectIdentity, ProspectMarket } from "@/lib/types";

const FIRST_NAMES_BY_MARKET: Record<ProspectMarket, string[]> = {
  US: [
    "Sarah", "Michael", "Jessica", "David", "Ashley", "James", "Amanda", "Robert",
    "Emily", "John", "Jennifer", "Christopher", "Lisa", "Matthew", "Michelle", "Daniel",
    "Kimberly", "Andrew", "Amy", "Joshua", "Angela", "Ryan", "Melissa", "Brandon",
    "Stephanie", "Justin", "Nicole", "Kevin", "Elizabeth", "Brian",
  ],
  UK: [
    "Oliver", "Olivia", "George", "Amelia", "Harry", "Isla", "Jack", "Ava",
    "Charlie", "Emily", "Jacob", "Grace", "Thomas", "Sophie", "William", "Poppy",
    "James", "Freya", "Henry", "Charlotte", "Alfie", "Lily", "Joshua", "Ruby",
    "Noah", "Isabella", "Ethan", "Evie", "Leo", "Mia",
  ],
  Canada: [
    "Liam", "Emma", "Noah", "Charlotte", "Ethan", "Olivia", "Jacob", "Ava",
    "William", "Sophia", "Benjamin", "Chloe", "Logan", "Zoey", "Lucas", "Mila",
    "Jack", "Abigail", "Owen", "Emily", "Nathan", "Madison", "Ryan", "Ella",
    "Carter", "Grace", "Jayden", "Hannah", "Alexander", "Layla",
  ],
  Australia: [
    "Jack", "Charlotte", "Oliver", "Olivia", "William", "Amelia", "Noah", "Isla",
    "Thomas", "Mia", "James", "Grace", "Lucas", "Ava", "Henry", "Willow",
    "Ethan", "Chloe", "Cooper", "Ivy", "Mason", "Matilda", "Archie", "Ruby",
    "Leo", "Zoe", "Hunter", "Sophie", "Charlie", "Evie",
  ],
  Other: [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Sam", "Jamie",
    "Drew", "Avery", "Quinn", "Reese", "Rowan", "Skyler", "Dana", "Kai",
    "Emerson", "Blake", "Peyton", "Elliot",
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

export function generateProspectIdentity(market: ProspectMarket, icpTitles: string[]): ProspectIdentity {
  const title = icpTitles.length > 0 ? pickRandom(icpTitles) : "Manager";
  const firstNames = FIRST_NAMES_BY_MARKET[market] ?? FIRST_NAMES_BY_MARKET.Other;
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
  };
}
