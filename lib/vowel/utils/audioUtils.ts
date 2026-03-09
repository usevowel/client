/**
 * Audio processing utilities for Gemini Live voice agent
 * Handles encoding, decoding, and audio stream processing
 */

/**
 * Encode Uint8Array to base64 string
 * @param data Binary data to encode
 * @returns Base64 encoded string
 */
export function encode(data: Uint8Array): string {
  let binary = "";
  const len = data.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

/**
 * Decode base64 string to Uint8Array
 * @param base64 Base64 encoded string
 * @returns Binary data as Uint8Array
 */
export function decode(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert Float32Array audio data to PCM16 Blob
 * @param float32Array Audio data from AudioBuffer
 * @returns Blob containing PCM16 audio data
 */
export function createBlob(float32Array: Float32Array): Blob {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i++) {
    // Convert Float32 [-1, 1] to Int16 [-32768, 32767]
    const sample = Math.max(-1, Math.min(1, float32Array[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    view.setInt16(i * 2, int16, true); // true for little-endian
  }

  return new Blob([buffer], { type: "audio/pcm" });
}

/**
 * Decode audio data for playback
 * @param audioContext Web Audio API context
 * @param data PCM16 audio data
 * @returns Promise resolving to AudioBuffer
 */
export async function decodeAudioData(
  audioContext: AudioContext,
  data: Uint8Array
): Promise<AudioBuffer> {
  // Create a properly formatted WAV header for the PCM data
  const wavHeader = createWavHeader(data.length, 24000, 1); // 24kHz, mono
  const wavData = new Uint8Array(wavHeader.length + data.length);
  wavData.set(wavHeader, 0);
  wavData.set(data, wavHeader.length);

  return await audioContext.decodeAudioData(wavData.buffer);
}

/**
 * Create WAV file header for PCM data
 * @param dataLength Length of PCM data in bytes
 * @param sampleRate Sample rate in Hz
 * @param numChannels Number of audio channels
 * @returns WAV header as Uint8Array
 */
function createWavHeader(
  dataLength: number,
  sampleRate: number,
  numChannels: number
): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // "RIFF" chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true); // File size - 8
  writeString(view, 8, "WAVE");

  // "fmt " sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // "data" sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true); // Subchunk2Size

  return new Uint8Array(header);
}

/**
 * Write string to DataView
 * @param view DataView to write to
 * @param offset Offset in bytes
 * @param string String to write
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Create an audio worklet processor for real-time audio capture
 * @returns Audio worklet code as string
 */
export function getAudioWorkletCode(): string {
  return `
class AudioCaptureProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input[0]) {
      // Send audio data to main thread
      this.port.postMessage({
        audio: input[0], // Float32Array
      });
    }
    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
`;
}

/**
 * Check if browser supports required audio APIs
 * @returns Object with support flags
 */
export function checkAudioSupport(): {
  audioContext: boolean;
  mediaDevices: boolean;
  audioWorklet: boolean;
} {
  return {
    audioContext: typeof AudioContext !== "undefined" || typeof (window as any).webkitAudioContext !== "undefined",
    mediaDevices: !!navigator.mediaDevices?.getUserMedia,
    audioWorklet: typeof AudioWorkletNode !== "undefined",
  };
}

/**
 * Get audio constraints for microphone capture
 * @returns MediaStreamConstraints for high-quality audio
 */
export function getAudioConstraints(): MediaStreamConstraints {
  return {
    audio: {
      channelCount: 1, // Mono
      sampleRate: 16000, // 16kHz - good for speech
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: false,
  };
}

