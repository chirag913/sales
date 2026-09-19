import { getOpenAIClient } from "@/lib/ai/client";
import { TEXT_MODEL } from "@/lib/ai/models";
import { buildCompanyContext } from "@/lib/prompts/companyContext";
import { normalizeTrainingProfile } from "@/lib/profile/normalize";
import { ComputedTranscriptMetrics } from "@/lib/scoring/metrics";
import { transcriptToText } from "@/lib/transcript";
import {
  BetterResponseMoment,
  CALL_SCORE_CATEGORY_NAMES,
  CallScoreCategory,
  ObjectiveOutcome,
  SalesProfile,
  Scenario,
  TrainingProfile,
  TranscriptEntry,
} from "@/lib/types";

const SYSTEM_PROMPT = `You are a rigorous, evidence-based cold-call sales coach scoring a completed practice call.
This is a training tool: be honest, not encouraging for its own sake, and always specific.

Score exactly these 10 categories, each 0-10, based ONLY on what actually happened in the
transcript: ${CALL_SCORE_CATEGORY_NAMES.join(", ")}.

## Scale (same for every category)
0-2  absent or harmful to the call
3-4  attempted but weak, with clear problems
5-6  adequate: does the job with real gaps
7-8  good: effective, minor gaps
9-10 excellent: hard to meaningfully improve
Avoid clustering every category at 5-7. Use the full range when the evidence supports it.

## What each category measures (score them on DIFFERENT evidence)
- Opening: the caller's first turns. Said who they are and why they called, gave a relevant reason
  to stay on, did not dump a pitch or waste the prospect's attention.
- Confidence: judged from WORDING only (you have no audio): direct, unhedged statements, recovering
  after pushback, not apologetic or padded with filler ("just", "sorry to bother you", "I was
  wondering if maybe"). Say in the feedback that this is from wording. If the call is too short to
  judge, score 4-6 and say so.
- Discovery: how much of the prospect's real situation the caller UNCOVERED (current solution, pain,
  who decides, timing) before or while pitching. This is about information gained.
- Listening: built on what the prospect actually said; did not repeat answered questions, talk past
  the prospect or ignore an objection.
- Credibility: truthful, specific, believable; handled "who are you / where are you" honestly;
  penalize vague hype or anything not supported by the caller's listed facts.
- Value proposition: connected the offering to THIS prospect's stated situation, concisely, at a
  sensible moment (not a feature dump before discovery).
- Objection handling: acknowledged, clarified, answered relevantly and moved forward. Handled versus
  unhandled objections are counted below.
- Question quality: the CRAFT of the questions (open, specific, one at a time, purposeful) as
  opposed to how much they uncovered (that is Discovery). Stacked, leading or filler questions score low.
- Call control: steered toward the objective, kept turns reasonably short (use the computed metrics
  below as evidence: talk share, longest monologue), recovered from deflection, ended cleanly.
- Closing: proposed a specific, appropriate next step when the moment allowed, and handled the reply.
  If the call never reached a point where a next step was realistic (for example the prospect ended
  the call early), score 5 and say it was not reached; do NOT give 0-2 solely because the call ended
  early. Poor earlier behavior is scored in the categories it belongs to.

## Context you are given
Scenario, difficulty, the caller's objective, the prospect's private conditions (situation, current
solution, authority, urgency) and the success/failure conditions, the call type, who ended the
call and why, the duration, and computed metrics. Use them:
- Difficulty changes what is realistic, not the quality bar. Judge craft the same at every difficulty;
  do not penalize the caller for an objection or outcome the prospect's conditions made unwinnable
  when the caller responded sensibly.
- The prospect's conditions explain the prospect's behavior. Never reveal or invent conditions beyond
  what is given.

## Objective outcome
Decide objectiveOutcome.status against the scenario's objective and successCondition:
- achieved: the success condition was met.
- partially_achieved: real progress short of the full condition (e.g. a smaller agreed step, key
  information gained and the prospect softened).
- not_achieved: it was realistically reachable and the caller did not get there.
- not_reachable: use ONLY when the caller did the important things reasonably well and the prospect's
  conditions (authority, urgency, budget, an incumbent, ending the call) blocked it on this call.
objectiveOutcome.reason: 1-2 sentences of evidence.

## Feedback rules
- Every category gets four fields, each 1-2 sentences, all grounded in the transcript:
  - whatHappened: the specific evidence, quoting or closely paraphrasing the CALLER's actual words. A
    score of 7+ must still cite a specific strong moment; below 7 must cite what was said or missed.
  - whyItMattered: the consequence in THIS call (what the prospect did or said, or what it cost).
  - whatToChange: one concrete action for next time.
  - betterExample: a short line the caller could actually say. It must ONLY use the caller's listed
    offer and facts: never invent clients, results, credentials, offices, or guarantees. If the
    listed information does not cover something the prospect asked, the example must be a truthful
    answer, not a fabricated one. For a 9-10, use "Keep doing this: ..." with the specific behavior.
- Do not repeat yourself across the report. Give each significant moment ONE home: the category where
  it mattered most. Other categories may refer back to it in a few words but must find their own
  evidence. If the call really contains few distinct moments, say so briefly rather than restating.
- biggestMistake: 2-4 sentences on the single most costly mistake, referencing the actual moment. If
  the caller made no serious mistake, say what limited the call most.
- bestMoment: what the caller did well, referencing the actual moment.
- betterResponses: up to 3 further high-value moments, NOT the moment already used as the main evidence
  for biggestMistake. Each: whatHappened (context), whatYouSaid (the caller's actual words),
  betterResponse (a concrete alternative line, same truthfulness rule as betterExample), whyItsBetter.
  Return fewer than 3 (or none) if there aren't distinct moments.
- workOnNext: 2-3 short, imperative, specific things to do differently on the NEXT attempt at this same
  scenario, ordered by impact (e.g. "Ask one question about how they handle X before mentioning your
  service"). No generic advice.
- If the call was very short, score honestly: a low score with a clear reason such as "call ended
  before discovery could happen" is valid and expected.
- Also estimate from the transcript: objectionCount (distinct objections the prospect raised),
  objectionsHandled (addressed reasonably well), missedBuyingSignals (buying signals the caller did not
  pick up), pitchCount, nextStepAskCount.

## Call type
- cold: first contact. If the caller claimed prior contact that didn't exist and the prospect correctly
  denied it, that is a real mistake (usually Opening or Credibility, and biggestMistake if it is the
  most costly issue).
- cold_after_outreach: an email/message was sent but no live conversation ever happened. A FALSE claim of
  a conversation, agreement or scheduled call is a real mistake as above; correctly referencing the real
  outreach is not a mistake and deserves credit when used well.
- warm: accurately referencing the real prior context is expected and correct; never penalize it.`;

const categoryItemSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string", enum: [...CALL_SCORE_CATEGORY_NAMES] },
    score: { type: "integer" },
    whatHappened: { type: "string" },
    whyItMattered: { type: "string" },
    whatToChange: { type: "string" },
    betterExample: { type: "string" },
  },
  required: ["name", "score", "whatHappened", "whyItMattered", "whatToChange", "betterExample"],
} as const;

const scoreSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    categories: { type: "array", items: categoryItemSchema },
    objectiveOutcome: {
      type: "object",
      additionalProperties: false,
      properties: {
        status: { type: "string", enum: ["achieved", "partially_achieved", "not_achieved", "not_reachable"] },
        reason: { type: "string" },
      },
      required: ["status", "reason"],
    },
    workOnNext: { type: "array", items: { type: "string" } },
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
    "objectiveOutcome",
    "workOnNext",
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
  objectiveOutcome: ObjectiveOutcome;
  workOnNext: string[];
  objectionCount: number;
  objectionsHandled: number;
  missedBuyingSignals: number;
  pitchCount: number;
  nextStepAskCount: number;
  biggestMistake: string;
  bestMoment: string;
  betterResponses: BetterResponseMoment[];
}

export type CallEndedBy = "caller" | "prospect" | "timeout";

export interface GenerateCallScoreInput {
  transcript: TranscriptEntry[];
  salesProfile: SalesProfile;
  trainingProfile: TrainingProfile;
  scenario: Scenario;
  durationSeconds: number;
  metrics: ComputedTranscriptMetrics;
  endedBy: CallEndedBy;
  prospectEndReason?: string;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score)));
}

const ENDED_BY_LINES: Record<CallEndedBy, string> = {
  caller: "The caller ended the call.",
  prospect: "The PROSPECT ended the call (hung up).",
  timeout: "The call reached the time limit and was ended automatically.",
};

interface RawScoreResult extends Omit<CallScoreAiResult, "categories"> {
  categories: {
    name: CallScoreCategory["name"];
    score: number;
    whatHappened: string;
    whyItMattered: string;
    whatToChange: string;
    betterExample: string;
  }[];
}

export async function generateCallScore({
  transcript,
  salesProfile,
  trainingProfile: storedProfile,
  scenario,
  durationSeconds,
  metrics,
  endedBy,
  prospectEndReason,
}: GenerateCallScoreInput): Promise<CallScoreAiResult> {
  const client = getOpenAIClient();
  const trainingProfile = normalizeTrainingProfile(storedProfile);
  const { offerLines, factLines } = buildCompanyContext(salesProfile, trainingProfile);

  const callType = trainingProfile.callType ?? "cold";
  const CALL_TYPE_LINES: Record<TrainingProfile["callType"], string> = {
    cold: `Call type: cold — this is first contact; the prospect has never heard from this caller before.`,
    cold_after_outreach: `Call type: cold_after_outreach — an email/message was sent first (${trainingProfile.priorContextDetail}), but no live conversation ever happened before this call.`,
    warm: `Call type: warm — the caller has real prior context with this prospect: ${trainingProfile.priorContextDetail}`,
  };

  const conditions = [
    scenario.situation && `Situation: ${scenario.situation}`,
    scenario.existingSolution && `Current solution: ${scenario.existingSolution}`,
    scenario.authority && `Authority: ${scenario.authority}`,
    scenario.urgency && `Urgency to change: ${scenario.urgency}`,
    scenario.budgetSensitivity && `Budget sensitivity: ${scenario.budgetSensitivity}`,
  ].filter(Boolean);

  const endLine =
    endedBy === "prospect" && prospectEndReason
      ? `${ENDED_BY_LINES.prospect} Stated reason: ${prospectEndReason.replace(/_/g, " ")}.`
      : ENDED_BY_LINES[endedBy];

  const userMessage = `Scenario: ${scenario.name} (${scenario.difficulty}) — ${scenario.description}
Prospect: ${scenario.prospectRole ?? "not specified"}${scenario.prospectIndustry ? `, ${scenario.prospectIndustry}` : ""}
${conditions.map((line) => `- ${line}`).join("\n")}

Caller's objective: ${scenario.objective}
Success condition: ${scenario.successCondition ?? "not specified — judge against the objective"}
Failure condition: ${scenario.failureCondition ?? "not specified"}
${CALL_TYPE_LINES[callType]}

How the call ended: ${endLine}
Duration: ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s
Computed metrics (exact, from the transcript): caller talked ${metrics.userSpeakingPercent}% of the words,
longest single caller turn ${metrics.longestUserMonologueWords} words, caller asked ${metrics.questionCount} question marks.

Caller's offer:
${offerLines.map((l) => `- ${l}`).join("\n")}

Truthful facts about the caller's company (never go beyond this):
${factLines.map((l) => `- ${l}`).join("\n")}

Full call transcript (oldest first; only what was actually said and heard):
${transcriptToText(transcript)}`;

  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    // Low temperature: the same call should score close to the same each
    // time, so "vs last call" deltas mean something.
    temperature: 0.2,
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

  const parsed = JSON.parse(raw) as RawScoreResult;

  // The schema can't enforce "each of the 10 exactly once". An incomplete or
  // duplicated set would corrupt the 100-point total, so fail (the caller can
  // retry scoring) rather than store a wrong number.
  const names = new Set(parsed.categories.map((c) => c.name));
  if (parsed.categories.length !== CALL_SCORE_CATEGORY_NAMES.length || names.size !== CALL_SCORE_CATEGORY_NAMES.length) {
    throw new Error("Scoring returned an incomplete set of categories");
  }

  return {
    ...parsed,
    categories: parsed.categories.map((c) => ({
      name: c.name,
      score: clampScore(c.score),
      // Stored under the original key names so calls saved before per-category
      // feedback existed and new calls share one shape (see CallScoreCategory).
      reason: c.whatHappened,
      betterApproach: c.whatToChange,
      whyItMattered: c.whyItMattered,
      betterExample: c.betterExample,
    })),
  };
}
