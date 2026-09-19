"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { MIC_CONSTRAINTS, NOISE_GATE_CONFIG, VAD_CONFIG } from "@/lib/realtime/audioConfig";

// A local microphone check, with no call, no OpenAI cost and nothing sent
// anywhere. It measures what the BROWSER side of the pipeline sees (the mic
// level and whether the client noise gate would open) in the situations a
// call-centre floor actually produces, and lets the result be copied out.
//
// What it cannot measure: the server-side VAD (VAD_CONFIG.threshold is a
// speech probability computed by OpenAI), transcription accuracy, or how the
// prospect behaves. Those are only testable in real calls. The constants
// here have NOT been validated for BPO floors: use this to gather evidence
// per environment first, and change nothing in audioConfig.ts on a hunch.

const CONDITIONS = [
  "Headset",
  "Laptop microphone",
  "Moderate background noise",
  "Multiple people talking nearby",
  "Quiet speaker",
  "Soft speaker",
] as const;

type Condition = (typeof CONDITIONS)[number];
type MeasureKind = "background" | "speech";

interface Measurement {
  condition: Condition;
  kind: MeasureKind;
  seconds: number;
  medianRms: number;
  p95Rms: number;
  gateOpenPercent: number;
  at: string;
}

const MEASURE_SECONDS = 6;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function interpret(m: Measurement): string {
  const threshold = NOISE_GATE_CONFIG.openThreshold;
  if (m.kind === "background") {
    return m.gateOpenPercent > 20
      ? `Background noise alone would hold the gate open ${m.gateOpenPercent}% of the time, so it isn't filtering this environment.`
      : `Background noise keeps the gate open only ${m.gateOpenPercent}% of the time. Good for this environment.`;
  }
  return m.p95Rms < threshold * 1.5
    ? `Your loudest speech (${m.p95Rms.toFixed(3)}) is close to the gate threshold (${threshold}); quiet passages may be attenuated. Check a real call in this condition before trusting it.`
    : `Speech peaks at ${m.p95Rms.toFixed(3)}, comfortably above the gate threshold (${threshold}).`;
}

export function AudioCheck() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [condition, setCondition] = useState<Condition>("Headset");
  const [measuring, setMeasuring] = useState<MeasureKind | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [copied, setCopied] = useState(false);
  const meterRef = useRef<HTMLDivElement | null>(null);
  const gateRef = useRef<HTMLSpanElement | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const samplesRef = useRef<number[] | null>(null);

  function stopMic() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setRunning(false);
  }

  useEffect(() => stopMic, []);

  async function startMic() {
    setError(null);
    try {
      // The same constraints and the same RMS reading the live call uses.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS });
      const ctx = new AudioContext();
      await ctx.resume();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      streamRef.current = stream;
      ctxRef.current = ctx;

      let openUntil = 0;
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (let i = 0; i < data.length; i++) {
          const n = (data[i] - 128) / 128;
          sumSquares += n * n;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        const now = performance.now();
        if (rms > NOISE_GATE_CONFIG.openThreshold) openUntil = now + NOISE_GATE_CONFIG.holdMs;
        const open = now < openUntil;
        samplesRef.current?.push(open ? rms : -rms); // sign carries gate state without a second array
        if (meterRef.current) meterRef.current.style.width = `${Math.min(100, rms * 400)}%`;
        if (gateRef.current) {
          gateRef.current.textContent = open ? "Gate OPEN (audio passes)" : "Gate closed (attenuated)";
          gateRef.current.className = open ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400 dark:text-zinc-500";
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
      setRunning(true);
    } catch {
      setError("Microphone access was blocked or no microphone was found.");
    }
  }

  function measure(kind: MeasureKind) {
    if (!running || measuring) return;
    samplesRef.current = [];
    setMeasuring(kind);
    window.setTimeout(() => {
      const raw = samplesRef.current ?? [];
      samplesRef.current = null;
      setMeasuring(null);
      if (raw.length === 0) return;
      const levels = raw.map(Math.abs).sort((a, b) => a - b);
      const gateOpen = raw.filter((v) => v > 0).length;
      setMeasurements((prev) => [
        {
          condition,
          kind,
          seconds: MEASURE_SECONDS,
          medianRms: percentile(levels, 0.5),
          p95Rms: percentile(levels, 0.95),
          gateOpenPercent: Math.round((gateOpen / raw.length) * 100),
          at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }, MEASURE_SECONDS * 1000);
  }

  async function copyResults() {
    const payload = { config: { VAD_CONFIG, NOISE_GATE_CONFIG, MIC_CONSTRAINTS }, measurements };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to the clipboard.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Link href="/practice" className="text-sm text-zinc-500 underline-offset-4 hover:underline dark:text-zinc-400">
        ← Back to training setup
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Microphone check</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Runs entirely in your browser: nothing is recorded, uploaded, or charged. It shows what this app&apos;s
        client-side noise gate does with your microphone in different conditions.
      </p>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
        The current settings were tuned in one quiet home environment and have <strong>not</strong> been validated for call
        centres. Collect results for each condition below, and confirm with real calls, before anyone changes them.
        This page cannot measure the server-side speech detection.
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200/70 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">Current settings</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-zinc-600 dark:text-zinc-400">
          <dt>Server VAD threshold</dt><dd>{VAD_CONFIG.threshold} (API default 0.5)</dd>
          <dt>Silence before turn ends</dt><dd>{VAD_CONFIG.silence_duration_ms} ms</dd>
          <dt>Speech lead-in padding</dt><dd>{VAD_CONFIG.prefix_padding_ms} ms</dd>
          <dt>Client gate opens above (RMS)</dt><dd>{NOISE_GATE_CONFIG.openThreshold}</dd>
          <dt>Gate hold time</dt><dd>{NOISE_GATE_CONFIG.holdMs} ms</dd>
          <dt>Gate closed gain</dt><dd>{NOISE_GATE_CONFIG.closedGain}</dd>
          <dt>Echo cancel / noise suppress / auto gain</dt>
          <dd>
            {String(MIC_CONSTRAINTS.echoCancellation)} / {String(MIC_CONSTRAINTS.noiseSuppression)} / {String(MIC_CONSTRAINTS.autoGainControl)}
          </dd>
        </dl>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200/70 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-3">
          {running ? (
            <Button variant="secondary" onClick={stopMic}>
              Stop microphone
            </Button>
          ) : (
            <Button onClick={() => void startMic()}>Start microphone</Button>
          )}
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            Condition
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-5">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
            <div ref={meterRef} className="h-full w-0 rounded-full bg-emerald-500" />
            <div
              className="absolute top-0 h-full w-px bg-zinc-900 dark:bg-zinc-100"
              style={{ left: `${NOISE_GATE_CONFIG.openThreshold * 400}%` }}
              aria-hidden
            />
          </div>
          <p className="mt-2 text-xs">
            <span ref={gateRef} className="text-zinc-400 dark:text-zinc-500">Microphone off</span>
            <span className="text-zinc-400 dark:text-zinc-500"> · the vertical mark is the gate threshold</span>
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" disabled={!running || measuring !== null} onClick={() => measure("background")}>
            {measuring === "background" ? "Measuring background…" : `Measure background (${MEASURE_SECONDS}s, stay quiet)`}
          </Button>
          <Button variant="secondary" disabled={!running || measuring !== null} onClick={() => measure("speech")}>
            {measuring === "speech" ? "Measuring your voice…" : `Measure my voice (${MEASURE_SECONDS}s, speak normally)`}
          </Button>
        </div>
      </div>

      {measurements.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Results</p>
            <Button variant="secondary" onClick={() => void copyResults()}>
              {copied ? "Copied" : "Copy as JSON"}
            </Button>
          </div>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200/70 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                <tr>
                  <th className="p-3">Condition</th>
                  <th className="p-3">Test</th>
                  <th className="p-3">Median</th>
                  <th className="p-3">Peak (p95)</th>
                  <th className="p-3">Gate open</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m) => (
                  <tr key={m.at} className="border-t border-zinc-100 align-top dark:border-zinc-900">
                    <td className="p-3">{m.condition}</td>
                    <td className="p-3">{m.kind === "background" ? "Background" : "Speech"}</td>
                    <td className="p-3">{m.medianRms.toFixed(3)}</td>
                    <td className="p-3">{m.p95Rms.toFixed(3)}</td>
                    <td className="p-3">{m.gateOpenPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{interpret(measurements[0])}</p>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-zinc-200/70 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">Real-call checklist (per condition above)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Speak normally: does the prospect reply every time, without you repeating yourself?</li>
          <li>Stay silent for 20 seconds with the background present: does the prospect react to noise?</li>
          <li>Does your transcript match what you said? Are the first words of a sentence missing?</li>
          <li>Speak softly, then from a little further away. Does anything get dropped?</li>
          <li>With others talking nearby, does their speech show up in your transcript?</li>
        </ul>
      </div>
    </div>
  );
}
