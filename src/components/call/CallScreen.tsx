"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProspectAvatar } from "@/components/ui/ProspectAvatar";
import { CallVisual } from "@/components/call/CallVisual";
import { CoachPanel } from "@/components/call/CoachPanel";
import { useRealtimeCall } from "@/lib/realtime/useRealtimeCall";
import { CoachMode, CoachTip, ProspectIdentity, SalesProfile, Scenario, TranscriptEntry, TrainingProfile } from "@/lib/types";

export type CallEndReason = "completed" | "timeout";

interface CallScreenProps {
  salesProfile: SalesProfile;
  trainingProfile: TrainingProfile;
  scenario: Scenario;
  identity: ProspectIdentity;
  onEnd: (transcript: TranscriptEntry[], durationSeconds: number, callId: string, reason: CallEndReason) => void;
  onEntitlementExhausted: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  idle: "Preparing…",
  connecting: "Connecting…",
  connected: "Connected",
  ended: "Call ended",
  error: "Connection error",
};

function formatCallTimer(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const clock = `${mm}:${ss.toString().padStart(2, "0")}`;
  if (seconds <= 10) return `Call ending in ${seconds} second${seconds === 1 ? "" : "s"}`;
  if (seconds <= 30) return `${seconds} seconds remaining`;
  if (seconds <= 60) return `${clock} remaining`;
  return clock;
}

export function CallScreen({
  salesProfile,
  trainingProfile,
  scenario,
  identity,
  onEnd,
  onEntitlementExhausted,
}: CallScreenProps) {
  const {
    status,
    transcript,
    error,
    speaking,
    start,
    stop,
    userAmplitudeRef,
    prospectAmplitudeRef,
    callId,
    remainingSeconds,
    timedOut,
    entitlementExhausted,
  } = useRealtimeCall();
  const startedRef = useRef(false);
  const callStartRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  const [coachMode, setCoachMode] = useState<CoachMode>("training");
  const [coachTip, setCoachTip] = useState<CoachTip | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const lastCoachedIdRef = useRef<string | null>(null);
  const coachBusyRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    callStartRef.current = Date.now();
    start({ salesProfile, trainingProfile, scenario, identity });
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (coachMode === "exam") return;
    const last = transcript[transcript.length - 1];
    if (!last || !last.final || last.id === lastCoachedIdRef.current || coachBusyRef.current) return;
    lastCoachedIdRef.current = last.id;

    const analyze = async () => {
      if (!callId) return;
      coachBusyRef.current = true;
      setCoachLoading(true);
      try {
        const res = await fetch("/api/coach/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callId,
            transcript: transcript.filter((e) => e.final).slice(-20),
            salesProfile,
            trainingProfile,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { hasTip: boolean; tip: CoachTip | null };
        setCoachTip(data.hasTip ? data.tip : null);
      } catch {
        // Coaching is a non-critical enhancement — fail silently.
      } finally {
        coachBusyRef.current = false;
        setCoachLoading(false);
      }
    };

    void analyze();
  }, [transcript, coachMode, salesProfile, trainingProfile, callId]);

  useEffect(() => {
    if (!timedOut || endedRef.current || !callId) return;
    endedRef.current = true;
    const durationSeconds = Math.round((Date.now() - (callStartRef.current ?? Date.now())) / 1000);
    stop();
    onEnd(transcript, durationSeconds, callId, "timeout");
    // transcript/onEnd change every render as new deltas arrive — only re-run this when timedOut flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut, callId]);

  useEffect(() => {
    // Rare race: entitlement ran out between TrainingSetup's pre-check and this
    // mount actually reaching the server. No call was ever reserved here, so
    // there's nothing to finalize — just hand the paywall back to TrainingSetup.
    if (entitlementExhausted) onEntitlementExhausted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitlementExhausted]);

  function handleEndCall() {
    if (endedRef.current || !callId) return;
    endedRef.current = true;
    const durationSeconds = Math.round((Date.now() - (callStartRef.current ?? Date.now())) / 1000);
    stop();
    onEnd(transcript, durationSeconds, callId, "completed");
  }

  const dotClass =
    status === "connected"
      ? speaking
        ? "bg-emerald-500 animate-pulse"
        : "bg-emerald-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-amber-500 animate-pulse";

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-4xl flex-col px-6 py-6">
      <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ProspectAvatar identity={identity} size="sm" />
          <div>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {identity.fullName} <span className="font-normal text-zinc-500 dark:text-zinc-400">— {identity.title}, {identity.company}</span>
            </p>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {scenario.name} · {scenario.difficulty}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${dotClass}`} />
              <span className="text-zinc-500 dark:text-zinc-400">
                {STATUS_LABEL[status]}
                {status === "connected" && speaking ? " · listening…" : ""}
              </span>
              {remainingSeconds !== null && status === "connected" && (
                <span
                  className={`font-medium tabular-nums ${
                    remainingSeconds <= 30 ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  · {formatCallTimer(remainingSeconds)}
                </span>
              )}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={handleEndCall}>
          End Call
        </Button>
      </div>

      {error && (
        <div className="mb-4 shrink-0 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-4 sm:flex-row">
        <CallVisual
          userAmplitudeRef={userAmplitudeRef}
          prospectAmplitudeRef={prospectAmplitudeRef}
          identity={identity}
          status={status}
        />

        <div className="shrink-0 sm:self-start">
          <CoachPanel mode={coachMode} onModeChange={setCoachMode} tip={coachTip} loading={coachLoading} />
        </div>
      </div>
    </div>
  );
}
