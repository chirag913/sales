import WebSocket from "ws";
import { REALTIME_MODEL } from "@/lib/ai/models";
import { END_CALL_TOOL, END_CALL_TOOL_NAME } from "@/lib/realtime/sessionConfig";

// A text-mode realtime session with the SAME model, instructions and tools
// the app uses (audio replaced by text so scripted callers can be replayed).
// It exercises the prompt and the end_call tool for real; it does not
// exercise audio, VAD, the noise gate, transcription, or playback timing.

export interface TurnResult {
  text: string;
  endCall: { reason: string } | null;
}

export class ProspectSession {
  private ws: WebSocket;
  private waiters: ((event: Record<string, unknown>) => void)[] = [];
  private ready: Promise<void>;
  transcript: { role: "Caller" | "Prospect"; text: string }[] = [];
  ended = false;

  constructor(private instructions: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    this.ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${REALTIME_MODEL}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    this.ws.on("message", (raw) => {
      const event = JSON.parse(raw.toString()) as Record<string, unknown>;
      for (const waiter of [...this.waiters]) waiter(event);
    });
    this.ready = this.init();
  }

  private waitFor<T = Record<string, unknown>>(predicate: (event: Record<string, unknown>) => T | null, timeoutMs = 45_000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        reject(new Error("Timed out waiting for realtime event"));
      }, timeoutMs);
      const waiter = (event: Record<string, unknown>) => {
        if (event.type === "error") {
          clearTimeout(timer);
          this.waiters = this.waiters.filter((w) => w !== waiter);
          reject(new Error(`Realtime error: ${JSON.stringify(event.error)}`));
          return;
        }
        const value = predicate(event);
        if (value !== null) {
          clearTimeout(timer);
          this.waiters = this.waiters.filter((w) => w !== waiter);
          resolve(value);
        }
      };
      this.waiters.push(waiter);
    });
  }

  private send(event: Record<string, unknown>) {
    this.ws.send(JSON.stringify(event));
  }

  private async init() {
    await this.waitFor((e) => (e.type === "session.created" ? e : null));
    this.send({
      type: "session.update",
      session: {
        type: "realtime",
        instructions: this.instructions,
        // Audio output (with its transcript), the modality the app really uses:
        // the model is noticeably wordier and more assistant-like when asked
        // for plain text, which would make these replays unrepresentative.
        output_modalities: ["audio"],
        audio: { output: { voice: "cedar" } },
        tools: [END_CALL_TOOL],
        tool_choice: "auto",
      },
    });
    await this.waitFor((e) => (e.type === "session.updated" ? e : null));
  }

  private async respond(): Promise<TurnResult> {
    await this.ready;
    // The account has a tokens-per-minute cap on the realtime model. A rate-limited
    // response is retried on its own (the conversation so far is already in the
    // session) after the wait the API asks for, rather than restarting the run.
    let response: { status?: string; status_details?: { error?: { code?: string; message?: string } }; output?: Record<string, unknown>[] } | undefined;
    for (let attempt = 0; ; attempt++) {
      const done = this.waitFor((e) => (e.type === "response.done" ? e : null));
      this.send({ type: "response.create" });
      const event = await done;
      response = event.response as typeof response;
      if (response?.status !== "failed") break;
      const err = response?.status_details?.error;
      if (err?.code === "rate_limit_exceeded" && attempt < 8) {
        const wait = Number(/try again in ([\d.]+)s/i.exec(err.message ?? "")?.[1] ?? 3);
        await new Promise((resolve) => setTimeout(resolve, Math.ceil(wait * 1000) + 1500));
        continue;
      }
      // A failed response must not be mistaken for a prospect who simply said nothing.
      throw new Error(`Response failed: ${JSON.stringify(response?.status_details)}`);
    }
    const output = (response?.output ?? []) as {
      type: string;
      name?: string;
      arguments?: string;
      content?: { type?: string; text?: string; transcript?: string }[];
    }[];
    let text = "";
    let endCall: TurnResult["endCall"] = null;
    for (const item of output) {
      if (item.type === "message") text += (item.content ?? []).map((c) => c.text ?? c.transcript ?? "").join("");
      if (item.type === "function_call" && item.name === END_CALL_TOOL_NAME) {
        let reason = "other";
        try {
          reason = (JSON.parse(item.arguments ?? "{}") as { reason?: string }).reason ?? "other";
        } catch {
          // keep default
        }
        endCall = { reason };
      }
    }
    text = text.trim();
    if (text) this.transcript.push({ role: "Prospect", text });
    if (endCall) this.ended = true;
    return { text, endCall };
  }

  // The prospect answers the phone (what the app now triggers with response.create).
  async greet(): Promise<TurnResult> {
    return this.respond();
  }

  async say(callerText: string): Promise<TurnResult> {
    await this.ready;
    this.transcript.push({ role: "Caller", text: callerText });
    this.send({
      type: "conversation.item.create",
      item: { type: "message", role: "user", content: [{ type: "input_text", text: callerText }] },
    });
    return this.respond();
  }

  close() {
    this.ws.close();
  }

  transcriptText(): string {
    return this.transcript.map((t) => `${t.role}: ${t.text}`).join("\n");
  }
}
