import { getOpenAIClient } from "@/lib/ai/client";
import { TEXT_MODEL } from "@/lib/ai/models";
import { Scenario, TrainingProfile } from "@/lib/types";

const SYSTEM_PROMPT = `You generate realistic cold-call training scenarios for practicing objection
handling and sales conversations.

Given a training profile (target market, service, ICP, pain points, likely objections, sales
objective), generate 4-6 distinct prospect scenarios worth practicing against, spanning a range
of difficulty.

Rules:
- Each scenario needs: a short evocative name (2-4 words, e.g. "Skeptical Office Manager"), a
  one-line description of the prospect's mindset/behavior, a difficulty of Easy/Medium/Hard/Expert,
  a recommended objective for that specific call, and a "what to expect" line.
- The description covers the prospect's general mindset/trait (who they are). The "what to expect"
  line is different: a short, concrete sentence about how they'll actually behave during THIS call
  — their pacing, tone, what they'll push back on, how much room they give you. For example, for a
  cautious-but-open persona: "Gives you room to explain, but wants reassurance before considering a
  change." Never repeat the description almost verbatim — it should add call-specific behavior the
  description doesn't already say.
- Write the objective as a short natural sentence a person would actually say out loud — never a
  label, slug, or snake_case phrase. This can differ from the profile's default objective when the
  scenario calls for it — e.g. a skeptical scenario might recommend qualifying the prospect rather
  than going straight for a meeting. For example: "Get them to agree to a 15-minute demo call" or
  "Find out what's stopping them from switching providers," NOT "book_demo" or "qualify prospect."
- Base scenarios on the profile's actual pain points and likely objections — don't invent
  unrelated objections.
- Cover a spread of difficulty: include at least one Easy scenario, one built around an
  existing-provider objection, and one Expert/nightmare scenario combining multiple objections
  and interruptions.
- Never invent proof, clients, results, or credentials — scenarios describe prospect behavior
  only, never claims about the seller's company.
- The training profile includes callType ("cold", "cold_after_outreach", or "warm") and, for the
  latter two, priorContextDetail describing what actually happened before. Keep every scenario
  consistent with that tier:
  - cold (the default): first-contact call, no prior context of any kind.
  - cold_after_outreach: an email/message was sent (priorContextDetail describes it) but no live
    conversation ever happened — scenarios should NOT invent first-contact confusion (the prospect
    may have seen the outreach), but also should NOT read as an already-warm relationship; the
    prospect is still meeting the caller live for the first time.
  - warm: build on the established prior context (priorContextDetail) — never invent
    first-contact confusion or a prospect who's never heard of the caller.`;

const scenariosSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    scenarios: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          difficulty: { type: "string", enum: ["Easy", "Medium", "Hard", "Expert"] },
          objective: { type: "string" },
          whatToExpect: { type: "string" },
        },
        required: ["name", "description", "difficulty", "objective", "whatToExpect"],
      },
    },
  },
  required: ["scenarios"],
} as const;

export async function generateScenarios(profile: TrainingProfile): Promise<Scenario[]> {
  const client = getOpenAIClient();

  const userMessage = `Training profile:\n${JSON.stringify(profile, null, 2)}`;

  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scenarios",
        strict: true,
        schema: scenariosSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty response from model");
  const parsed = JSON.parse(raw) as { scenarios: Omit<Scenario, "id">[] };
  return parsed.scenarios.map((scenario, index) => ({ id: `${Date.now()}-${index}`, ...scenario }));
}
