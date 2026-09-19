import { getOpenAIClient } from "@/lib/ai/client";
import { TEXT_MODEL } from "@/lib/ai/models";
import { normalizeTrainingProfile } from "@/lib/profile/normalize";
import { clampScenarioToDifficulty, DIFFICULTY_PRESETS } from "@/lib/prospect/difficulty";
import { Scenario, TrainingProfile } from "@/lib/types";

const SYSTEM_PROMPT = `You generate realistic cold-call training scenarios: distinct, specific prospects a
caller can practice against before making real calls.

Given a training profile (market, what the caller sells = "offering", who they call =
"prospectIndustry", ICP titles, pain points, likely objections, sales objective, call type),
generate exactly 5 scenarios: one Easy, two Medium, one Hard, one Expert.

Each scenario is ONE specific prospect in a specific situation, not a personality label.
Every scenario needs:
- name: 2-4 words, e.g. "Busy Office Manager".
- description: one line about who this person is and their mindset.
- difficulty: Easy, Medium, Hard, or Expert.
- prospectRole: the prospect's real job title, at a company in prospectIndustry. Use the profile's
  ICP titles where they fit; every scenario must use a DIFFERENT role from the others when the
  ICP allows it. The name, description and prospectRole must describe the same person.
- prospectIndustry: what THIS prospect's company does. It must be the profile's prospectIndustry
  or a realistic segment of it (e.g. "dental practices" -> "orthodontic clinics"). It is NEVER the
  caller's offering: the prospect is a customer of that kind of business, not a provider of it.
- situation: 1-2 sentences on this prospect's actual business situation right now (size, how
  they operate, what is going on that the caller would have to discover).
- existingSolution: what they use or do today for the problem the offering addresses (a named
  kind of provider, an in-house process, a spreadsheet, nothing formal). Specific, not "some
  provider". Never invent a real company name.
- authority: decision_maker | shared_decision | influencer.
- urgency, budgetSensitivity, painSeverity: low | medium | high.
- objective: the CALLER's goal for this call as a short natural sentence a person would say out
  loud, never a label or snake_case. It may differ from the profile default (e.g. qualify first
  with a skeptical prospect). Example: "Get them to agree to a 15-minute demo call".
- successCondition: what the caller has to achieve for this call to count as a win, specific to
  this prospect and realistic for the difficulty.
- failureCondition: what would make this call a failure (e.g. "Prospect ends the call before the
  caller has learned anything about their current setup").
- whatToExpect: one concrete sentence previewing how they will come across on this call (pacing,
  tone, how much room they give). Must be consistent with the fields above and must not repeat
  the description.

Difficulty must change the actual underlying conditions, not just the wording:
${(Object.keys(DIFFICULTY_PRESETS) as (keyof typeof DIFFICULTY_PRESETS)[])
  .map((d) => `- ${d}: ${DIFFICULTY_PRESETS[d].generatorGuide}`)
  .join("\n")}
Medium, Hard and Expert prospects must have a real incumbent in existingSolution.

Rules:
- Base pains and objections on the profile's actual pain points and likely objections; do not
  invent unrelated ones.
- Never invent proof, clients, results, or credentials — scenarios describe the prospect only,
  never claims about the caller's company.
- Never describe behavior that requires the prospect to interrupt or talk over the caller.
- Respect the call type. cold: first contact, no prior context. cold_after_outreach: an email or
  message was sent (priorContextDetail) but no live conversation ever happened; the prospect is
  still meeting the caller live for the first time. warm: build on priorContextDetail; never
  invent first-contact confusion.`;

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
          prospectRole: { type: "string" },
          prospectIndustry: { type: "string" },
          situation: { type: "string" },
          existingSolution: { type: "string" },
          authority: { type: "string", enum: ["decision_maker", "shared_decision", "influencer"] },
          urgency: { type: "string", enum: ["low", "medium", "high"] },
          budgetSensitivity: { type: "string", enum: ["low", "medium", "high"] },
          painSeverity: { type: "string", enum: ["low", "medium", "high"] },
          successCondition: { type: "string" },
          failureCondition: { type: "string" },
        },
        required: [
          "name",
          "description",
          "difficulty",
          "objective",
          "whatToExpect",
          "prospectRole",
          "prospectIndustry",
          "situation",
          "existingSolution",
          "authority",
          "urgency",
          "budgetSensitivity",
          "painSeverity",
          "successCondition",
          "failureCondition",
        ],
      },
    },
  },
  required: ["scenarios"],
} as const;

export async function generateScenarios(storedProfile: TrainingProfile): Promise<Scenario[]> {
  const client = getOpenAIClient();
  const profile = normalizeTrainingProfile(storedProfile);

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
  const parsed = JSON.parse(raw) as { scenarios: Omit<Scenario, "id" | "identity">[] };
  const stamp = Date.now();
  return parsed.scenarios
    .filter((scenario) => scenario.prospectRole.trim().length > 0)
    .map((scenario, index) => ({
      id: `${stamp}-${index}`,
      ...clampScenarioToDifficulty({
        ...scenario,
        // The scenario's industry can only ever be a segment of the profile's target, so a
        // slip here falls back to the profile rather than to anything the caller sells.
        prospectIndustry: scenario.prospectIndustry.trim() || profile.prospectIndustry,
      }),
    }));
}
