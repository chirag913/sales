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
  vertical, sub-segment) — leave it as an empty array if nothing else is relevant.`;

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
