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

// Client-side noise gate thresholds — see startAmplitudeLoop for how these
// are used. The gate's own open/close decision is driven by an RMS reading
// of time-domain samples (see noiseGateDataArrayRef below), NOT the
// frequency-bin-average metric userAmplitudeRef uses for the "You" bars —
// averaging getByteFrequencyData() across all bins is a poor loudness proxy
// (most bins carry near-zero energy for speech, dragging the average well
// below what real speech should read as), and was silently keeping this
// gate closed for real speech on at least some devices — total mic silence
// reaching OpenAI, with no error anywhere, since the gate was just doing
// exactly what its (mis-calibrated) logic said to do. RMS of the actual
// waveform is the standard, far more reliable "is there sound" metric.
// OPEN_THRESHOLD is a starting guess on that RMS scale (0-1) — tune down
// further if noise still gets through, but err toward "too easy to open"
// over "too hard": losing the caller's voice entirely is a much worse
// failure than a little background noise passing. HOLD_MS keeps the gate
// open briefly after amplitude dips so a natural mid-sentence pause doesn't
// get clipped.
const NOISE_GATE_OPEN_THRESHOLD = 0.02;
const NOISE_GATE_HOLD_MS = 500;
// The "closed" state attenuates heavily rather than fully silencing (0),
// so even a threshold that's still miscalibrated for a given mic/room can
// never result in total voice loss — only degraded noise suppression.
const NOISE_GATE_CLOSED_GAIN = 0.15;

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
          if (rms > NOISE_GATE_OPEN_THRESHOLD) {
            gate.gain.value = 1;
            noiseGateOpenUntilRef.current = now + NOISE_GATE_HOLD_MS;
          } else if (now > noiseGateOpenUntilRef.current) {
            gate.gain.value = NOISE_GATE_CLOSED_GAIN;
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
  }, [stopRingTone]);

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

  const start = useCallback(
    async ({ salesProfile, trainingProfile, scenario, identity }: StartArgs) => {
      setError(null);
      setStatus("connecting");
      setTranscript([]);
      setCallId(null);
      setRemainingSeconds(null);
      setTimedOut(false);
      setEntitlementExhausted(false);
      cleanupStartedRef.current = false;
      wasConnectedRef.current = false;
      pickupTriggeredRef.current = false;

      try {
        // Created and started before the token fetch below — rings
        // immediately rather than after a network round trip. The rest of
        // this call's audio (amplitude analysis, noise gate) reuses this
        // same AudioContext once the connection is actually set up.
        //
        // `let`, not `const`: in dev mode, React StrictMode's mount→cleanup→
        // remount dance runs this component's mount effect, then
        // (synchronously, before this function's very first `await` below
        // resolves) its cleanup — calling stop()/cleanup() on THIS still-
        // in-flight attempt and closing this exact context. The remount's
        // own startedRef guard (CallScreen.tsx) then blocks a *second*
        // start() call (deliberately — the token fetch below reserves a
        // real entitlement, so calling start() twice would burn two credits
        // for what the user experiences as one call), so this original
        // call's async chain is the only one there is, and it has to
        // recover rather than being abandoned. If getUserMedia() (further
        // below) finds this context already closed, it creates a fresh one
        // and reassigns this same binding — which is exactly why this needs
        // to be reassignable, so pc.ontrack's closure (captured further
        // below, before that recovery can happen) sees the replacement too.
        let audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        void ensureAudioContextRunning(audioContext, "on creation");
        ringStartTimeRef.current = performance.now();
        startRingTone(audioContext);
        startAmplitudeLoop();

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
            // Not thrown, so this bypasses the catch block below — without
            // this the ring tone and AudioContext started above would leak.
            void cleanup();
            return;
          }
          throw new Error(body?.error ?? "Failed to start call session.");
        }
        const {
          value: ephemeralKey,
          callId: newCallId,
          deadlineAt,
        } = (await tokenRes.json()) as { value: string; callId: string; deadlineAt: string };
        // A valid token means this call is genuinely continuing — reset the
        // one-shot cleanup guard in case the StrictMode phantom described
        // above already tripped it. Without this, cleanup()'s own
        // idempotency guard (needed so the disconnect tone can't play
        // twice — see cleanup()'s comment) would make the REAL end-of-call
        // cleanup silently no-op later: the peer connection would never
        // close and the mic would stay hot even after the user hits End
        // Call. Harmless to reset in production, where this never tripped
        // early in the first place.
        cleanupStartedRef.current = false;
        setCallId(newCallId);
        startCountdown(deadlineAt);

        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        const audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        // Muted until perceived pickup (triggerPickup, on dc "open" below)
        // — the track/analyser wiring right below still happens immediately
        // regardless, only the audible output is held back.
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
        if (audioContext.state === "closed") {
          // The StrictMode phantom (see the `let audioContext` comment
          // above) closed the original context before we got here —
          // replace it rather than abandoning the call. Reassigning this
          // same `audioContext` binding means pc.ontrack's closure (defined
          // above, before this could be known) sees the replacement too.
          console.warn(
            "[realtime audio] AudioContext was closed before mic setup — creating a fresh one (expected once in dev mode from React StrictMode's double-invoked effects)."
          );
          // Clear the original ring-tone interval FIRST, while it's still
          // reachable via the refs — otherwise calling startRingTone again
          // below would overwrite ringIntervalRef/ringGainRef without ever
          // clearing the original timer, leaving it running forever and
          // throwing every cycle against the now-closed context.
          stopRingTone();
          audioContext = new AudioContext();
          audioContextRef.current = audioContext;
          await ensureAudioContextRunning(audioContext, "replacement after getUserMedia");
          ringStartTimeRef.current = performance.now();
          startRingTone(audioContext);
          // cleanup() (called by the phantom above) also cancelled the
          // amplitude loop's requestAnimationFrame chain — without
          // restarting it here, the noise gate's gain would freeze at
          // whatever it last was (silence or unfiltered, either way stuck)
          // for the rest of the call, and the "You" bars would never move
          // again. Safe to call again: the old rAF chain is already fully
          // stopped, so this just starts a fresh one, not a second one.
          startAmplitudeLoop();
        } else {
          // Second, awaited attempt — the mic permission grant the user just
          // acted on is itself a strong activation signal, worth one more
          // real try (not fire-and-forget this time) before wiring the graph
          // that actually carries audio to the peer connection below.
          await ensureAudioContextRunning(audioContext, "after getUserMedia");
        }

        const userSource = audioContext.createMediaStreamSource(mediaStream);
        const userAnalyser = audioContext.createAnalyser();
        userAnalyser.fftSize = 256;
        userSource.connect(userAnalyser);
        userAnalyserRef.current = userAnalyser;
        userDataArrayRef.current = new Uint8Array(userAnalyser.frequencyBinCount);
        // Time-domain buffer for the gate's RMS reading (see constants above)
        // — length is fftSize here, not frequencyBinCount (that's only for
        // the frequency-domain buffer above).
        noiseGateDataArrayRef.current = new Uint8Array(userAnalyser.fftSize);

        // Route the mic through a gain node acting as a noise gate (opened/
        // closed every frame in startAmplitudeLoop based on amplitude) before
        // it ever reaches the peer connection — belt-and-suspenders on top of
        // the browser-level noiseSuppression constraint above, since that
        // constraint is advisory and not equally effective on every device.
        const noiseGate = audioContext.createGain();
        noiseGate.gain.value = NOISE_GATE_CLOSED_GAIN;
        userSource.connect(noiseGate);
        noiseGateRef.current = noiseGate;

        const gatedDestination = audioContext.createMediaStreamDestination();
        noiseGate.connect(gatedDestination);
        gatedDestination.stream.getTracks().forEach((track) => pc.addTrack(track, gatedDestination.stream));

        const dc = pc.createDataChannel("oai-events");
        dcRef.current = dc;

        dc.addEventListener("open", () => {
          // Whichever is later: the real connection (right now) or the
          // minimum ring duration — never sooner than the real thing is
          // ready, per triggerPickup's own guard against firing twice.
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
        void cleanup();
      }
    },
    [cleanup, startAmplitudeLoop, startCountdown, startRingTone, stopRingTone, triggerPickup]
  );

  const stop = useCallback(async () => {
    await cleanup();
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
