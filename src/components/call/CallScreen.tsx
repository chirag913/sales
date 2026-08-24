"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CoachPanel } from "@/components/call/CoachPanel";
import { useRealtimeCall } from "@/lib/realtime/useRealtimeCall";
import { CoachMode, CoachTip, ProspectIdentity, SalesProfile, Scenario, TranscriptEntry, TrainingProfile } from "@/lib/types";

interface CallScreenProps {
  salesProfile: SalesProfile;
  trainingProfile: TrainingProfile;
  scenario: Scenario;
  identity: ProspectIdentity;
  onEnd: (transcript: TranscriptEntry[], durationSeconds: number) => void;
}

const STATUS_LABEL: Record<string, string> = {
  idle: "Preparing…",
  connecting: "Connecting…",
  connected: "Connected",
  ended: "Call ended",
  error: "Connection error",
};

export function CallScreen({ salesProfile, trainingProfile, scenario, identity, onEnd }: CallScreenProps) {
  const { status, transcript, error, speaking, start, stop } = useRealtimeCall();
  const startedRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const callStartRef = useRef(Date.now());

  const [coachMode, setCoachMode] = useState<CoachMode>("training");
  const [coachTip, setCoachTip] = useState<CoachTip | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const lastCoachedIdRef = useRef<string | null>(null);
  const coachBusyRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start({ salesProfile, trainingProfile, scenario, identity });
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    if (coachMode === "exam") return;
    const last = transcript[transcript.length - 1];
    if (!last || !last.final || last.id === lastCoachedIdRef.current || coachBusyRef.current) return;
    lastCoachedIdRef.current = last.id;

    const analyze = async () => {
      coachBusyRef.current = true;
      setCoachLoading(true);
      try {
        const res = await fetch("/api/coach/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
  }, [transcript, coachMode, salesProfile, trainingProfile]);

  function handleEndCall() {
    const durationSeconds = Math.round((Date.now() - callStartRef.current) / 1000);
    stop();
    onEnd(transcript, durationSeconds);
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
        <div>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {identity.fullName} <span className="font-normal text-zinc-500 dark:text-zinc-400">— {identity.title}, {identity.company}</span>
          </p>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {scenario.icon} {scenario.name} · {scenario.difficulty}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${dotClass}`} />
            <span className="text-zinc-500 dark:text-zinc-400">
              {STATUS_LABEL[status]}
              {status === "connected" && speaking ? " · listening…" : ""}
            </span>
          </p>
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
        <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto rounded-2xl border border-zinc-200/70 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          {transcript.length === 0 && status === "connected" && (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              The prospect will answer shortly — start talking whenever you&apos;re ready.
            </p>
          )}
          {transcript.map((entry) => (
            <div key={entry.id} className={`flex ${entry.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                  entry.role === "user"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide opacity-60">
                  {entry.role === "user" ? "You" : identity.firstName}
                </p>
                {entry.text}
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        <div className="shrink-0 sm:self-start">
          <CoachPanel mode={coachMode} onModeChange={setCoachMode} tip={coachTip} loading={coachLoading} />
        </div>
      </div>
    </div>
  );
}
