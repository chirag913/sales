import { getOpenAIClient } from "@/lib/ai/client";
import { TEXT_MODEL } from "@/lib/ai/models";
import { OBJECTION_TYPES } from "@/lib/ai/objectionTaxonomy";

const SYSTEM_PROMPT = `You are tagging which objection types a prospect raised during a cold call
transcript. Only use this fixed taxonomy — never invent a new label: ${OBJECTION_TYPES.join(", ")}.

Only tag an objection type if the prospect actually raised it in the transcript. If the prospect
raised no objections, return an empty list.`;

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    objectionTags: {
      type: "array",
      items: { type: "string", enum: OBJECTION_TYPES as unknown as string[] },
    },
  },
  required: ["objectionTags"],
} as const;

export async function tagObjections(transcriptText: string): Promise<string[]> {
  if (!transcriptText.trim()) return [];

  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Transcript (oldest first):\n${transcriptText}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "objection_tags",
        strict: true,
        schema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return [];

  const parsed = JSON.parse(raw) as { objectionTags: string[] };
  return parsed.objectionTags ?? [];
}
