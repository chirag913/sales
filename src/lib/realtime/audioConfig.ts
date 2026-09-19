// Every knob that decides whether a caller's voice reaches the prospect, in
// one place, so it can be inspected and tested. NONE of these values have
// been validated for call-centre conditions: they were tuned against a
// single quiet home environment with fan noise. Use /audio-check (see
// src/components/audio/AudioCheck.tsx) to measure them on real headsets and
// floors BEFORE changing anything here.

// Server-side voice activity detection, sent in the realtime session config
// (src/lib/realtime/sessionConfig.ts).
export const VAD_CONFIG = {
  type: "server_vad",
  interrupt_response: true,
  // Silence needed before the caller's turn is considered finished. Also the
  // reason the prospect can never interrupt the caller: it only responds
  // after this much quiet.
  silence_duration_ms: 750,
  // Audio kept from before speech was detected (avoids clipping first syllable).
  prefix_padding_ms: 500,
  // Speech-probability threshold. API default is 0.5. 0.8 rejects steady room
  // noise but can miss soft or distant speakers; unvalidated for BPO floors.
  threshold: 0.8,
} as const;

// Client-side noise gate applied to the mic before it reaches the peer
// connection (see startAmplitudeLoop in useRealtimeCall.ts). The gate opens
// when the RMS of the mic waveform (0-1) exceeds openThreshold and stays
// open for holdMs; when closed it attenuates to closedGain rather than
// muting, so a wrong threshold can never silence the caller completely.
export const NOISE_GATE_CONFIG = {
  openThreshold: 0.02,
  holdMs: 500,
  closedGain: 0.15,
} as const;

// Browser-level processing requested from getUserMedia. Advisory only:
// effectiveness varies by device and OS.
export const MIC_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
