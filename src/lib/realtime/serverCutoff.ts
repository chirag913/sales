import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

// Server-side enforcement of the call length cap. The realtime connection
// itself has no maximum duration, so a modified client that ignores its own
// countdown would otherwise keep an expensive session alive. The server
// holds the provider call id (it brokers the WebRTC handshake, see
// /api/realtime/session) and can hang the call up itself.

const OPENAI_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

// Slack past the deadline so a legitimate client that ends itself on time
// never races the server cutoff.
export const CUTOFF_GRACE_MS = 8_000;

export async function hangupProviderCall(providerCallId: string): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return;
  try {
    // Idempotent for our purposes: an already-ended call just returns an error.
    await fetch(`${OPENAI_CALLS_URL}/${encodeURIComponent(providerCallId)}/hangup`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch (err) {
    console.error("serverCutoff: hangup request failed", err);
  }
}

// Hangs up every call of this user that is past its cap but still has a live
// provider session. Cheap and idempotent; called opportunistically from
// routes the app already hits (starting a call, checking entitlement) as a
// backstop for the scheduled cutoff in /api/realtime/session.
export async function reapExpiredCalls(userId: string, maxDurationSeconds: number): Promise<void> {
  try {
    const service = createServiceRoleClient();
    const cutoff = new Date(Date.now() - maxDurationSeconds * 1000 - CUTOFF_GRACE_MS).toISOString();
    const { data } = await service
      .from("call_sessions")
      .select("id, provider_call_id")
      .eq("user_id", userId)
      .in("status", ["started", "timeout"])
      .is("provider_hung_up_at", null)
      .not("provider_call_id", "is", null)
      .lt("started_at", cutoff)
      .limit(10);
    for (const row of data ?? []) {
      await hangupProviderCall(row.provider_call_id as string);
      await service.from("call_sessions").update({ provider_hung_up_at: new Date().toISOString() }).eq("id", row.id);
    }
  } catch (err) {
    console.error("serverCutoff: reap failed", err);
  }
}

export async function markProviderHungUp(callId: string): Promise<void> {
  try {
    await createServiceRoleClient()
      .from("call_sessions")
      .update({ provider_hung_up_at: new Date().toISOString() })
      .eq("id", callId);
  } catch (err) {
    console.error("serverCutoff: could not record hangup", err);
  }
}
