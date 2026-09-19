"use client";

import { useCallback, useRef, useState } from "react";
import { MIC_CONSTRAINTS, NOISE_GATE_CONFIG } from "@/lib/realtime/audioConfig";
import { END_CALL_TOOL_NAME } from "@/lib/realtime/sessionConfig";
import { ProspectIdentity, Scenario, TranscriptEntry, TrainingProfile } from "@/lib/types";

export type { TranscriptEntry };

export type CallStatus = "idle" | "connecting" | "connected" | "ended" | "error";

interface StartArgs {
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

interface ResponseOutputItem {
  id?: string;
  type?: string;
  status?: string;
  name?: string;
  call_id?: string;
  arguments?: string;
}

export interface ProspectEnd {
  reason: string;
}

// Transcript ordering: a caller's turn gets a placeholder entry the moment the
// server commits their audio (input_audio_buffer.committed), which is before
// the prospect's reply starts. Their transcription arrives later and only
// fills in the text, so the entry keeps its place instead of being appended
// after the prospect's reply (which is what happened when the entry was first
// created by the transcription event).
function upsertUserEntry(transcript: TranscriptEntry[], id: string, text: string | null): TranscriptEntry[] {
  const idx = transcript.findIndex((e) => e.id === id);
  const finalText = text ?? "";
  if (idx === -1) return [...transcript, { id, role: "user", text: finalText, final: text !== null, timestamp: Date.now() }];
  const next = [...transcript];
  next[idx] = { ...next[idx], text: finalText, final: true };
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

// The caller cut this reply off (or the call ended mid-reply): keep it for
// display, but flag it so it is never scored as something the caller heard.
function markInterrupted(transcript: TranscriptEntry[], id: string): TranscriptEntry[] {
  return transcript.map((e) => (e.id === id ? { ...e, final: true, interrupted: true } : e));
}

// How long endCall() waits for the caller's last words to be transcribed
// before giving up. Not a fixed delay: it resolves as soon as no speech is in
// flight and no transcription is pending; this is only the ceiling.
const SETTLE_MAX_MS = 3500;
// If the goodbye audio's "stopped" event never arrives, hang up this long
// after the model finished generating the goodbye.
const PROSPECT_END_FALLBACK_MS = 5000;
// If the realtime session never reports ready, send the greeting anyway.
const GREETING_FALLBACK_MS = 3000;
// If the connection hasn't opened this long after the handshake, stop ringing
// and say so instead of leaving the caller on a call that will never connect.
const CONNECT_TIMEOUT_MS = 20_000;

// Ring tone during "connecting" and disconnect tone on hangup — both
// synthesized via Web Audio oscillators (same approach this file already
// uses for amplitude analysis) rather than sourced audio files. That
// sidesteps any licensing question around reproducing a real telco's tone,
// and a single generic pitch beeped twice ("ring-ring... pause...") reads
// as "phone ringing" universally without imitating one country's specific
// pattern (e.g. not the US 440+480Hz dual-frequency ringback) — this app's
// audience spans US/UK/Canada/Australia.
const RING_TONE_FREQ_HZ = 480;
const RING_BEEP_DURATION_S = 0.15;
const RING_BEEP_GAP_S = 0.15;
const RING_CYCLE_S = 1.5;

// Perceived pickup (audible AI voice + status flipping to "connected") is
// gated on whichever is later: this minimum, or the real connection
// actually being ready — see triggerPickup and the dc "open" handler in
// start(). 2s fits two full ring-ring bursts (RING_CYCLE_S below) and lands
// in the trailing silence rather than cutting a beep off mid-play.
const RING_MIN_DURATION_MS = 2000;

// Disconnect tone on hangup — two short descending beeps, which reads as
// "call ended" without imitating any specific carrier's tone.
const DISCONNECT_TONE_FREQ_HIGH_HZ = 420;
const DISCONNECT_TONE_FREQ_LOW_HZ = 300;
const DISCONNECT_BEEP_DURATION_S = 0.16;
const DISCONNECT_BEEP_GAP_S = 0.08;
// cleanup() waits this long after scheduling the disconnect tone before
// actually tearing down (closing the AudioContext would cut the tone off
// mid-play) — long enough for the ~0.4s of beeps plus a little trailing air.
const DISCONNECT_TEARDOWN_DELAY_MS = 700;

// Short linear ramps in/out rather than an instant on/off step, so each
// beep starts and stops cleanly instead of producing an audible click.
function scheduleBeep(audioContext: AudioContext, destination: AudioNode, freq: number, startTime: number, duration: number): void {
  const oscillator = audioContext.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = freq;

  const envelope = audioContext.createGain();
  const attack = 0.008;
  const release = Math.min(0.03, duration / 3);
  envelope.gain.setValueAtTime(0, startTime);
  envelope.gain.linearRampToValueAtTime(1, startTime + attack);
  envelope.gain.setValueAtTime(1, Math.max(startTime + attack, startTime + duration - release));
  envelope.gain.linearRampToValueAtTime(0, startTime + duration);

  oscillator.connect(envelope);
  envelope.connect(destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

// A suspended AudioContext processes NOTHING — every node in its graph is
// frozen, so the mic pipeline (analyser, noise gate, MediaStreamDestination
// feeding the peer connection) would silently carry no audio at all even
// though the raw getUserMedia() track itself is live (which is why the
// browser's own mic-in-use indicator can show activity while literally
// nothing reaches OpenAI, or moves the "You" bars). The previous fire-and-
// forget `resume().catch(() => {})` swallowed this outcome with zero
// logging — exactly the kind of failure that looks like "no errors at all".
// Called at two points in start() (right after creation, and again once
// getUserMedia() has actually granted mic access, which is itself a strong
// user-activation signal some browsers honor even when the initial
// creation — inside a useEffect, not synchronously inside the button
// click — didn't).
async function ensureAudioContextRunning(audioContext: AudioContext, attemptLabel: string): Promise<void> {
  const stateBefore: string = audioContext.state;
  if (stateBefore === "running") return;
  if (stateBefore === "closed") {
    // Expected once, harmlessly, in dev mode: React StrictMode's
    // mount→cleanup→remount dance can close this exact AudioContext while
    // start()'s own async chain is still using it (see the "closed"
    // recovery in start() below, which recreates a fresh context when this
    // happens) — not worth an alarming resume() attempt/log for a context
    // we're about to replace anyway.
    return;
  }
  try {
    await audioContext.resume();
  } catch (err) {
    console.error(`[realtime audio] resume() threw (${attemptLabel})`, err);
  }
  const stateAfter: string = audioContext.state;
  if (stateAfter !== "running") {
    console.error(
      `[realtime audio] AudioContext still "${stateAfter}" after resume() (${attemptLabel}) — mic audio will not reach the call until this becomes "running".`
    );
  }
}

function playDisconnectTone(audioContext: AudioContext): void {
  const t0 = audioContext.currentTime;
  scheduleBeep(audioContext, audioContext.destination, DISCONNECT_TONE_FREQ_HIGH_HZ, t0, DISCONNECT_BEEP_DURATION_S);
  scheduleBeep(
    audioContext,
    audioContext.destination,
    DISCONNECT_TONE_FREQ_LOW_HZ,
    t0 + DISCONNECT_BEEP_DURATION_S + DISCONNECT_BEEP_GAP_S,
    DISCONNECT_BEEP_DURATION_S
  );
}

// Client-side noise gate: see NOISE_GATE_CONFIG in audioConfig.ts for what
// the three values mean and why they are unvalidated for call-centre floors.
// The gate's open/close decision is driven by an RMS reading of time-domain
// samples (not the frequency-bin average userAmplitudeRef uses for the "You"
// bars — that average is a poor loudness proxy and once kept the gate shut
// for real speech, sending total silence to OpenAI with no error anywhere).

export function useRealtimeCall() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [entitlementExhausted, setEntitlementExhausted] = useState(false);
  const [prospectEnded, setProspectEnded] = useState<ProspectEnd | null>(null);

  // The transcript lives in a ref as well as state so end-of-call code reads
  // the latest entries, not the snapshot captured by whichever render
  // scheduled it.
  const transcriptRef = useRef<TranscriptEntry[]>([]);

  // Realtime event bookkeeping (see the message handler in start()).
  const sessionReadyRef = useRef(false);
  const greetingSentRef = useRef(false);
  const greetingFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callerSpokeRef = useRef(false);
  const userSpeakingRef = useRef(false);
  const awaitingCommitRef = useRef(false);
  const pendingUserItemsRef = useRef<Set<string>>(new Set());
  const settleWaitersRef = useRef<Set<() => void>>(new Set());
  const endingRef = useRef(false);
  const outputAudioActiveRef = useRef(false);
  // Whether a model response is in flight. response.cancel with nothing to
  // cancel makes the API send an error event, so it is only sent when true.
  const responseActiveRef = useRef(false);
  const prospectEndPendingRef = useRef<ProspectEnd | null>(null);
  // When end_call arrives WITHOUT a spoken goodbye (observed with the live
  // model: a function-only response), the client asks for one closing line
  // and must not disconnect on the audio-stopped event of some EARLIER audio.
  const closingLineRequestedRef = useRef(false);
  const closingLineStartedRef = useRef(false);
  const prospectEndFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Client-side noise gate: mutes the mic track sent to OpenAI whenever
  // amplitude is below the ambient-noise floor, so steady background noise
  // (fan hum, AC) never reaches the realtime API's VAD at all — regardless
  // of how well (or not) the browser/OS's own noiseSuppression is actually
  // working on a given device.
  const noiseGateRef = useRef<GainNode | null>(null);
  const noiseGateOpenUntilRef = useRef(0);
  // Time-domain buffer for the gate's own RMS reading — separate from
  // userDataArrayRef (frequency-domain, drives the "You" amplitude bars UI)
  // so fixing the gate's metric can't change how those bars already look.
  const noiseGateDataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Ring tone + perceived-pickup gating (see constants above).
  const ringGainRef = useRef<GainNode | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ringStartTimeRef = useRef(0);
  const pickupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickupTriggeredRef = useRef(false);
  // Whether this call ever actually reached "connected" — cleanup() only
  // plays the disconnect tone for a call that was picked up, not one
  // cancelled mid-ring or one that failed to connect at all.
  const wasConnectedRef = useRef(false);
  // Guards cleanup() against running twice for the same call (e.g. stop()
  // called from both the explicit End Call handler and the mount-effect's
  // unmount cleanup) — without this, a second call could close resources
  // the first call's disconnect-tone delay is still relying on.
  const cleanupStartedRef = useRef(false);

  const updateTranscript = useCallback((fn: (prev: TranscriptEntry[]) => TranscriptEntry[]) => {
    transcriptRef.current = fn(transcriptRef.current);
    setTranscript(transcriptRef.current);
  }, []);

  const sendEvent = useCallback((event: Record<string, unknown>): boolean => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") return false;
    dc.send(JSON.stringify(event));
    return true;
  }, []);

  const notifySettle = useCallback(() => {
    for (const waiter of [...settleWaitersRef.current]) waiter();
  }, []);

  // The prospect answers the phone first. Sent exactly once, and only when
  // BOTH the call has been picked up (audio unmuted after the ring) and the
  // realtime session has reported ready — otherwise the greeting would play
  // into a muted element during the ring, or be sent to a session that
  // hasn't loaded its instructions yet.
  const maybeSendGreeting = useCallback(() => {
    if (greetingSentRef.current || !pickupTriggeredRef.current || !sessionReadyRef.current) return;
    if (sendEvent({ type: "response.create" })) greetingSentRef.current = true;
  }, [sendEvent]);

  const startAmplitudeLoop = useCallback(() => {
    const tick = () => {
      const userAnalyser = userAnalyserRef.current;
      const userData = userDataArrayRef.current;
      if (userAnalyser && userData) {
        userAnalyser.getByteFrequencyData(userData);
        let sum = 0;
        for (let i = 0; i < userData.length; i++) sum += userData[i];
        const amplitude = sum / userData.length / 255;
        userAmplitudeRef.current = amplitude;

        const gate = noiseGateRef.current;
        const gateData = noiseGateDataArrayRef.current;
        if (gate && gateData) {
          userAnalyser.getByteTimeDomainData(gateData);
          let sumSquares = 0;
          for (let i = 0; i < gateData.length; i++) {
            const normalized = (gateData[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / gateData.length);

          const now = performance.now();
          if (rms > NOISE_GATE_CONFIG.openThreshold) {
            gate.gain.value = 1;
            noiseGateOpenUntilRef.current = now + NOISE_GATE_CONFIG.holdMs;
          } else if (now > noiseGateOpenUntilRef.current) {
            gate.gain.value = NOISE_GATE_CONFIG.closedGain;
          }
        }
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

  const startRingTone = useCallback((audioContext: AudioContext) => {
    const masterGain = audioContext.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioContext.destination);
    ringGainRef.current = masterGain;

    const scheduleCycle = () => {
      const gain = ringGainRef.current;
      if (!gain) return;
      const t0 = audioContext.currentTime;
      scheduleBeep(audioContext, gain, RING_TONE_FREQ_HZ, t0, RING_BEEP_DURATION_S);
      scheduleBeep(audioContext, gain, RING_TONE_FREQ_HZ, t0 + RING_BEEP_DURATION_S + RING_BEEP_GAP_S, RING_BEEP_DURATION_S);
    };

    scheduleCycle();
    ringIntervalRef.current = setInterval(scheduleCycle, RING_CYCLE_S * 1000);
  }, []);

  const stopRingTone = useCallback(() => {
    if (ringIntervalRef.current !== null) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    const gain = ringGainRef.current;
    const audioContext = audioContextRef.current;
    if (gain && audioContext && audioContext.state !== "closed") {
      // Fade out rather than disconnecting outright — avoids the click a
      // hard cut produces if this lands mid-beep.
      const now = audioContext.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.15);
    }
    ringGainRef.current = null;
  }, []);

  // Fires once, whichever happens later: the real connection finishing
  // (dc "open") or the minimum ring duration elapsing. Never fires early —
  // see the dc "open" handler in start(), which schedules this for
  // whatever time remains instead of calling it directly.
  const triggerPickup = useCallback(() => {
    if (pickupTriggeredRef.current) return;
    pickupTriggeredRef.current = true;
    if (connectTimeoutRef.current !== null) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (pickupTimeoutRef.current !== null) {
      clearTimeout(pickupTimeoutRef.current);
      pickupTimeoutRef.current = null;
    }
    stopRingTone();
    // The real track/analyser wiring in pc.ontrack already ran the moment
    // the connection was ready, unaffected by this gate — only the audible
    // output was held back until now.
    if (audioElRef.current) audioElRef.current.muted = false;
    wasConnectedRef.current = true;
    setStatus("connected");
    // Prospect answers the phone. If the session isn't ready yet the message
    // handler sends it the moment session.created arrives; the fallback below
    // covers a session that never reports ready.
    maybeSendGreeting();
    if (!greetingSentRef.current && greetingFallbackRef.current === null) {
      greetingFallbackRef.current = setTimeout(() => {
        greetingFallbackRef.current = null;
        console.warn("[realtime] session.created not seen; sending greeting anyway");
        sessionReadyRef.current = true;
        maybeSendGreeting();
      }, GREETING_FALLBACK_MS);
    }
  }, [stopRingTone, maybeSendGreeting]);

  const cleanup = useCallback(async () => {
    if (cleanupStartedRef.current) return;
    cleanupStartedRef.current = true;

    if (amplitudeFrameRef.current !== null) {
      cancelAnimationFrame(amplitudeFrameRef.current);
      amplitudeFrameRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (pickupTimeoutRef.current !== null) {
      clearTimeout(pickupTimeoutRef.current);
      pickupTimeoutRef.current = null;
    }
    if (greetingFallbackRef.current !== null) {
      clearTimeout(greetingFallbackRef.current);
      greetingFallbackRef.current = null;
    }
    if (connectTimeoutRef.current !== null) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (prospectEndFallbackRef.current !== null) {
      clearTimeout(prospectEndFallbackRef.current);
      prospectEndFallbackRef.current = null;
    }
    stopRingTone();

    // Play the disconnect tone — and wait for it — before tearing anything
    // down below, since closing the AudioContext would cut it off mid-play.
    // Only for a call that actually connected; cancelling mid-ring shouldn't
    // play a "call ended" tone for a call that never started.
    const audioContext = audioContextRef.current;
    if (wasConnectedRef.current && audioContext && audioContext.state !== "closed") {
      playDisconnectTone(audioContext);
      await new Promise<void>((resolve) => setTimeout(resolve, DISCONNECT_TEARDOWN_DELAY_MS));
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
    noiseGateRef.current = null;
    noiseGateOpenUntilRef.current = 0;
    noiseGateDataArrayRef.current = null;
  }, [stopRingTone]);

  // Only flips timedOut — CallScreen's own effect on that flag is the sole
  // place that calls stop()/onEnd(), same path as the explicit End Call
  // button, so the disconnect tone plays exactly once either way rather
  // than being triggered from here too.
  const startCountdown = useCallback((deadlineIso: string) => {
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
      }
    };

    tick();
    countdownIntervalRef.current = setInterval(tick, 1000);
  }, []);

  // The prospect decided to hang up (end_call). The spoken goodbye and the
  // actual disconnect stay in sync: this only fires once the goodbye audio
  // has finished playing (output_audio_buffer.stopped), or after a fallback
  // if that event never arrives.
  const finishProspectEnd = useCallback(() => {
    const pending = prospectEndPendingRef.current;
    if (!pending) return;
    prospectEndPendingRef.current = null;
    if (prospectEndFallbackRef.current !== null) {
      clearTimeout(prospectEndFallbackRef.current);
      prospectEndFallbackRef.current = null;
    }
    setProspectEnded(pending);
  }, []);

  const handleResponseDone = useCallback(
    (event: RealtimeServerEvent) => {
      const response = event.response as { output?: ResponseOutputItem[] } | undefined;
      for (const item of response?.output ?? []) {
        if (item.type === "message" && item.id && item.status && item.status !== "completed") {
          // Cancelled/incomplete: the caller talked over it. Some of the text
          // was generated but never heard.
          const id = item.id;
          updateTranscript((prev) => markInterrupted(prev, id));
        }
        if (item.type === "function_call" && item.name === END_CALL_TOOL_NAME) {
          if (!callerSpokeRef.current || endingRef.current) {
            // Ignore a hang-up before the prospect has even heard the caller,
            // and tell the model so it carries on rather than waiting.
            if (item.call_id) {
              sendEvent({
                type: "conversation.item.create",
                item: { type: "function_call_output", call_id: item.call_id, output: JSON.stringify({ ok: false, error: "too_early" }) },
              });
            }
            continue;
          }
          let reason = "other";
          try {
            reason = (JSON.parse(item.arguments ?? "{}") as { reason?: string }).reason ?? "other";
          } catch {
            // malformed arguments: keep the default reason
          }
          prospectEndPendingRef.current = { reason };

          const spokeGoodbye = (response?.output ?? []).some((o) => o.type === "message");
          if (!spokeGoodbye && item.call_id) {
            // The model hung up without saying anything. Ask for one short
            // closing line so the caller isn't cut off in silence, and wait
            // for THAT audio before disconnecting.
            closingLineRequestedRef.current = true;
            closingLineStartedRef.current = false;
            sendEvent({
              type: "conversation.item.create",
              item: { type: "function_call_output", call_id: item.call_id, output: JSON.stringify({ ok: true }) },
            });
            sendEvent({
              type: "response.create",
              response: {
                instructions:
                  "You are ending the phone call now. Say ONE short, natural closing line in your own words as the person you are on this call (a few words, like a brief goodbye), then stop. Do not call any function.",
              },
            });
            prospectEndFallbackRef.current = setTimeout(finishProspectEnd, PROSPECT_END_FALLBACK_MS + 2000);
          } else if (!outputAudioActiveRef.current) {
            // Goodbye already finished playing: hang up after a short beat.
            prospectEndFallbackRef.current = setTimeout(finishProspectEnd, 600);
          } else {
            prospectEndFallbackRef.current = setTimeout(finishProspectEnd, PROSPECT_END_FALLBACK_MS);
          }
        }
      }
    },
    [finishProspectEnd, sendEvent, updateTranscript]
  );

  const start = useCallback(
    async ({ trainingProfile, scenario, identity }: StartArgs) => {
      setError(null);
      setStatus("connecting");
      transcriptRef.current = [];
      setTranscript([]);
      setCallId(null);
      setRemainingSeconds(null);
      setTimedOut(false);
      setEntitlementExhausted(false);
      setProspectEnded(null);
      cleanupStartedRef.current = false;
      wasConnectedRef.current = false;
      pickupTriggeredRef.current = false;
      sessionReadyRef.current = false;
      greetingSentRef.current = false;
      callerSpokeRef.current = false;
      userSpeakingRef.current = false;
      awaitingCommitRef.current = false;
      pendingUserItemsRef.current = new Set();
      endingRef.current = false;
      outputAudioActiveRef.current = false;
      responseActiveRef.current = false;
      prospectEndPendingRef.current = null;
      closingLineRequestedRef.current = false;
      closingLineStartedRef.current = false;

      try {
        // Created and started first — rings immediately, and the rest of this
        // call's audio (amplitude analysis, noise gate) reuses this same
        // AudioContext once the connection is set up.
        //
        // `let`, not `const`: in dev mode, React StrictMode's mount→cleanup→
        // remount dance runs this component's mount effect, then
        // (synchronously, before this function's first `await` resolves) its
        // cleanup — closing this exact context. The remount's own startedRef
        // guard (CallScreen.tsx) blocks a *second* start() call (a second call
        // would reserve a second credit), so this original call's async chain
        // is the only one there is and it has to recover rather than being
        // abandoned: if getUserMedia() (below) finds this context closed it
        // creates a fresh one and reassigns this same binding, which is why
        // it must be reassignable (pc.ontrack's closure sees the replacement).
        let audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        void ensureAudioContextRunning(audioContext, "on creation");
        ringStartTimeRef.current = performance.now();
        startRingTone(audioContext);
        startAmplitudeLoop();

        // The microphone is requested BEFORE anything is reserved. A denied,
        // dismissed or missing microphone is the most common first-call
        // failure, and it must never consume a trial call or a credit: the
        // entitlement is only reserved (server-side, in /api/realtime/session)
        // once we already hold a working mic and a WebRTC offer.
        let mediaStream: MediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS });
        } catch (micErr) {
          const name = micErr instanceof DOMException ? micErr.name : "";
          const message =
            name === "NotAllowedError" || name === "SecurityError"
              ? "Microphone access is blocked. Allow the microphone for this site in your browser, then start the call again. This didn't use up a call."
              : name === "NotFoundError" || name === "OverconstrainedError"
                ? "No microphone was found. Plug in or enable a microphone, then start the call again. This didn't use up a call."
                : "The microphone couldn't be started. Check your browser's microphone permission, then try again. This didn't use up a call.";
          console.error("Microphone unavailable", micErr);
          setError(message);
          setStatus("error");
          void cleanup();
          return;
        }
        streamRef.current = mediaStream;

        if (audioContext.state === "closed") {
          // The StrictMode phantom closed the original context before we got
          // here — replace it rather than abandoning the call.
          console.warn(
            "[realtime audio] AudioContext was closed before mic setup — creating a fresh one (expected once in dev mode from React StrictMode's double-invoked effects)."
          );
          // Clear the original ring-tone interval FIRST, while it's still
          // reachable via the refs, or it would run forever against the
          // closed context.
          stopRingTone();
          audioContext = new AudioContext();
          audioContextRef.current = audioContext;
          await ensureAudioContextRunning(audioContext, "replacement after getUserMedia");
          ringStartTimeRef.current = performance.now();
          startRingTone(audioContext);
          // cleanup() (called by the phantom) also cancelled the amplitude
          // loop — restart it so the noise gate and "You" bars keep working.
          startAmplitudeLoop();
        } else {
          // The mic permission grant is itself a strong activation signal:
          // one more awaited attempt at resuming the context before wiring the
          // graph that carries audio to the peer connection.
          await ensureAudioContextRunning(audioContext, "after getUserMedia");
        }
        // The StrictMode phantom (or nothing at all) may have tripped the
        // one-shot cleanup guard; from here the call is genuinely continuing,
        // and a stuck guard would make the REAL end-of-call cleanup no-op
        // (mic left hot after End Call). Harmless to reset in production.
        cleanupStartedRef.current = false;

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        // Muted until perceived pickup (triggerPickup, on dc "open" below) —
        // the track/analyser wiring still happens immediately, only the
        // audible output is held back.
        audioEl.muted = true;
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

        const userSource = audioContext.createMediaStreamSource(mediaStream);
        const userAnalyser = audioContext.createAnalyser();
        userAnalyser.fftSize = 256;
        userSource.connect(userAnalyser);
        userAnalyserRef.current = userAnalyser;
        userDataArrayRef.current = new Uint8Array(userAnalyser.frequencyBinCount);
        // Time-domain buffer for the gate's RMS reading — length is fftSize
        // (frequencyBinCount is only for the frequency-domain buffer above).
        noiseGateDataArrayRef.current = new Uint8Array(userAnalyser.fftSize);

        // Route the mic through a gain node acting as a noise gate (opened/
        // closed every frame in startAmplitudeLoop) before it reaches the
        // peer connection — belt-and-suspenders on top of the browser-level
        // noiseSuppression constraint, which isn't equally effective everywhere.
        const noiseGate = audioContext.createGain();
        noiseGate.gain.value = NOISE_GATE_CONFIG.closedGain;
        userSource.connect(noiseGate);
        noiseGateRef.current = noiseGate;

        const gatedDestination = audioContext.createMediaStreamDestination();
        noiseGate.connect(gatedDestination);
        gatedDestination.stream.getTracks().forEach((track) => pc.addTrack(track, gatedDestination.stream));

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;

        dc.addEventListener("open", () => {
          // Whichever is later: the real connection (right now) or the
          // minimum ring duration — never sooner than the real thing is ready.
          const elapsed = performance.now() - ringStartTimeRef.current;
          const remaining = RING_MIN_DURATION_MS - elapsed;
          if (remaining <= 0) {
            triggerPickup();
          } else {
            pickupTimeoutRef.current = setTimeout(triggerPickup, remaining);
          }
        });

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
            case "session.created":
              sessionReadyRef.current = true;
              maybeSendGreeting();
              break;
            case "input_audio_buffer.speech_started":
              setSpeaking(true);
              userSpeakingRef.current = true;
              callerSpokeRef.current = true;
              break;
            case "input_audio_buffer.speech_stopped":
              setSpeaking(false);
              userSpeakingRef.current = false;
              // The commit event follows immediately; until it lands the turn
              // is not yet registered as pending.
              awaitingCommitRef.current = true;
              notifySettle();
              break;
            case "input_audio_buffer.committed": {
              awaitingCommitRef.current = false;
              const id = event.item_id;
              if (id) {
                pendingUserItemsRef.current.add(id);
                // Placeholder that fixes this turn's position in the transcript.
                updateTranscript((prev) =>
                  prev.some((entry) => entry.id === id) ? prev : [...prev, { id, role: "user", text: "", final: false, timestamp: Date.now() }]
                );
              }
              notifySettle();
              break;
            }
            case "conversation.item.input_audio_transcription.completed": {
              const id = event.item_id;
              if (id && typeof event.transcript === "string") {
                updateTranscript((prev) => upsertUserEntry(prev, id, event.transcript as string));
              }
              if (id) pendingUserItemsRef.current.delete(id);
              notifySettle();
              break;
            }
            case "conversation.item.input_audio_transcription.failed": {
              const id = event.item_id;
              if (id) {
                updateTranscript((prev) => upsertUserEntry(prev, id, ""));
                pendingUserItemsRef.current.delete(id);
              }
              notifySettle();
              break;
            }
            case "response.created":
              responseActiveRef.current = true;
              // While ending, never let a reply to the caller's last words start.
              if (endingRef.current) sendEvent({ type: "response.cancel" });
              break;
            case "output_audio_buffer.started":
              outputAudioActiveRef.current = true;
              if (closingLineRequestedRef.current) closingLineStartedRef.current = true;
              break;
            case "output_audio_buffer.stopped":
              outputAudioActiveRef.current = false;
              // Goodbye finished playing: now (and only now) hang up. If a
              // closing line was requested, earlier audio finishing doesn't count.
              if (prospectEndPendingRef.current && (!closingLineRequestedRef.current || closingLineStartedRef.current)) {
                if (prospectEndFallbackRef.current !== null) clearTimeout(prospectEndFallbackRef.current);
                prospectEndFallbackRef.current = setTimeout(finishProspectEnd, 250);
              }
              break;
            case "response.output_audio_transcript.delta": {
              const id = event.item_id ?? event.response_id;
              if (id && typeof event.delta === "string") {
                updateTranscript((prev) => appendProspectDelta(prev, id, event.delta as string));
              }
              break;
            }
            case "response.output_audio_transcript.done": {
              const id = event.item_id ?? event.response_id;
              if (id) updateTranscript((prev) => finalizeEntry(prev, id));
              break;
            }
            case "response.done":
              responseActiveRef.current = false;
              handleResponseDone(event);
              break;
            case "error":
              // A cancel racing with a response that just finished is harmless.
              if ((event.error as { code?: string } | undefined)?.code === "response_cancel_not_active") break;
              console.error("Realtime API error event", event);
              setError(event.error?.message ?? "The prospect connection reported an error.");
              break;
            default:
              break;
          }
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // The server brokers the handshake with OpenAI (so it holds the
        // provider call id and can enforce the time cap) and reserves the
        // entitlement — only now that a mic and an offer exist.
        const sessionRes = await fetch("/api/realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offerSdp: offer.sdp, trainingProfile, scenario, identity }),
        });
        if (!sessionRes.ok) {
          const body = await sessionRes.json().catch(() => null);
          if (sessionRes.status === 403 && body?.error === "entitlement_required") {
            setEntitlementExhausted(true);
            setStatus("error");
            // Not thrown, so this bypasses the catch block below — without
            // this the ring tone, mic and AudioContext would leak.
            void cleanup();
            return;
          }
          throw new Error(body?.error ?? "Failed to start call session.");
        }
        const { answerSdp, callId: newCallId, deadlineAt } = (await sessionRes.json()) as {
          answerSdp: string;
          callId: string;
          deadlineAt: string;
        };
        setCallId(newCallId);
        startCountdown(deadlineAt);

        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
        connectTimeoutRef.current = setTimeout(() => {
          connectTimeoutRef.current = null;
          if (pickupTriggeredRef.current) return;
          console.error("Realtime connection did not open in time");
          setError("Couldn't connect to the call. Check your connection and try again.");
          setStatus("error");
          void cleanup();
        }, CONNECT_TIMEOUT_MS);
      } catch (err) {
        // A failure here happens AFTER the server reserved and started the
        // call (only the browser-side setRemoteDescription can still fail);
        // failures inside the server route release the entitlement themselves.
        // The stale-call sweep in get_entitlement_status() reconciles the
        // leftover 'started' row later.
        console.error("Failed to start realtime call", err);
        setError(err instanceof Error ? err.message : "Something went wrong starting the call.");
        setStatus("error");
        void cleanup();
      }
    },
    [
      cleanup,
      finishProspectEnd,
      handleResponseDone,
      maybeSendGreeting,
      notifySettle,
      sendEvent,
      startAmplitudeLoop,
      startCountdown,
      startRingTone,
      stopRingTone,
      triggerPickup,
      updateTranscript,
    ]
  );

  // Tear down without waiting for anything (unmount, hard failure).
  const stop = useCallback(async () => {
    await cleanup();
    setStatus((prev) => (prev === "idle" ? prev : "ended"));
    setSpeaking(false);
  }, [cleanup]);

  // Wait until the caller's last words are actually in the transcript: no
  // speech in flight, no committed turn still awaiting transcription. Resolves
  // as soon as that is true, with a ceiling so a lost event can't hang the UI.
  const settleTranscript = useCallback(
    () =>
      new Promise<void>((resolve) => {
        const isSettled = () =>
          !userSpeakingRef.current && !awaitingCommitRef.current && pendingUserItemsRef.current.size === 0;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const finish = () => {
          if (timer !== null) clearTimeout(timer);
          settleWaitersRef.current.delete(check);
          resolve();
        };
        const check = () => {
          if (isSettled()) finish();
        };
        settleWaitersRef.current.add(check);
        timer = setTimeout(finish, SETTLE_MAX_MS);
        check();
      }),
    []
  );

  // The one way a call ends deliberately (End Call, time limit, or the
  // prospect hanging up). Lets outstanding transcript events settle before
  // teardown, drops any reply the prospect was mid-way through (it wasn't
  // fully heard), and returns the final transcript.
  const endCall = useCallback(async (): Promise<TranscriptEntry[]> => {
    endingRef.current = true;
    // Stop sending new audio. The server will finish committing whatever
    // speech was already in flight; settleTranscript waits for that.
    streamRef.current?.getAudioTracks().forEach((track) => (track.enabled = false));
    // Anything the prospect is saying or about to say will not be heard.
    if (responseActiveRef.current) sendEvent({ type: "response.cancel" });
    if (audioElRef.current) audioElRef.current.muted = true;

    await settleTranscript();

    // Prospect turns still open at hang-up were cut off mid-reply.
    updateTranscript((prev) =>
      prev.map((entry) => (entry.role === "prospect" && !entry.final ? { ...entry, final: true, interrupted: true } : entry))
    );
    const finalTranscript = transcriptRef.current.filter((entry) => entry.text.trim().length > 0);

    await cleanup();
    setStatus((prev) => (prev === "idle" ? prev : "ended"));
    setSpeaking(false);
    return finalTranscript;
  }, [cleanup, sendEvent, settleTranscript, updateTranscript]);

  return {
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
  };
}
