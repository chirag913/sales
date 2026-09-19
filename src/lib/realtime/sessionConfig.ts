import { REALTIME_MODEL, REALTIME_TRANSCRIBE_MODEL } from "@/lib/ai/models";
import { VAD_CONFIG } from "@/lib/realtime/audioConfig";

// The function the prospect calls to hang up. The spoken goodbye and the
// call function arrive in the same model response; the client waits for the
// goodbye audio to finish playing before it actually tears the call down
// (see useRealtimeCall.ts), so speech and disconnect stay in sync.
export const END_CALL_TOOL_NAME = "end_call";

export const END_CALL_TOOL = {
  type: "function",
  name: END_CALL_TOOL_NAME,
  description:
    "Hang up the phone. Call this in the same turn as your brief goodbye when the call has reached a natural end: you've clearly said no, you have to go, an email was requested and settled, or you've agreed to a next step and are wrapping up. Do not call it in your first exchange, and never keep talking after deciding to use it.",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        enum: ["not_interested", "no_time", "send_email", "next_step_agreed", "caller_lost_me", "other"],
        description: "Why you are ending the call.",
      },
    },
    required: ["reason"],
  },
} as const;

export interface RealtimeSessionOptions {
  instructions: string;
  voice: string;
}

// Shape shared by the server route and the offline test harness.
export function buildRealtimeSessionConfig({ instructions, voice }: RealtimeSessionOptions) {
  return {
    type: "realtime",
    model: REALTIME_MODEL,
    instructions,
    audio: {
      input: {
        transcription: { model: REALTIME_TRANSCRIBE_MODEL },
        turn_detection: VAD_CONFIG,
      },
      output: { voice },
    },
    tools: [END_CALL_TOOL],
    tool_choice: "auto",
  };
}
