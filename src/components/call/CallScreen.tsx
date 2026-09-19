"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ProspectAvatar } from "@/components/ui/ProspectAvatar";
import { CallVisual } from "@/components/call/CallVisual";
import { CoachPanel } from "@/components/call/CoachPanel";
import { useRealtimeCall } from "@/lib/realtime/useRealtimeCall";
import { scorableTranscript } from "@/lib/transcript";
import { CoachMode, CoachTip, ProspectIdentity, SalesProfile, Scenario, TranscriptEntry, TrainingProfile } from "@/lib/types";

export type CallEndReason = "completed" | "timeout";

export interface CallEndInfo {
  // How the call session is finalized in the database.
  reason: CallEndReason;
  // Who actually ended it. The scorer uses this: a prospect hanging up is
  // treated very differently from the caller running out the clock.
  endedBy: "caller" | "prospect" | "timeout";
  // The prospect's stated reason when it hung up (end_call tool).
  prospectEndReason?: string;
}

interface CallScreenProps {
  salesProfile: SalesProfile;
  trainingProfile: TrainingProfile;
  scenario: Scenario;
  identity: ProspectIdentity;
  onEnd: (transcript: TranscriptEntry[], durationSeconds: number, callId: string, info: CallEndInfo) => void;
  onEntitlementExhausted: () => void;
  // Leave the call screen after a failure to connect (e.g. microphone blocked).
  onCancel: () => void;
}

// Coaching is advisory and costs a model call each time, so it is throttled:
// at most one analysis per interval, always on the latest finished
// transcript, and never twice for the same transcript state.
const COACH_MIN_INTERVAL_MS = 7000;

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
  onCancel,
}: CallScreenProps) {
  const {
    status,
    transcript,
    error,
    speaking,
    start,
    stop,
    endCall,
    userAmplitudeRef,
    prospectAmplitudeRef,
    callId,
    remainingSeconds,
    timedOut,
    entitlementExhausted,
    prospectEnded,
  } = useRealtimeCall();
  const startedRef = useRef(false);
  const callStartRef = useRef<number | null>(null);
  const endedRef = useRef(false);

  const [coachMode, setCoachMode] = useState<CoachMode>("training");
  const [coachTip, setCoachTip] = useState<CoachTip | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const transcriptRef = useRef(transcript);
  const lastCoachedKeyRef = useRef<string | null>(null);
  const scheduledKeyRef = useRef<string | null>(null);
  const lastCoachAtRef = useRef(0);
  const coachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coachBusyRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    callStartRef.current = Date.now();
    start({ trainingProfile, scenario, identity });
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const runCoach = useCallback(async () => {
    coachTimerRef.current = null;
    const finished = scorableTranscript(transcriptRef.current);
    const last = finished[finished.length - 1];
    if (!last || !callId || coachBusyRef.current) return;
    const key = `${last.id}:${last.text.length}`;
    if (key === lastCoachedKeyRef.current) return;
    lastCoachedKeyRef.current = key;
    lastCoachAtRef.current = Date.now();
    coachBusyRef.current = true;
    setCoachLoading(true);
    try {
      const res = await fetch("/api/coach/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId,
          transcript: finished.slice(-20),
          salesProfile,
          trainingProfile,
          scenario,
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
  }, [callId, salesProfile, trainingProfile, scenario]);

  useEffect(() => {
    if (coachMode === "exam" || !callId) return;
    const finished = scorableTranscript(transcript);
    const last = finished[finished.length - 1];
    if (!last) return;
    const key = `${last.id}:${last.text.length}`;
    // Already analysed, or already scheduled for this exact transcript state.
    if (key === lastCoachedKeyRef.current || key === scheduledKeyRef.current) return;
    scheduledKeyRef.current = key;
    if (coachTimerRef.current !== null) clearTimeout(coachTimerRef.current);
    const wait = Math.max(0, COACH_MIN_INTERVAL_MS - (Date.now() - lastCoachAtRef.current));
    coachTimerRef.current = setTimeout(() => void runCoach(), wait);
  }, [transcript, coachMode, callId, runCoach]);

  useEffect(
    () => () => {
      if (coachTimerRef.current !== null) clearTimeout(coachTimerRef.current);
    },
    []
  );

  // The single place a call ends, whoever ends it: the caller's End Call
  // button, the time limit, or the prospect hanging up. endCall() lets the
  // caller's last words finish transcribing before tearing down, and hands
  // back the settled transcript (not a snapshot captured by an earlier render).
  const finishCall = useCallback(
    async (info: CallEndInfo) => {
      if (endedRef.current || !callId) return;
      endedRef.current = true;
      if (coachTimerRef.current !== null) clearTimeout(coachTimerRef.current);
      const durationSeconds = Math.round((Date.now() - (callStartRef.current ?? Date.now())) / 1000);
      const finalTranscript = await endCall();
      onEnd(finalTranscript, durationSeconds, callId, info);
    },
    [callId, endCall, onEnd]
  );

  useEffect(() => {
    if (timedOut) void finishCall({ reason: "timeout", endedBy: "timeout" });
    // Only re-run when the flag flips; finishCall changes identity as renders happen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut, callId]);

  useEffect(() => {
    if (prospectEnded) void finishCall({ reason: "completed", endedBy: "prospect", prospectEndReason: prospectEnded.reason });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectEnded, callId]);

  useEffect(() => {
    // Rare race: entitlement ran out between TrainingSetup's pre-check and this
    // mount actually reaching the server. No call was ever reserved here, so
    // there's nothing to finalize — just hand the paywall back to TrainingSetup.
    if (entitlementExhausted) onEntitlementExhausted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entitlementExhausted]);

  function handleEndCall() {
    void finishCall({ reason: "completed", endedBy: "caller" });
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
        {status === "error" ? (
          <Button variant="secondary" onClick={onCancel}>
            Back
          </Button>
        ) : (
          <Button variant="secondary" onClick={handleEndCall} disabled={!callId}>
            End Call
          </Button>
        )}
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
