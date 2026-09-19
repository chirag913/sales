import { ProspectLocation, ProspectMarket } from "@/lib/types";

// Small per-market layer: naming, company style, locations, and how the
// prospect is told to phrase things. It does NOT change the voice — the
// realtime voices are the same for every market and this app can't
// guarantee a British or Australian accent, so the prompt only asks for
// natural word choice and never claims an accent.

export interface MarketConfig {
  label: string;
  englishVariant: string;
  // Natural phrasing/terminology guidance for the prospect prompt.
  phrasing: string;
  greetingExamples: (firstName: string) => string[];
  surnames: string[];
  companyPrefixes: string[];
  companySuffixes: string[];
  // Empty for "Other": no location is invented for an unspecified market.
  locations: ProspectLocation[];
}

const US_SURNAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Wilson", "Anderson", "Taylor", "Thomas", "Moore",
  "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark", "Lewis",
  "Robinson", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Green",
  "Baker", "Nelson", "Carter", "Mitchell", "Roberts", "Turner", "Phillips", "Campbell",
];

const US_PREFIXES = [
  "Meridian", "Crestline", "Harbor", "Summit", "Northgate", "Alderwood", "Bluepeak",
  "Ridgeview", "Fairmont", "Cascade", "Ironwood", "Silverline", "Brightwater", "Highland",
  "Sterling", "Lakeside", "Riverside", "Oakmont", "Westbrook", "Clearview", "Ashford",
  "Bellwood", "Granite", "Hartwell",
];

export const MARKET_CONFIG: Record<ProspectMarket, MarketConfig> = {
  US: {
    label: "United States",
    englishVariant: "American English",
    phrasing:
      "Casual, professional US business phone talk. Use US terms where they come up (zip code, dollars, Inc./LLC).",
    greetingExamples: (first) => ["Hello?", `Yeah, this is ${first}.`, "Yeah, who's this?"],
    surnames: US_SURNAMES,
    companyPrefixes: US_PREFIXES,
    companySuffixes: ["Group", "Associates", "Partners", "Inc.", "LLC"],
    locations: [
      { city: "Austin", region: "Texas", timeZone: "Central Time" },
      { city: "Dallas", region: "Texas", timeZone: "Central Time" },
      { city: "Columbus", region: "Ohio", timeZone: "Eastern Time" },
      { city: "Atlanta", region: "Georgia", timeZone: "Eastern Time" },
      { city: "Charlotte", region: "North Carolina", timeZone: "Eastern Time" },
      { city: "Raleigh", region: "North Carolina", timeZone: "Eastern Time" },
      { city: "Tampa", region: "Florida", timeZone: "Eastern Time" },
      { city: "Nashville", region: "Tennessee", timeZone: "Central Time" },
      { city: "Minneapolis", region: "Minnesota", timeZone: "Central Time" },
      { city: "Kansas City", region: "Missouri", timeZone: "Central Time" },
      { city: "Denver", region: "Colorado", timeZone: "Mountain Time" },
      { city: "Phoenix", region: "Arizona", timeZone: "Mountain Time" },
      { city: "Sacramento", region: "California", timeZone: "Pacific Time" },
      { city: "San Diego", region: "California", timeZone: "Pacific Time" },
      { city: "Seattle", region: "Washington", timeZone: "Pacific Time" },
    ],
  },
  UK: {
    label: "United Kingdom",
    englishVariant: "British English",
    phrasing:
      "British word choice and spelling where it comes up (mobile, postcode, pounds, VAT, Ltd; \"cheers\", \"brilliant\", \"no worries\" only when natural). Understated and polite but direct. Do NOT put on an accent or overdo slang.",
    greetingExamples: (first) => ["Hello?", `Hello, ${first} speaking.`, "Yes, hello?"],
    surnames: [
      "Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Evans", "Thomas", "Roberts", "Johnson",
      "Walker", "Wright", "Robinson", "Thompson", "White", "Hughes", "Edwards", "Green", "Hall", "Wood",
      "Harris", "Lewis", "Martin", "Jackson", "Clarke", "Patel", "Khan", "Cooper", "Morgan", "Bell",
    ],
    companyPrefixes: ["Kingsway", "Abbey", "Ashdown", "Northfield", "Thames", "Pennine", "Hartley", "Oakleigh", "Millbrook", "Ravensworth", "Bramley", "Wexcombe"],
    companySuffixes: ["Ltd", "Group", "Partners", "& Co"],
    locations: [
      { city: "Manchester", region: "England", timeZone: "UK time" },
      { city: "Leeds", region: "England", timeZone: "UK time" },
      { city: "Birmingham", region: "England", timeZone: "UK time" },
      { city: "Bristol", region: "England", timeZone: "UK time" },
      { city: "Sheffield", region: "England", timeZone: "UK time" },
      { city: "Nottingham", region: "England", timeZone: "UK time" },
      { city: "Liverpool", region: "England", timeZone: "UK time" },
      { city: "Newcastle", region: "England", timeZone: "UK time" },
      { city: "Glasgow", region: "Scotland", timeZone: "UK time" },
      { city: "Cardiff", region: "Wales", timeZone: "UK time" },
    ],
  },
  Canada: {
    label: "Canada",
    englishVariant: "Canadian English",
    phrasing:
      "Mostly like North American business phone talk, with Canadian usage where it comes up (postal code, GST/HST, Inc., \"sorry\" as a natural softener). Avoid \"eh\" and other stereotypes. Do NOT put on an accent.",
    greetingExamples: (first) => ["Hello?", `Yeah, this is ${first}.`, "Hello, who's calling?"],
    surnames: [
      "Smith", "Brown", "Tremblay", "Martin", "Roy", "Wilson", "MacDonald", "Gagnon", "Johnson", "Campbell",
      "Anderson", "Taylor", "Singh", "Chen", "Wong", "Stewart", "Fraser", "Bouchard", "Murphy", "Patel",
    ],
    companyPrefixes: ["Maple", "Northern", "Lakeshore", "Cedarview", "Prairie", "Harborfront", "Timberline", "Rideau", "Fraser", "Summit"],
    companySuffixes: ["Inc.", "Group", "Partners", "Ltd."],
    locations: [
      { city: "Toronto", region: "Ontario", timeZone: "Eastern Time" },
      { city: "Mississauga", region: "Ontario", timeZone: "Eastern Time" },
      { city: "Ottawa", region: "Ontario", timeZone: "Eastern Time" },
      { city: "Calgary", region: "Alberta", timeZone: "Mountain Time" },
      { city: "Edmonton", region: "Alberta", timeZone: "Mountain Time" },
      { city: "Vancouver", region: "British Columbia", timeZone: "Pacific Time" },
      { city: "Winnipeg", region: "Manitoba", timeZone: "Central Time" },
      { city: "Halifax", region: "Nova Scotia", timeZone: "Atlantic Time" },
    ],
  },
  Australia: {
    label: "Australia",
    englishVariant: "Australian English",
    phrasing:
      "Relaxed, direct Australian business phone talk with Australian word choice where it comes up (mobile, GST, ABN, Pty Ltd; \"no worries\" or \"reckon\" only occasionally and only when natural). Do NOT put on an accent or lean on stereotypes.",
    greetingExamples: (first) => [`Hello, ${first} speaking.`, "Yeah, hello?", "Hello, who's this?"],
    surnames: [
      "Smith", "Jones", "Williams", "Brown", "Wilson", "Taylor", "Nguyen", "Kelly", "Murphy", "O'Brien",
      "Ryan", "Walker", "King", "White", "Anderson", "Thompson", "Martin", "Harris", "Young", "Campbell",
    ],
    companyPrefixes: ["Southern Cross", "Coastal", "Bluegum", "Harbourside", "Banksia", "Riverina", "Wattle", "Ironbark", "Goldfields", "Tasman"],
    companySuffixes: ["Pty Ltd", "Group", "Partners"],
    locations: [
      { city: "Sydney", region: "New South Wales", timeZone: "Eastern Australian time" },
      { city: "Melbourne", region: "Victoria", timeZone: "Eastern Australian time" },
      { city: "Brisbane", region: "Queensland", timeZone: "Queensland time" },
      { city: "Gold Coast", region: "Queensland", timeZone: "Queensland time" },
      { city: "Canberra", region: "ACT", timeZone: "Eastern Australian time" },
      { city: "Adelaide", region: "South Australia", timeZone: "Central Australian time" },
      { city: "Perth", region: "Western Australia", timeZone: "Western Australian time" },
    ],
  },
  Other: {
    label: "Other",
    englishVariant: "neutral international business English",
    phrasing: "Plain, neutral international business English. Avoid heavy regional slang.",
    greetingExamples: (first) => ["Hello?", `Hello, ${first} speaking.`, "Yes, hello?"],
    surnames: US_SURNAMES,
    companyPrefixes: US_PREFIXES,
    companySuffixes: ["Group", "Partners", "Associates"],
    locations: [],
  },
};

export function getMarketConfig(market: ProspectMarket | undefined): MarketConfig {
  return MARKET_CONFIG[market ?? "US"] ?? MARKET_CONFIG.US;
}
