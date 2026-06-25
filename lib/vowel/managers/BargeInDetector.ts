/**
 * BargeInDetector - Residual-based echo detection for self-hearing prevention
 *
 * Prevents the AI from hearing its own TTS audio through the user's microphone.
 * Cross-correlates each mic frame against a ring buffer of playback audio at
 * varying acoustic delays (20-420ms), computes the "unexplained residual"
 * fraction of mic energy, and triggers barge-in after N consecutive frames
 * where mic RMS and residual ratio both exceed thresholds.
 *
 * Technique ported from pibot (Mario Zechner, "How to build a shitty robot"):
 * https://mariozechner.at/posts/2026-05-30-shitty-robot/
 *
 * Algorithm:
 * 1. Playback reference ring buffer stores N seconds of speaker output
 * 2. Mic preroll ring buffer stores 1 second of mic PCM (for utterance onset)
 * 3. Per-frame: compute mic RMS, cross-correlate against reference at delays
 * 4. residualRatio = (micEnergy - explainedByEcho) / micEnergy
 * 5. Barge-in fires after `triggerFrames` consecutive frames with high RMS + residual
 *
 * @module @vowel.to/client/managers
 */

/**
 * Result of observing a mic frame through the barge-in detector.
 */
export interface BargeInResult {
  /** Whether barge-in was triggered (real user speech detected during AI output) */
  triggered: boolean;
  /** Buffered mic PCM from the preroll ring buffer (present when triggered) */
  preroll?: Int16Array;
  /** Detection metrics for debugging/tuning */
  metrics?: {
    micRms: number;
    residualRatio: number;
  };
}

/**
 * Configuration options for the BargeInDetector.
 */
export interface BargeInDetectorOptions {
  /** Min mic RMS to consider "someone is speaking" (default: 0.018) */
  micThreshold?: number;
  /** Min fraction of mic energy that must be unexplained by echo (default: 0.62) */
  residualThreshold?: number;
  /** Consecutive triggered frames before barge-in fires (default: 5) */
  triggerFrames?: number;
  /** Mic ring buffer size in seconds for utterance onset capture (default: 1.0) */
  prerollSeconds?: number;
  /** Playback ring buffer size in seconds for echo reference (default: 8.0) */
  referenceSeconds?: number;
}

/** Default threshold values (derived from pibot field testing) */
const DEFAULT_MIC_THRESHOLD = 0.018;
const DEFAULT_RESIDUAL_THRESHOLD = 0.62;
const DEFAULT_TRIGGER_FRAMES = 5;
const DEFAULT_PREROLL_SECONDS = 1.0;
const DEFAULT_REFERENCE_SECONDS = 8.0;

/** Acoustic delay search range in milliseconds */
const MIN_DELAY_MS = 20;
const MAX_DELAY_MS = 420;
const DELAY_STEP_MS = 10;

/** Energy floor to avoid division by zero */
const ENERGY_FLOOR = 1e-7;

/**
 * Residual-based echo detector that prevents the AI from hearing its own voice.
 *
 * Feed playback audio via {@link handlePlaybackAudio} and mic frames via
 * {@link observeMic}. When the AI is not speaking, mic frames pass through
 * unchanged (no echo to detect). When the AI is speaking, the detector
 * cross-correlates mic frames against the playback reference and gates
 * frames that are predominantly echo.
 *
 * @example
 * ```typescript
 * const detector = new BargeInDetector(24000);
 *
 * // Feed TTS playback as reference
 * detector.handlePlaybackAudio(float32Samples, 24000);
 *
 * // Feed mic frames during AI speech
 * const result = detector.observeMic(micFloat32, 24000, micPcm16, true);
 * if (result.triggered) {
 *   // Real user speech detected - flush preroll and interrupt
 *   sendAudio(result.preroll);
 *   triggerInterrupt();
 * }
 * ```
 */
export class BargeInDetector {
  private streaming = false;
  private consecutiveFrames = 0;

  private playbackReferenceSampleRate = 0;
  private playbackReferenceWrite = 0;
  private playbackReferenceSamples = 0;
  private playbackReferenceRing: Float32Array;

  private micBufferWrite = 0;
  private micBufferSamples = 0;
  private readonly micBufferRing: Int16Array;

  private readonly micThreshold: number;
  private readonly residualThreshold: number;
  private readonly triggerFrames: number;
  private readonly referenceSeconds: number;

  /**
   * @param targetSampleRate - Mic sample rate in Hz (e.g., 24000)
   * @param options - Optional threshold and buffer size configuration
   */
  constructor(
    targetSampleRate: number,
    options?: BargeInDetectorOptions,
  ) {
    this.micThreshold = options?.micThreshold ?? DEFAULT_MIC_THRESHOLD;
    this.residualThreshold = options?.residualThreshold ?? DEFAULT_RESIDUAL_THRESHOLD;
    this.triggerFrames = options?.triggerFrames ?? DEFAULT_TRIGGER_FRAMES;
    this.referenceSeconds = options?.referenceSeconds ?? DEFAULT_REFERENCE_SECONDS;

    const prerollSeconds = options?.prerollSeconds ?? DEFAULT_PREROLL_SECONDS;
    this.micBufferRing = new Int16Array(Math.ceil(targetSampleRate * prerollSeconds));
    this.playbackReferenceRing = new Float32Array(Math.ceil(48000 * this.referenceSeconds));
  }

  /**
   * Reset the streaming state (allow barge-in to fire again).
   * Call this after a barge-in has been processed and normal listening resumes.
   */
  resetStreaming(): void {
    this.streaming = false;
    this.consecutiveFrames = 0;
  }

  /**
   * Whether barge-in has already fired and streaming is active.
   * @returns true if barge-in was triggered and mic is now being streamed
   */
  isStreaming(): boolean {
    return this.streaming;
  }

  /**
   * Feed playback (TTS) audio into the reference ring buffer.
   * Call this for every audio chunk played to the speakers.
   *
   * @param samples - Float32 audio samples (-1.0 to 1.0)
   * @param sampleRate - Sample rate of the playback audio
   */
  handlePlaybackAudio(samples: Float32Array, sampleRate: number): void {
    if (this.playbackReferenceSampleRate !== sampleRate) {
      this.playbackReferenceSampleRate = sampleRate;
      this.playbackReferenceRing = new Float32Array(Math.ceil(sampleRate * this.referenceSeconds));
      this.playbackReferenceWrite = 0;
      this.playbackReferenceSamples = 0;
    }
    for (const sample of samples) {
      this.playbackReferenceRing[this.playbackReferenceWrite] = sample;
      this.playbackReferenceWrite = (this.playbackReferenceWrite + 1) % this.playbackReferenceRing.length;
      this.playbackReferenceSamples += 1;
    }
  }

  /**
   * Observe a mic frame and determine if it's real speech or echo.
   *
   * When `isAISpeaking` is false, returns `{ triggered: false }` immediately
   * (passthrough — no echo to detect). When `isAISpeaking` is true,
   * cross-correlates the mic frame against the playback reference and
   * applies the residual-based detection algorithm.
   *
   * @param input - Float32 mic samples (-1.0 to 1.0)
   * @param sampleRate - Mic sample rate in Hz
   * @param pcm - PCM16 version of the mic frame (for preroll buffer)
   * @param isAISpeaking - Whether the AI is currently outputting audio
   * @returns Barge-in result with trigger state, preroll (if triggered), and metrics
   */
  observeMic(
    input: Float32Array,
    sampleRate: number,
    pcm: Int16Array,
    isAISpeaking: boolean,
  ): BargeInResult {
    this.appendMicBuffer(pcm);

    // When AI is not speaking, there's no echo to detect — passthrough
    if (!isAISpeaking || this.streaming) {
      return { triggered: false };
    }

    const rms = this.micRms(input);
    const ratio = this.bargeResidualRatio(input, sampleRate);
    const triggered = rms >= this.micThreshold && ratio >= this.residualThreshold;

    // Hysteresis: increment on trigger, decrement on non-trigger
    this.consecutiveFrames = triggered
      ? this.consecutiveFrames + 1
      : Math.max(0, this.consecutiveFrames - 1);

    if (this.consecutiveFrames < this.triggerFrames) {
      return { triggered: false };
    }

    // Barge-in confirmed
    this.streaming = true;
    this.consecutiveFrames = 0;
    return {
      triggered: true,
      preroll: this.bufferedMicPcm(),
      metrics: { micRms: rms, residualRatio: ratio },
    };
  }

  /**
   * Reset all buffers and state for a new session or reconnection.
   */
  reset(): void {
    this.streaming = false;
    this.consecutiveFrames = 0;
    this.playbackReferenceWrite = 0;
    this.playbackReferenceSamples = 0;
    this.micBufferWrite = 0;
    this.micBufferSamples = 0;
    this.playbackReferenceRing.fill(0);
    this.micBufferRing.fill(0);
  }

  /**
   * Release references for garbage collection.
   */
  dispose(): void {
    this.reset();
    (this.playbackReferenceRing as unknown) = new Float32Array(0);
    (this.micBufferRing as unknown) = new Int16Array(0);
  }

  private appendMicBuffer(pcm: Int16Array): void {
    for (const sample of pcm) {
      this.micBufferRing[this.micBufferWrite] = sample;
      this.micBufferWrite = (this.micBufferWrite + 1) % this.micBufferRing.length;
      this.micBufferSamples = Math.min(this.micBufferSamples + 1, this.micBufferRing.length);
    }
  }

  private bufferedMicPcm(): Int16Array {
    const output = new Int16Array(this.micBufferSamples);
    const start =
      (this.micBufferWrite - this.micBufferSamples + this.micBufferRing.length) %
      this.micBufferRing.length;
    for (let index = 0; index < this.micBufferSamples; index++) {
      output[index] = this.micBufferRing[(start + index) % this.micBufferRing.length] ?? 0;
    }
    return output;
  }

  private micRms(input: Float32Array): number {
    let energy = 0;
    for (const sample of input) energy += sample * sample;
    return Math.sqrt(energy / Math.max(1, input.length));
  }

  /**
   * Compute the residual ratio: fraction of mic energy NOT explained by echo.
   * Returns 1.0 (passthrough) when no reference is available or sample rates mismatch.
   * Returns 0.0 when mic energy is negligible.
   */
  private bargeResidualRatio(input: Float32Array, sampleRate: number): number {
    // No reference or sample rate mismatch → can't detect echo, allow passthrough
    if (this.playbackReferenceSampleRate !== sampleRate || this.playbackReferenceSamples < input.length) {
      return 1;
    }

    let micEnergy = 0;
    for (const sample of input) micEnergy += sample * sample;
    micEnergy /= Math.max(1, input.length);
    if (micEnergy < ENERGY_FLOOR) return 0;

    let bestCorrelation = 0;
    let bestRatio = 1;

    // Search across acoustic delays to find the best echo match
    for (let delayMs = MIN_DELAY_MS; delayMs <= MAX_DELAY_MS; delayMs += DELAY_STEP_MS) {
      const delaySamples = Math.round((delayMs / 1000) * sampleRate);
      const start = this.playbackReferenceSamples - delaySamples - input.length;

      let referenceEnergy = 0;
      let dot = 0;
      for (let index = 0; index < input.length; index++) {
        const reference = this.readPlaybackReference(start + index);
        referenceEnergy += reference * reference;
        dot += input[index] * reference;
      }
      referenceEnergy /= Math.max(1, input.length);
      dot /= Math.max(1, input.length);

      if (referenceEnergy < ENERGY_FLOOR) continue;

      const correlation = Math.abs(dot) / Math.sqrt(referenceEnergy * micEnergy);
      const explained = (dot * dot) / referenceEnergy;
      const ratio = Math.max(0, micEnergy - explained) / micEnergy;

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestRatio = ratio;
      }
    }

    return bestRatio;
  }

  private readPlaybackReference(totalIndex: number): number {
    if (totalIndex < 0 || totalIndex >= this.playbackReferenceSamples) return 0;
    return this.playbackReferenceRing[totalIndex % this.playbackReferenceRing.length] ?? 0;
  }
}
