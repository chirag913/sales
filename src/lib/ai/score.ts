import { getOpenAIClient } from "@/lib/ai/client";
import { TEXT_MODEL } from "@/lib/ai/models";
import { buildCompanyContext } from "@/lib/prompts/companyContext";
import {
  BetterResponseMoment,
  CALL_SCORE_CATEGORY_NAMES,
  CallScoreCategory,
  Scenario,
  SalesProfile,
  TrainingProfile,
  TranscriptEntry,
} from "@/lib/types";

const SYSTEM_PROMPT = `You are a rigorous, evidence-based cold-call sales coach scoring a completed
practice call transcript. This is a training tool — be honest, not encouraging for its own sake.

Score exactly these 10 categories, each 0-10, based ONLY on what actually happened in the
transcript: ${CALL_SCORE_CATEGORY_NAMES.join(", ")}.

Also estimate, from the transcript content:
- objectionCount: number of distinct objections the prospect raised
- objectionsHandled: how many of those the caller addressed reasonably well
- missedBuyingSignals: number of buying signals the prospect gave that the caller didn't capitalize on
- pitchCount: number of times the caller pitched or explained the offer
- nextStepAskCount: number of times the caller asked for a next step, meeting, or availability

Rules:
- Every category score below 7 MUST have a reason that references something specific the caller
  actually said or didn't do — never a generic statement like "could be better."
- betterApproach for each category is one short, concrete alternative action.
- biggestMistake: 2-4 sentences on the single most important mistake, referencing the actual moment.
- bestMoment: what the caller did well, referencing the actual moment.
- betterResponses: up to 3 of the most important moments, each with whatHappened (context),
  whatYouSaid (quote the caller's actual words), betterResponse (a concrete alternative line the
  caller could have said instead), and whyItsBetter. The betterResponse must ONLY reference the
  caller's ACTUAL offer/proof info given below — never invent clients, results, credentials,
  offices, or guarantees that aren't listed. If the caller's info doesn't cover something the
  prospect asked about, the better response should be a truthful answer, not a fabricated one.
- If the call was very short, score honestly — a low score with a clear reason like "call ended
  before discovery could happen" is valid and expected, not something to avoid.
- Avoid repeating yourself across fields: category reasons, biggestMistake, and betterResponses are
  shown together, so keep them complementary rather than restating the same point in different
  words. Each should reference a different specific moment from the call wherever possible. If the
  call really only has one significant issue, let biggestMistake cover it thoroughly and have
  betterResponses focus on other, smaller moments rather than re-describing the same issue again.`;

const scoreSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    categories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string", enum: [...CALL_SCORE_CATEGORY_NAMES] },
          score: { type: "integer" },
          reason: { type: "string" },
          betterApproach: { type: "string" },
        },
        required: ["name", "score", "reason", "betterApproach"],
      },
    },
    objectionCount: { type: "integer" },
    objectionsHandled: { type: "integer" },
    missedBuyingSignals: { type: "integer" },
    pitchCount: { type: "integer" },
    nextStepAskCount: { type: "integer" },
    biggestMistake: { type: "string" },
    bestMoment: { type: "string" },
    betterResponses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          whatHappened: { type: "string" },
          whatYouSaid: { type: "string" },
          betterResponse: { type: "string" },
          whyItsBetter: { type: "string" },
        },
        required: ["whatHappened", "whatYouSaid", "betterResponse", "whyItsBetter"],
      },
    },
  },
  required: [
    "categories",
    "objectionCount",
    "objectionsHandled",
    "missedBuyingSignals",
    "pitchCount",
    "nextStepAskCount",
    "biggestMistake",
    "bestMoment",
    "betterResponses",
  ],
} as const;

export interface CallScoreAiResult {
  categories: CallScoreCategory[];
  objectionCount: number;
  objectionsHandled: number;
  missedBuyingSignals: number;
  pitchCount: number;
  nextStepAskCount: number;
  biggestMistake: string;
  bestMoment: string;
  betterResponses: BetterResponseMoment[];
}

export interface GenerateCallScoreInput {
  transcript: TranscriptEntry[];
  salesProfile: SalesProfile;
  trainingProfile: TrainingProfile;
  scenario: Scenario;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score)));
}

export async function generateCallScore({
  transcript,
  salesProfile,
  trainingProfile,
  scenario,
}: GenerateCallScoreInput): Promise<CallScoreAiResult> {
  const client = getOpenAIClient();
  const { offerLines, factLines } = buildCompanyContext(salesProfile, trainingProfile);

  const transcriptText = transcript
    .map((entry) => `${entry.role === "user" ? "Caller" : "Prospect"}: ${entry.text}`)
    .join("\n");

  const userMessage = `Scenario: ${scenario.name} (${scenario.difficulty}) — ${scenario.description}
Call objective: ${scenario.objective}

Caller's offer:
${offerLines.map((l) => `- ${l}`).join("\n")}

Truthful facts about the caller's company (never go beyond this):
${factLines.map((l) => `- ${l}`).join("\n")}

Full call transcript (oldest first):
${transcriptText}`;

  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "call_score",
        strict: true,
        schema: scoreSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from model");

  const parsed = JSON.parse(raw) as CallScoreAiResult;

  return {
    ...parsed,
    categories: parsed.categories.map((c) => ({ ...c, score: clampScore(c.score) })),
  };
}
