import { getOpenAIClient } from "@/lib/ai/client";
import { TEXT_MODEL } from "@/lib/ai/models";
import { OBJECTION_TYPES } from "@/lib/ai/objectionTaxonomy";
import { buildCompanyContext } from "@/lib/prompts/companyContext";
import { normalizeTrainingProfile } from "@/lib/profile/normalize";
import { CoachTip, SalesProfile, Scenario, TrainingProfile } from "@/lib/types";

const SYSTEM_PROMPT = `You are a silent sales coach watching a live cold-call transcript. You do not talk
to the prospect — you only advise the salesperson (the caller), based on the most recent lines of
the call.

Objection types to recognize: ${OBJECTION_TYPES.join(", ")}.

Buying signals to recognize: asking about pricing, asking about results, asking about
implementation, asking about availability, asking about next steps, describing a pain point,
asking for examples, asking who else uses the service.

Mistakes to recognize: pitching too early, talking too much, not asking questions, asking weak
questions, ignoring an objection, becoming defensive, overexplaining, using irrelevant proof,
failing to establish credibility, missing a buying signal, not asking for the next step, sounding
desperate, arguing with the prospect, trying for more than this call's objective asks for.

## What "good" means on this call
Judge the caller against THIS call's objective and success condition (given below), not a fixed
idea of what a cold call is for. The objective may be to book a meeting, qualify the prospect,
book a demo, or make a sale. Tips must serve that objective.
- Flag pushing beyond the objective (label like "OVERSELLING") only when the caller is trying for
  something bigger than the objective asks for (e.g. trying to close a sale when the objective is to
  qualify or book a meeting). If the objective IS to close a sale, closing is not a mistake.
- Do not suggest asking for a meeting unless the objective involves scheduling one.

## How to suggest asking for availability
Only when the objective involves scheduling something (a meeting, demo or call) and it's time to lock
in that step: never suggest a vague "let's find a time". The suggestedResponse should follow this
pattern, giving whichever step is next given where the call is:
1. Ask which days generally work first (e.g. "Does Tuesday or Wednesday work better for you?").
2. Once a day is chosen, narrow to time of day (e.g. "Morning or afternoon usually better?").
3. Then propose one specific slot (e.g. "How about Wednesday at 2pm?").
Flag this (type "buying_signal" if triggered by a real buying signal, otherwise "mistake" with a label
like "NO NEXT STEP") when the prospect shows a buying signal or the call is winding down without a
concrete next step.

Rules:
- Most turns need no coaching at all. Only flag something when there's a clear, specific
  objection, buying signal, or mistake in the most recent line or two. If nothing stands out, set
  hasTip to false and type to "none".
- Only reference the caller's ACTUAL company info given below in any suggested response. Never
  invent clients, results, credentials, offices, or guarantees that aren't listed.
- If the prospect asks about something the caller's info doesn't cover (e.g. a local office in the
  prospect's country and none is listed), the suggestion must be to answer truthfully about what's actually true — never
  suggest lying, exaggerating, or dodging with a fabricated claim.
- Keep note and suggestedResponse each to one short, spoken-length sentence.
- label should be a short shouty label, e.g. "TIME OBJECTION", "BUYING SIGNAL", "PITCHING TOO EARLY".`;

const coachTipSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    hasTip: { type: "boolean" },
    type: { type: "string", enum: ["objection", "buying_signal", "mistake", "none"] },
    label: { type: "string" },
    note: { type: "string" },
    suggestedResponse: { type: "string" },
  },
  required: ["hasTip", "type", "label", "note", "suggestedResponse"],
} as const;

export interface AnalyzeTranscriptInput {
  transcriptText: string;
  salesProfile: SalesProfile;
  trainingProfile: TrainingProfile;
  scenario: Scenario;
}

export async function analyzeTranscript({
  transcriptText,
  salesProfile,
  trainingProfile: storedProfile,
  scenario,
}: AnalyzeTranscriptInput): Promise<CoachTip | null> {
  const client = getOpenAIClient();
  const trainingProfile = normalizeTrainingProfile(storedProfile);
  const { offerLines, factLines } = buildCompanyContext(salesProfile, trainingProfile);

  const callType = trainingProfile.callType ?? "cold";
  const priorContext =
    callType === "cold"
      ? "cold (first contact, no prior context)"
      : `${callType} (${trainingProfile.priorContextDetail ?? "prior context not specified"})`;

  // Deliberately NOT included: the prospect's hidden situation. The coach
  // advises from what the caller has actually heard, so it can't hand the
  // caller information they haven't discovered yet.
  const userMessage = `This call:
- Scenario: ${scenario.name} (${scenario.difficulty})
- Prospect: ${scenario.prospectRole ?? "unspecified role"}${scenario.prospectIndustry ? ` in ${scenario.prospectIndustry}` : ""}
- Caller's objective: ${scenario.objective}
- Success condition: ${scenario.successCondition ?? "not specified"}
- Call type: ${priorContext}

Caller's offer:
${offerLines.map((l) => `- ${l}`).join("\n")}

Truthful facts about the caller's company (never go beyond this):
${factLines.map((l) => `- ${l}`).join("\n")}

Transcript so far (oldest first):
${transcriptText}`;

  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "coach_tip",
        strict: true,
        schema: coachTipSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return null;

  const parsed = JSON.parse(raw) as {
    hasTip: boolean;
    type: string;
    label: string;
    note: string;
    suggestedResponse: string;
  };

  if (!parsed.hasTip || parsed.type === "none") return null;

  return {
    type: parsed.type as CoachTip["type"],
    label: parsed.label,
    note: parsed.note,
    suggestedResponse: parsed.suggestedResponse,
  };
}
