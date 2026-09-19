import { getOpenAIClient } from "@/lib/ai/client";
import { TEXT_MODEL } from "@/lib/ai/models";

// LLM judge for the qualities a regex can't decide (did the prospect
// soften? was interest earned?). Every live test ALSO has hard deterministic
// checks; the judge only answers a narrow yes/no question with evidence.

export interface Verdict {
  pass: boolean;
  reason: string;
}

export async function judge(question: string, transcript: string, context = ""): Promise<Verdict> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: TEXT_MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You evaluate a simulated sales-call transcript. Answer ONLY the question asked, strictly from the transcript. Be strict: if the evidence is ambiguous, answer false. Reply as JSON.",
      },
      { role: "user", content: `${context ? `Context:\n${context}\n\n` : ""}Transcript:\n${transcript}\n\nQuestion: ${question}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "verdict",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: { pass: { type: "boolean" }, reason: { type: "string" } },
          required: ["pass", "reason"],
        },
      },
    },
  });
  return JSON.parse(response.choices[0]?.message?.content ?? '{"pass":false,"reason":"empty"}') as Verdict;
}
