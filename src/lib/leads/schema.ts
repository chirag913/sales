// Shared by the landing-page form (client) and POST /api/leads (server), so
// the options the visitor sees and the values the server accepts can't drift.
// validateLeadInput() is the ONLY validation that counts: the client uses it
// for quick feedback, but the server re-runs it on every request.

export const LEAD_INTENTS = ["custom_demo_requested", "talk_to_team"] as const;
export type LeadIntent = (typeof LEAD_INTENTS)[number];

export const MONTHLY_LEAD_OPTIONS = [
  { value: "under_50", label: "Under 50" },
  { value: "50_200", label: "50 – 200" },
  { value: "200_1000", label: "200 – 1,000" },
  { value: "1000_5000", label: "1,000 – 5,000" },
  { value: "5000_plus", label: "5,000+" },
  { value: "not_sure", label: "Not sure yet" },
] as const;
export type MonthlyLeads = (typeof MONTHLY_LEAD_OPTIONS)[number]["value"];

export const LEAD_SOURCE_OPTIONS = [
  { value: "meta_ads", label: "Meta Ads" },
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "existing_database", label: "Existing database" },
  { value: "other", label: "Other" },
] as const;
export type LeadSource = (typeof LEAD_SOURCE_OPTIONS)[number]["value"];

export const LIMITS = {
  name: { min: 2, max: 80 },
  business: { min: 2, max: 120 },
  sells: { min: 3, max: 300 },
} as const;

export interface LeadInput {
  name: string;
  businessName: string;
  phone: string;
  // Optional, and only set when the visitor gave a number that differs from
  // their phone. null means "not provided" (the phone number is then the
  // contact number for WhatsApp too).
  whatsapp: string | null;
  whatTheySell: string;
  monthlyLeads: MonthlyLeads;
  leadSources: LeadSource[];
  intent: LeadIntent;
}

export type LeadField = "name" | "businessName" | "phone" | "whatsapp" | "whatTheySell" | "monthlyLeads" | "leadSources" | "intent";
export type LeadErrors = Partial<Record<LeadField, string>>;

export type ValidationResult = { ok: true; data: LeadInput } | { ok: false; errors: LeadErrors };

// Characters removed from every free-text field: C0/C1 control characters,
// zero-width and bidirectional-override characters, line/paragraph separators
// and the BOM. Built from code point ranges so the source contains no
// invisible characters.
const STRIPPED_RANGES: [number, number][] = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x200b, 0x200f],
  [0x2028, 0x202e],
  [0x2066, 0x2069],
  [0xfeff, 0xfeff],
];

function isStripped(codePoint: number): boolean {
  return STRIPPED_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to);
}

// Normalize Unicode and whitespace, drop invisible/control characters.
export function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  let out = "";
  for (const char of value.normalize("NFC")) {
    out += isStripped(char.codePointAt(0) as number) ? " " : char;
  }
  return out.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

const URL_LIKE = /(https?:\/\/|www\.)/i;

// Accepts Indian mobile numbers (with or without +91 / 0 / 91) and, as a
// courtesy to founders abroad, other international numbers written with a
// leading +. Returns E.164, or null when it isn't a plausible number.
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^[+\d][\d\s\-().]*$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) {
    if (digits.startsWith("91")) return /^91[6-9]\d{9}$/.test(digits) ? `+${digits}` : null;
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

export function validateLeadInput(raw: unknown): ValidationResult {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: LeadErrors = {};

  const name = cleanText(body.name, LIMITS.name.max);
  if (name.length < LIMITS.name.min) errors.name = "Please enter your name.";
  else if (URL_LIKE.test(name)) errors.name = "Please enter your name, not a link.";

  const businessName = cleanText(body.businessName, LIMITS.business.max);
  if (businessName.length < LIMITS.business.min) errors.businessName = "Please enter your business name.";
  else if (URL_LIKE.test(businessName)) errors.businessName = "Please enter your business name, not a link.";

  const phoneRaw = cleanText(body.phone, 30);
  const phone = normalizePhone(phoneRaw);
  if (!phoneRaw) errors.phone = "Please enter your phone or WhatsApp number.";
  else if (!phone) errors.phone = "That doesn't look like a valid number. Try a 10-digit mobile number.";

  const whatsappRaw = cleanText(body.whatsapp, 30);
  const whatsapp = whatsappRaw ? normalizePhone(whatsappRaw) : null;
  if (whatsappRaw && !whatsapp) errors.whatsapp = "That doesn't look like a valid WhatsApp number. Leave it blank to use your phone number.";

  const whatTheySell = cleanText(body.whatTheySell, LIMITS.sells.max);
  if (whatTheySell.length < LIMITS.sells.min) errors.whatTheySell = "Tell us briefly what your business sells.";

  const monthlyLeads = MONTHLY_LEAD_OPTIONS.find((o) => o.value === body.monthlyLeads)?.value;
  if (!monthlyLeads) errors.monthlyLeads = "Choose an approximate number of leads per month.";

  // Optional. Unknown values are rejected rather than silently dropped, so a
  // tampered request is visible as a 400 instead of storing junk.
  const sourcesRaw = body.leadSources === undefined ? [] : body.leadSources;
  const allowedSources: readonly string[] = LEAD_SOURCE_OPTIONS.map((o) => o.value);
  let leadSources: LeadSource[] = [];
  if (
    !Array.isArray(sourcesRaw) ||
    sourcesRaw.length > LEAD_SOURCE_OPTIONS.length ||
    !sourcesRaw.every((s) => typeof s === "string" && allowedSources.includes(s))
  ) {
    errors.leadSources = "Please choose from the listed lead sources.";
  } else {
    leadSources = [...new Set(sourcesRaw as LeadSource[])];
  }

  const intent = LEAD_INTENTS.find((i) => i === body.intent);
  if (!intent) errors.intent = "Choose how you'd like to continue.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name,
      businessName,
      phone: phone as string,
      whatsapp,
      whatTheySell,
      monthlyLeads: monthlyLeads as MonthlyLeads,
      leadSources,
      intent: intent as LeadIntent,
    },
  };
}

// Only these UTM keys are kept, each truncated: it's marketing attribution,
// never a place to store arbitrary client-supplied data.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export function cleanUtm(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of UTM_KEYS) {
    const value = cleanText((raw as Record<string, unknown>)[key], 100);
    if (value) out[key] = value;
  }
  return out;
}
