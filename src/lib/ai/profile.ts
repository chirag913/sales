import { getOpenAIClient } from "@/lib/ai/client";
import { TEXT_MODEL } from "@/lib/ai/models";
import { TrainingProfile } from "@/lib/types";

const SYSTEM_PROMPT = `You are a B2B cold-calling strategist helping someone set up a realistic
cold-call practice session. Given a short description of what they sell and who they're
targeting, infer a useful training profile.

Rules:
- Infer ICP job titles, company size range, pain points, likely objections, a sales
  objective, and a typical prospect description from the input.
- Never invent clients, results, testimonials, offices, guarantees, credentials, pricing,
  or case studies. These are not part of your output and must never be referenced, even
  implicitly.
- Use the user's selected prospect market unless their description clearly states a
  different one.
- For every key in "assumptions", set it to true if you inferred that field rather than
  the user stating it directly, or false if the user's input directly specified it.
- Keep arrays concise: 3-5 items for icpTitles, additionalCriteria, painPoints, and
  likelyObjections.
- Phrase likelyObjections as things a real prospect would actually say out loud.
- salesObjective must be the closest match of: book_meeting, book_demo, qualify_prospect,
  make_sale. salesObjectiveDetail is a short, specific natural-language description of the
  objective (e.g. "Book an onsite walkthrough / estimate").
- additionalCriteria holds any other qualifying detail worth surfacing (e.g. facility size,
  vertical, sub-segment) — leave it as an empty array if nothing else is relevant.
- callType is "warm" only if the input mentions prior contact, an inbound lead, a referral, or
  an existing relationship with the prospect — default to "cold" otherwise, since cold outbound
  is this product's primary use case. When callType is "warm", priorContextDetail must be a
  SPECIFIC, plausible, truthful sentence about what actually happened before (e.g. "They filled
  out a contact form last week asking about pricing") — never vague ("we talked before," "you've
  spoken"), since the prospect needs to believably remember it. When callType is "cold",
  priorContextDetail must be an empty string.`;

const trainingProfileSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    market: { type: "string", enum: ["US", "UK", "Canada", "Australia", "Other"] },
    service: { type: "string" },
    icpTitles: { type: "array", items: { type: "string" } },
    companySizeRange: { type: "string" },
    additionalCriteria: { type: "array", items: { type: "string" } },
    painPoints: { type: "array", items: { type: "string" } },
    likelyObjections: { type: "array", items: { type: "string" } },
    salesObjective: {
      type: "string",
      enum: ["book_meeting", "book_demo", "qualify_prospect", "make_sale"],
    },
    salesObjectiveDetail: { type: "string" },
    typicalProspect: { type: "string" },
    callType: { type: "string", enum: ["cold", "warm"] },
    // Always present (OpenAI strict mode requires every property to be
    // required) — empty string when callType is "cold", same convention as
    // additionalCriteria being an empty array when nothing else applies.
    priorContextDetail: { type: "string" },
    assumptions: {
      type: "object",
      additionalProperties: false,
      properties: {
        market: { type: "boolean" },
        service: { type: "boolean" },
        icpTitles: { type: "boolean" },
        companySizeRange: { type: "boolean" },
        additionalCriteria: { type: "boolean" },
        painPoints: { type: "boolean" },
        likelyObjections: { type: "boolean" },
        salesObjective: { type: "boolean" },
        typicalProspect: { type: "boolean" },
        callType: { type: "boolean" },
        priorContextDetail: { type: "boolean" },
      },
      required: [
        "market",
        "service",
        "icpTitles",
        "companySizeRange",
        "additionalCriteria",
        "painPoints",
        "likelyObjections",
        "salesObjective",
        "typicalProspect",
        "callType",
        "priorContextDetail",
      ],
    },
  },
  required: [
    "market",
    "service",
    "icpTitles",
    "companySizeRange",
    "additionalCriteria",
    "painPoints",
    "likelyObjections",
    "salesObjective",
    "salesObjectiveDetail",
    "typicalProspect",
    "callType",
    "priorContextDetail",
    "assumptions",
  ],
} as const;

export interface GenerateTrainingProfileInput {
  description: string;
  context: string;
  market: string;
}

export async function generateTrainingProfile(
  input: GenerateTrainingProfileInput
): Promise<TrainingProfile> {
  const client = getOpenAIClient();

  const userMessage = [
    `What they're selling / who they're targeting: ${input.description}`,
    input.context ? `Additional context: ${input.context}` : null,
    `Selected prospect market: ${input.market}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "training_profile",
        strict: true,
        schema: trainingProfileSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from model");
  return JSON.parse(raw) as TrainingProfile;
}

const REFINE_SYSTEM_PROMPT = `You are updating an existing cold-call training profile based on a
user's natural-language change request.

Rules:
- You will receive the current training profile as JSON, plus a short instruction describing
  what to change.
- Copy every field NOT explicitly targeted by the instruction VERBATIM — character-for-character,
  same array items in the same order — from the current profile. Do not paraphrase, reorder,
  add to, remove from, or "improve" any array (icpTitles, additionalCriteria, painPoints,
  likelyObjections) unless the instruction is specifically about that field. Only touch the exact
  field(s) the instruction is about; if you're unsure whether a field is targeted, leave it
  untouched.
- Never invent clients, results, testimonials, offices, guarantees, credentials, pricing, or
  case studies.
- If the instruction directly changes a field, set that field's key in "assumptions" to false
  (the user just told you this directly).
- If applying the instruction forces you to infer a related change (e.g. removing one ICP
  segment means recommending a replacement), set that field's assumptions key to true.
- Keep arrays concise: 3-5 items for icpTitles, additionalCriteria, painPoints, and
  likelyObjections.
- salesObjective must remain one of: book_meeting, book_demo, qualify_prospect, make_sale.
- Return the full, complete updated profile — not a partial diff.`;

export async function refineTrainingProfile(
  profile: TrainingProfile,
  instruction: string
): Promise<TrainingProfile> {
  const client = getOpenAIClient();

  const userMessage = [
    `Current training profile:\n${JSON.stringify(profile, null, 2)}`,
    `Change request: ${instruction}`,
  ].join("\n\n");

  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: REFINE_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "training_profile",
        strict: true,
        schema: trainingProfileSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from model");
  return JSON.parse(raw) as TrainingProfile;
}
