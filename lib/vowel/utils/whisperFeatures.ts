/**
 * @fileoverview Whisper Feature Extraction
 * 
 * Implements WhisperFeatureExtractor compatible feature extraction for Smart Turn model.
 * Based on the official Python implementation and Rust reference implementation.
 * 
 * The model expects log mel spectrograms with shape [batch, mel_bins, time_frames] = [1, 80, ~3000]
 * for 8 seconds of audio at 16kHz.
 * 
 * @module @vowel.to/client/utils
 * @author vowel.to
 * @license Proprietary
 */

// Constants matching Whisper feature extractor
const SAMPLE_RATE = 16000;
const N_FFT = 400;
const HOP_LENGTH = 160;
const N_MELS = 80;
const MEL_FLOOR = 1e-10;
const MAX_FREQUENCY = 8000.0;

/**
 * Create Hann window for STFT
 */
function hannWindow(length: number): Float32Array {
  const window = new Float32Array(length);
  for (let n = 0; n < length; n++) {
    window[n] = Math.sin((Math.PI * n) / (length - 1)) ** 2;
  }
  return window;
}

/**
 * Convert Hz to Mel scale
 */
function hzToMel(freq: number): number {
  const F_SP = 200.0 / 3.0;
  const MIN_LOG_HZ = 1000.0;
  const MIN_LOG_MEL = MIN_LOG_HZ / F_SP;
  const LOG_STEP = Math.log(6.4) / 27.0;

  if (freq < MIN_LOG_HZ) {
    return freq / F_SP;
  } else {
    return MIN_LOG_MEL + Math.log(freq / MIN_LOG_HZ) / LOG_STEP;
  }
}

/**
 * Convert Mel scale to Hz
 */
function melToHz(mel: number): number {
  const F_SP = 200.0 / 3.0;
  const MIN_LOG_HZ = 1000.0;
  const MIN_LOG_MEL = MIN_LOG_HZ / F_SP;
  const LOG_STEP = Math.log(6.4) / 27.0;

  if (mel < MIN_LOG_MEL) {
    return mel * F_SP;
  } else {
    return MIN_LOG_HZ * Math.exp(LOG_STEP * (mel - MIN_LOG_MEL));
  }
}

/**
 * Create linear space array
 */
function linspace(start: number, end: number, points: number): Float32Array {
  if (points < 2) {
    return new Float32Array([start]);
  }
  const step = (end - start) / (points - 1);
  const result = new Float32Array(points);
  for (let i = 0; i < points; i++) {
    result[i] = start + i * step;
  }
  return result;
}

/**
 * Build mel filter bank
 * Returns a matrix of shape [N_MELS, freq_bins]
 */
function buildMelFilters(): Float32Array[] {
  const freqBins = (N_FFT / 2) + 1;
  const fftFreqs = linspace(0.0, SAMPLE_RATE / 2.0, freqBins);
  const melPoints = linspace(0.0, hzToMel(MAX_FREQUENCY), N_MELS + 2);
  const filterFreqs = new Float32Array(N_MELS + 2);
  for (let i = 0; i < melPoints.length; i++) {
    filterFreqs[i] = melToHz(melPoints[i]);
  }

  const filters: Float32Array[] = [];
  for (let melIndex = 0; melIndex < N_MELS; melIndex++) {
    const filter = new Float32Array(freqBins);
    const left = filterFreqs[melIndex];
    const center = filterFreqs[melIndex + 1];
    const right = filterFreqs[melIndex + 2];

    for (let bin = 0; bin < freqBins; bin++) {
      const freq = fftFreqs[bin];
      let weight = 0.0;
      if (freq >= left && freq <= center) {
        weight = (freq - left) / (center - left);
      } else if (freq >= center && freq <= right) {
        weight = (right - freq) / (right - center);
      }
      filter[bin] = Math.max(0.0, weight);
    }

    // Normalize filter
    const enorm = 2.0 / (filterFreqs[melIndex + 2] - filterFreqs[melIndex]);
    for (let bin = 0; bin < freqBins; bin++) {
      filter[bin] *= enorm;
    }

    filters.push(filter);
  }

  return filters;
}

// Cache mel filters (they're constant)
let cachedMelFilters: Float32Array[] | null = null;

function getMelFilters(): Float32Array[] {
  if (!cachedMelFilters) {
    cachedMelFilters = buildMelFilters();
  }
  return cachedMelFilters;
}

/**
 * Reflect pad audio signal
 */
function reflectPad(signal: Float32Array, pad: number): Float32Array {
  if (pad === 0) {
    return signal;
  }
  if (signal.length <= pad) {
    throw new Error('Signal must be longer than pad length');
  }

  const padded = new Float32Array(signal.length + 2 * pad);
  
  // Reflect beginning (reverse of signal[1..=pad])
  for (let i = 0; i < pad; i++) {
    padded[i] = signal[pad - i];
  }
  
  // Copy original signal
  padded.set(signal, pad);
  
  // Reflect end (reverse of signal[tail_start..tail_end])
  // Rust: signal[tail_start..tail_end].iter().rev()
  const tailStart = signal.length - pad - 1;
  for (let i = 0; i < pad; i++) {
    // Reverse iteration: signal[tailStart], signal[tailStart+1], ..., signal[tailStart+pad-1]
    padded[signal.length + pad + i] = signal[tailStart + pad - 1 - i];
  }

  return padded;
}

/**
 * Compute power spectrum using DFT
 * Returns magnitude squared for each frequency bin
 */
function computePowerSpectrum(frame: Float32Array, freqBins: number): Float32Array {
  const power = new Float32Array(freqBins);
  const N = N_FFT; // Use original FFT size, not padded size
  
  for (let bin = 0; bin < freqBins; bin++) {
    let real = 0;
    let imag = 0;
    const angleStep = (-2 * Math.PI * bin) / N;
    
    for (let n = 0; n < N; n++) {
      const angle = angleStep * n;
      real += frame[n] * Math.cos(angle);
      imag += frame[n] * Math.sin(angle);
    }
    
    power[bin] = real * real + imag * imag;
  }
  
  return power;
}

/**
 * Compute STFT power spectrum
 * Returns [freq_bins, num_frames]
 */
function stftPower(paddedAudio: Float32Array): Float32Array[] {
  const numFrames = 1 + Math.floor((paddedAudio.length - N_FFT) / HOP_LENGTH);
  const freqBins = (N_FFT / 2) + 1;
  
  const spec: Float32Array[] = [];
  for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
    spec.push(new Float32Array(freqBins));
  }

  const window = hannWindow(N_FFT);

  // Compute STFT using efficient FFT
  // Using radix-2 FFT for better performance than naive DFT
  for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
    const frameStart = frameIdx * HOP_LENGTH;
    const frame = new Float32Array(N_FFT);
    
    // Apply window
    for (let i = 0; i < N_FFT && frameStart + i < paddedAudio.length; i++) {
      frame[i] = paddedAudio[frameStart + i] * window[i];
    }

    // Compute power spectrum using DFT
    const powerSpectrum = computePowerSpectrum(frame, freqBins);
    
    // Copy to output (only need first freqBins)
    for (let bin = 0; bin < freqBins; bin++) {
      spec[frameIdx][bin] = powerSpectrum[bin];
    }
  }

  return spec;
}

/**
 * Apply dynamic range compression to mel spectrogram
 */
function applyDynamicRange(spec: Float32Array[]): void {
  let maxVal = Number.NEGATIVE_INFINITY;
  
  // Apply log10 and find max
  for (let i = 0; i < spec.length; i++) {
    for (let j = 0; j < spec[i].length; j++) {
      const logged = Math.log10(Math.max(spec[i][j], MEL_FLOOR));
      spec[i][j] = logged;
      if (logged > maxVal) {
        maxVal = logged;
      }
    }
  }

  // Apply dynamic range compression
  const floor = maxVal - 8.0;
  for (let i = 0; i < spec.length; i++) {
    for (let j = 0; j < spec[i].length; j++) {
      const clamped = spec[i][j] < floor ? floor : spec[i][j];
      spec[i][j] = (clamped + 4.0) * 0.25;
    }
  }
}

/**
 * Extract Whisper features from audio
 * 
 * Converts raw audio samples to log mel spectrogram compatible with Whisper models.
 * 
 * @param audio - Raw audio samples at 16kHz (Float32Array)
 * @returns Log mel spectrogram with shape [1, N_MELS, time_frames]
 */
export function extractWhisperFeatures(audio: Float32Array): Float32Array {
  // Pad audio with reflection
  const padded = reflectPad(audio, N_FFT / 2);
  
  // Compute STFT power spectrum
  const powerSpec = stftPower(padded);
  
  // Apply mel filter bank
  const melFilters = getMelFilters();
  const numFrames = powerSpec.length;
  const melSpec: Float32Array[] = [];
  
  for (let melIdx = 0; melIdx < N_MELS; melIdx++) {
    const melFrame = new Float32Array(numFrames);
    for (let frameIdx = 0; frameIdx < numFrames; frameIdx++) {
      let sum = 0;
      for (let bin = 0; bin < powerSpec[frameIdx].length; bin++) {
        sum += powerSpec[frameIdx][bin] * melFilters[melIdx][bin];
      }
      melFrame[frameIdx] = sum;
    }
    melSpec.push(melFrame);
  }
  
  // Remove last frame (matching Rust implementation)
  if (melSpec[0].length > 1) {
    for (let i = 0; i < melSpec.length; i++) {
      melSpec[i] = melSpec[i].slice(0, -1);
    }
  }
  
  // Apply dynamic range compression
  applyDynamicRange(melSpec);
  
  // Convert to flat array with shape [1, N_MELS, time_frames]
  const timeFrames = melSpec[0].length;
  const result = new Float32Array(1 * N_MELS * timeFrames);
  
  let idx = 0;
  for (let melIdx = 0; melIdx < N_MELS; melIdx++) {
    for (let frameIdx = 0; frameIdx < timeFrames; frameIdx++) {
      result[idx++] = melSpec[melIdx][frameIdx];
    }
  }
  
  return result;
}

// Expected output frames for 8 second chunk (chunk_length=8 in WhisperFeatureExtractor)
// This matches the official pipecat-ai Smart Turn model which expects [1, 80, 800]
const EXPECTED_FRAMES = 800;

/**
 * Process audio for Smart Turn model
 * 
 * Truncates/pads audio to 8 seconds and extracts Whisper features.
 * Output is padded/truncated to exactly 800 frames to match model expectation.
 * 
 * @param audio - Raw audio samples at 16kHz (Float32Array)
 * @returns Feature tensor ready for ONNX model input with shape [1, 80, 800]
 */
export function processAudioForSmartTurn(audio: Float32Array): Float32Array {
  const targetSamples = 8 * SAMPLE_RATE; // 8 seconds at 16kHz = 128,000 samples
  
  let processedAudio: Float32Array;
  
  if (audio.length > targetSamples) {
    // Truncate from beginning (keep last 8 seconds)
    processedAudio = audio.slice(-targetSamples);
  } else if (audio.length < targetSamples) {
    // Pad with zeros at beginning
    processedAudio = new Float32Array(targetSamples);
    processedAudio.set(audio, targetSamples - audio.length);
  } else {
    processedAudio = audio;
  }
  
  // Extract Whisper features
  const features = extractWhisperFeatures(processedAudio);
  
  // Ensure output is exactly [80, 800] frames to match model expectation
  const actualFrames = features.length / N_MELS;
  
  if (actualFrames === EXPECTED_FRAMES) {
    return features;
  }
  
  // Pad or truncate to 800 frames
  const result = new Float32Array(N_MELS * EXPECTED_FRAMES);
  
  if (actualFrames < EXPECTED_FRAMES) {
    // Pad at beginning (zeros), put actual data at end
    // const offset = (EXPECTED_FRAMES - actualFrames) * N_MELS;
    for (let mel = 0; mel < N_MELS; mel++) {
      for (let frame = 0; frame < actualFrames; frame++) {
        result[mel * EXPECTED_FRAMES + (EXPECTED_FRAMES - actualFrames) + frame] = 
          features[mel * actualFrames + frame];
      }
    }
  } else {
    // Truncate from beginning (keep last 800 frames)
    const skipFrames = actualFrames - EXPECTED_FRAMES;
    for (let mel = 0; mel < N_MELS; mel++) {
      for (let frame = 0; frame < EXPECTED_FRAMES; frame++) {
        result[mel * EXPECTED_FRAMES + frame] = 
          features[mel * actualFrames + skipFrames + frame];
      }
    }
  }
  
  return result;
}
