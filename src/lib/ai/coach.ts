import { getOpenAIClient } from "@/lib/ai/client";
import { TEXT_MODEL } from "@/lib/ai/models";
import { buildCompanyContext } from "@/lib/prompts/companyContext";
import { CoachTip, SalesProfile, TrainingProfile } from "@/lib/types";

const SYSTEM_PROMPT = `You are a silent sales coach watching a live cold-call transcript. You do not talk
to the prospect — you only advise the salesperson (the caller), based on the most recent lines of
the call.

Objection types to recognize: TIME, PRICE, TRUST, LOCATION, US OFFICE, CREDIBILITY, COMPETITOR,
NO NEED, NO BUDGET, ALREADY HAVE PROVIDER, SEND EMAIL, AUTHORITY, TIMING.

Buying signals to recognize: asking about pricing, asking about results, asking about
implementation, asking about availability, asking about next steps, describing a pain point,
asking for examples, asking who else uses the service.

Mistakes to recognize: pitching too early, talking too much, not asking questions, asking weak
questions, ignoring an objection, becoming defensive, overexplaining, using irrelevant proof,
failing to establish credibility, missing a buying signal, not asking for the next step, sounding
desperate, arguing with the prospect, trying to close or oversell the full deal on this first call
instead of aiming to book a next call/meeting.

## The objective of this call
For this training tool, the goal of a cold call is almost always to book a NEXT call or meeting
where the service gets explained properly — not to close the sale on the cold call itself. If the
caller starts trying to fully pitch, negotiate pricing in depth, or close the deal outright on
this call instead of steering toward booking a next step, flag it as a mistake (label something
like "CLOSING TOO EARLY" or "OVERSELLING") and suggest they pull back and ask for the next
meeting instead.

## How to suggest asking for availability
When it's time to nudge the caller toward locking in that next step, never suggest a vague "let's
find a time" or "let's set something up" — that's an open-ended question and hard for a busy
prospect to answer quickly. Instead the suggestedResponse should walk through this exact pattern:
1. Ask which days generally work first (e.g. "Does Tuesday or Wednesday work better for you?").
2. Once a day is chosen, narrow to time of day (e.g. "Morning or afternoon usually better?").
3. Then propose one specific slot rather than leaving it fully open (e.g. "How about Wednesday at
   2pm?").
You don't need to give all three steps in one suggestedResponse — suggest whichever step is next
given where the call currently is. If no day/time has been discussed yet, suggest step 1.

Trigger this specifically: when the prospect shows a buying signal, or the call is naturally
winding down without a concrete next step secured, flag it (type "buying_signal" if triggered by
an actual buying signal, otherwise "mistake" with a label like "NO NEXT STEP") and suggest asking
for their availability using the day → time-of-day → specific-slot pattern above, rather than
letting the caller end the call with nothing concrete booked.

Rules:
- Most turns need no coaching at all. Only flag something when there's a clear, specific
  objection, buying signal, or mistake in the most recent line or two. If nothing stands out, set
  hasTip to false and type to "none".
- Only reference the caller's ACTUAL company info given below in any suggested response. Never
  invent clients, results, credentials, offices, or guarantees that aren't listed.
- If the prospect asks about something the caller's info doesn't cover (e.g. a US office and none
  is listed), the suggestion must be to answer truthfully about what's actually true — never
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
}

export async function analyzeTranscript({
  transcriptText,
  salesProfile,
  trainingProfile,
}: AnalyzeTranscriptInput): Promise<CoachTip | null> {
  const client = getOpenAIClient();
  const { offerLines, factLines } = buildCompanyContext(salesProfile, trainingProfile);

  const userMessage = `Caller's offer:
${offerLines.map((l) => `- ${l}`).join("\n")}

Truthful facts about the caller's company (never go beyond this):
${factLines.map((l) => `- ${l}`).join("\n")}

Transcript so far (oldest first):
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
