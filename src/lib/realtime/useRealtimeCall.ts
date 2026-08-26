"use client";

import { useCallback, useRef, useState } from "react";
import { ProspectIdentity, SalesProfile, Scenario, TranscriptEntry, TrainingProfile } from "@/lib/types";

export type { TranscriptEntry };

export type CallStatus = "idle" | "connecting" | "connected" | "ended" | "error";

interface StartArgs {
  salesProfile: SalesProfile;
  trainingProfile: TrainingProfile;
  scenario: Scenario;
  identity: ProspectIdentity;
}

interface RealtimeServerEvent {
  type: string;
  item_id?: string;
  response_id?: string;
  transcript?: string;
  delta?: string;
  error?: { message?: string };
  [key: string]: unknown;
}

function upsertUserEntry(transcript: TranscriptEntry[], id: string, text: string): TranscriptEntry[] {
  const idx = transcript.findIndex((e) => e.id === id);
  if (idx === -1) return [...transcript, { id, role: "user", text, final: true, timestamp: Date.now() }];
  const next = [...transcript];
  next[idx] = { ...next[idx], text, final: true };
  return next;
}

function appendProspectDelta(transcript: TranscriptEntry[], id: string, delta: string): TranscriptEntry[] {
  const idx = transcript.findIndex((e) => e.id === id);
  if (idx === -1) return [...transcript, { id, role: "prospect", text: delta, final: false, timestamp: Date.now() }];
  const next = [...transcript];
  next[idx] = { ...next[idx], text: next[idx].text + delta };
  return next;
}

function finalizeEntry(transcript: TranscriptEntry[], id: string): TranscriptEntry[] {
  return transcript.map((e) => (e.id === id ? { ...e, final: true } : e));
}

export function useRealtimeCall() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [entitlementExhausted, setEntitlementExhausted] = useState(false);

  const deadlineAtRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  const userDataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const prospectAnalyserRef = useRef<AnalyserNode | null>(null);
  const prospectDataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const userAmplitudeRef = useRef(0);
  const prospectAmplitudeRef = useRef(0);
  const amplitudeFrameRef = useRef<number | null>(null);

  const startAmplitudeLoop = useCallback(() => {
    const tick = () => {
      const userAnalyser = userAnalyserRef.current;
      const userData = userDataArrayRef.current;
      if (userAnalyser && userData) {
        userAnalyser.getByteFrequencyData(userData);
        let sum = 0;
        for (let i = 0; i < userData.length; i++) sum += userData[i];
        userAmplitudeRef.current = sum / userData.length / 255;
      } else {
        userAmplitudeRef.current = 0;
      }

      const prospectAnalyser = prospectAnalyserRef.current;
      const prospectData = prospectDataArrayRef.current;
      if (prospectAnalyser && prospectData) {
        prospectAnalyser.getByteFrequencyData(prospectData);
        let sum = 0;
        for (let i = 0; i < prospectData.length; i++) sum += prospectData[i];
        prospectAmplitudeRef.current = sum / prospectData.length / 255;
      } else {
        prospectAmplitudeRef.current = 0;
      }

      amplitudeFrameRef.current = requestAnimationFrame(tick);
    };
    amplitudeFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const cleanup = useCallback(() => {
    if (amplitudeFrameRef.current !== null) {
      cancelAnimationFrame(amplitudeFrameRef.current);
      amplitudeFrameRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    dcRef.current?.close();
    dcRef.current = null;
    pcRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    userAnalyserRef.current = null;
    userDataArrayRef.current = null;
    prospectAnalyserRef.current = null;
    prospectDataArrayRef.current = null;
    userAmplitudeRef.current = 0;
    prospectAmplitudeRef.current = 0;
  }, []);

  const startCountdown = useCallback(
    (deadlineIso: string) => {
      const deadline = new Date(deadlineIso).getTime();
      deadlineAtRef.current = deadline;

      const tick = () => {
        const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        setRemainingSeconds(remaining);
        if (remaining <= 0) {
          if (countdownIntervalRef.current !== null) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setTimedOut(true);
          cleanup();
          setStatus((prev) => (prev === "idle" ? prev : "ended"));
          setSpeaking(false);
        }
      };

      tick();
      countdownIntervalRef.current = setInterval(tick, 1000);
    },
    [cleanup]
  );

  const start = useCallback(
    async ({ salesProfile, trainingProfile, scenario, identity }: StartArgs) => {
      setError(null);
      setStatus("connecting");
      setTranscript([]);
      setCallId(null);
      setRemainingSeconds(null);
      setTimedOut(false);
      setEntitlementExhausted(false);

      try {
        const tokenRes = await fetch("/api/realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ salesProfile, trainingProfile, scenario, identity }),
        });
        if (!tokenRes.ok) {
          const body = await tokenRes.json().catch(() => null);
          if (tokenRes.status === 403 && body?.error === "entitlement_required") {
            setEntitlementExhausted(true);
            setStatus("error");
            return;
          }
          throw new Error(body?.error ?? "Failed to start call session.");
        }
        const {
          value: ephemeralKey,
          callId: newCallId,
          deadlineAt,
        } = (await tokenRes.json()) as { value: string; callId: string; deadlineAt: string };
        setCallId(newCallId);
        startCountdown(deadlineAt);

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        audioContext.resume().catch(() => {});
        startAmplitudeLoop();

        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioElRef.current = audioEl;
        pc.ontrack = (e) => {
          audioEl.srcObject = e.streams[0];
          const prospectSource = audioContext.createMediaStreamSource(e.streams[0]);
          const prospectAnalyser = audioContext.createAnalyser();
          prospectAnalyser.fftSize = 256;
          prospectSource.connect(prospectAnalyser);
          prospectAnalyserRef.current = prospectAnalyser;
          prospectDataArrayRef.current = new Uint8Array(prospectAnalyser.frequencyBinCount);
        };

        // Bare `audio: true` leaves noise suppression up to browser/OS defaults,
        // which aren't consistent — steady background noise (fan hum, AC) was
        // reaching the VAD and transcription model unfiltered, causing false
        // "speech started" triggers and garbled/hallucinated transcript text.
        // Explicitly requesting these constraints suppresses it at the source.
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = mediaStream;
        mediaStream.getTracks().forEach((track) => pc.addTrack(track, mediaStream));

        const userSource = audioContext.createMediaStreamSource(mediaStream);
        const userAnalyser = audioContext.createAnalyser();
        userAnalyser.fftSize = 256;
        userSource.connect(userAnalyser);
        userAnalyserRef.current = userAnalyser;
        userDataArrayRef.current = new Uint8Array(userAnalyser.frequencyBinCount);

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;

        dc.addEventListener("open", () => setStatus("connected"));

        dc.addEventListener("message", (e) => {
          let event: RealtimeServerEvent;
          try {
            event = JSON.parse(e.data);
          } catch {
            console.warn("Failed to parse realtime event", e.data);
            return;
          }
          console.debug("[realtime event]", event.type, event);

          switch (event.type) {
            case "input_audio_buffer.speech_started":
              setSpeaking(true);
              break;
            case "input_audio_buffer.speech_stopped":
              setSpeaking(false);
              break;
            case "conversation.item.input_audio_transcription.completed": {
              const id = event.item_id;
              if (id && typeof event.transcript === "string") {
                setTranscript((prev) => upsertUserEntry(prev, id, event.transcript as string));
              }
              break;
            }
            case "response.output_audio_transcript.delta": {
              const id = event.item_id ?? event.response_id;
              if (id && typeof event.delta === "string") {
                setTranscript((prev) => appendProspectDelta(prev, id, event.delta as string));
              }
              break;
            }
            case "response.output_audio_transcript.done": {
              const id = event.item_id ?? event.response_id;
              if (id) setTranscript((prev) => finalizeEntry(prev, id));
              break;
            }
            case "error":
              console.error("Realtime API error event", event);
              setError(event.error?.message ?? "The prospect connection reported an error.");
              break;
            default:
              break;
          }
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralKey}`,
            "Content-Type": "application/sdp",
          },
        });

        if (!sdpRes.ok) {
          throw new Error("Failed to connect to the realtime call.");
        }

        const answerSdp = await sdpRes.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (err) {
        // Note: if this failure happens after mark_call_started already ran
        // server-side (WebRTC negotiation failing post-token-issuance), the
        // entitlement stays consumed and the call_sessions row stays
        // 'started' — the stale-call sweep in get_entitlement_status()
        // reconciles it to 'timeout' later. This is a rare edge case and a
        // bookkeeping-only consequence, not an entitlement/security issue.
        console.error("Failed to start realtime call", err);
        setError(err instanceof Error ? err.message : "Something went wrong starting the call.");
        setStatus("error");
        cleanup();
      }
    },
    [cleanup, startAmplitudeLoop, startCountdown]
  );

  const stop = useCallback(() => {
    cleanup();
    setStatus((prev) => (prev === "idle" ? prev : "ended"));
    setSpeaking(false);
  }, [cleanup]);

  return {
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
  };
}
