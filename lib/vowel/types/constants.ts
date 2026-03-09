/**
 * Vowel SDK Constants
 *
 * Note: This library uses HTTP endpoints for all API communication.
 * Convex is no longer used as of v0.2.0.
 */

/**
 * Vowel Platform API URL
 *
 * This is the HTTP API endpoint for the Vowel platform.
 * All Vowel clients connect to this API for voice agent token generation.
 *
 * This URL is managed by the Vowel platform and should not be changed by developers.
 * Configured via VITE_VOWEL_PLATFORM_API_URL environment variable at build time.
 */
export const VOWEL_PLATFORM_API_URL = import.meta.env.VITE_VOWEL_PLATFORM_API_URL || 'https://wooden-herring-934.convex.site';

/**
 * Vowel Platform Token Endpoint
 * 
 * HTTP endpoint for generating ephemeral voice API tokens.
 * Supports multi-provider backend (Gemini Live, OpenAI Realtime).
 */
export const VOWEL_TOKEN_ENDPOINT = `${VOWEL_PLATFORM_API_URL}/vowel/api/generateToken`;

/**
 * Voice agent configuration defaults
 */
export const DEFAULT_VOICE_CONFIG = {
  model: 'gemini-live-2.5-flash-preview',
  voice: 'Orus',
  language: 'en-US',
} as const;

/**
 * Audio configuration constants
 */
export const AUDIO_CONFIG = {
  inputSampleRate: 16000,
  outputSampleRate: 24000,
  encoding: 'LINEAR16',
  bufferSize: 256,
} as const;

/**
 * Audio capture chunking configuration for microphone streaming.
 *
 * Controls how audio is buffered and sent to the server. Smaller chunks =
 * more frequent sends, lower latency, better responsiveness for short phrases
 * (e.g. "yes", "no", "okay"). Larger chunks = fewer sends, slightly less overhead.
 *
 * @see AUDIO_CAPTURE_CONFIG.bufferSize - Samples per chunk at output sample rate (24kHz)
 */
export const AUDIO_CAPTURE_CONFIG = {
  /**
   * Number of samples to accumulate before sending each audio chunk.
   * At 24kHz: 2048 samples ≈ 85ms, 4096 samples ≈ 170ms.
   *
   * - **2048** (default): Smaller chunks, ~2x more frequent. Matches Vowel Engine demo
   *   behavior at 48kHz input. Better for short phrases and server VAD.
   * - **4096**: Larger chunks, original behavior. Slightly less overhead.
   */
  bufferSize: 2048,
} as const;

