/**
 * Realtime Provider Abstraction for Multi-Provider Voice APIs
 * 
 * This module defines the interface for connecting to real-time voice API providers
 * (Gemini Live, OpenAI Realtime API, etc.) in the browser/client
 */

import type { ProviderType } from "../types/providers";

/**
 * Provider type identifier
 * Supported providers: Gemini, OpenAI, Grok, and Vowel Prime
 */
export type { ProviderType } from "../types/providers";

/**
 * Realtime provider connection state
 */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

/**
 * Audio format configuration
 */
export interface AudioFormat {
  mimeType: string;
  sampleRate: number;
  channels: number;
  encoding: string;
}

/**
 * Directional audio configuration.
 * Input and output may use different sample rates or encodings.
 */
export interface RealtimeAudioConfig {
  input?: Partial<AudioFormat>;
  output?: Partial<AudioFormat>;
}

/**
 * Realtime provider configuration
 */
export interface RealtimeProviderConfig {
  /** Token/secret for authentication */
  token: string;
  /** Model to use */
  model: string;
  /** Voice to use */
  voice?: string;
  /** Legacy audio format preferences */
  audioFormat?: AudioFormat;
  /** Directional audio format preferences */
  audioConfig?: RealtimeAudioConfig;
  /** Provider-specific metadata */
  metadata?: Record<string, any>;
  /** System instructions for the agent */
  systemInstructions?: string;
  /** Tool definitions for the agent */
  tools?: any[];
}

/**
 * Message types (normalized across providers)
 */
export const RealtimeMessageType = {
  // Session events
  SESSION_CREATED: "session.created",
  SESSION_UPDATED: "session.updated",
  SESSION_TIMEOUT: "session.timeout",
  SESSION_HIBERNATE: "session.hibernate",
  SESSION_RESUME: "session.resumed",
  
  // Audio events
  AUDIO_BUFFER_SPEECH_STARTED: "audio.speech_started",
  AUDIO_BUFFER_SPEECH_STOPPED: "audio.speech_stopped",
  AUDIO_DELTA: "audio.delta",
  AUDIO_DONE: "audio.done",
  AUDIO_INTERRUPTED: "audio.interrupted",
  
  // Response events
  RESPONSE_CREATED: "response.created",
  RESPONSE_DONE: "response.done",
  RESPONSE_CANCELLED: "response.cancelled",
  
  // Transcript events
  TRANSCRIPT_DELTA: "transcript.delta",
  TRANSCRIPT_DONE: "transcript.done",
  
  // Tool/function call events
  TOOL_CALL: "tool.call",
  TOOL_CALL_CANCELLED: "tool.call_cancelled",
  
  // Error events
  ERROR: "error",
} as const;

export type RealtimeMessageType = typeof RealtimeMessageType[keyof typeof RealtimeMessageType];

/**
 * Normalized message structure
 */
export interface RealtimeMessage {
  type: RealtimeMessageType;
  payload: any;
  rawMessage?: any; // Original provider-specific message
}

/**
 * Event callbacks
 */
export interface RealtimeProviderCallbacks {
  onOpen?: () => void;
  onClose?: (reason: string) => void;
  onError?: (error: Error) => void;
  onMessage?: (message: RealtimeMessage) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

/**
 * Abstract base class for realtime providers
 */
export abstract class RealtimeProvider {
  protected config: RealtimeProviderConfig;
  protected callbacks: RealtimeProviderCallbacks;
  protected connectionState: ConnectionState = "disconnected";

  constructor(config: RealtimeProviderConfig, callbacks: RealtimeProviderCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Connect to realtime API
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from realtime API
   */
  abstract disconnect(): Promise<void>;

  /**
   * Send audio data to provider
   * @param audioData - Base64 encoded audio data
   * @param format - Audio format details
   */
  abstract sendAudio(audioData: string, format: AudioFormat): void;

  /**
   * Send text input to provider (if supported)
   * @param text - Text to send
   */
  abstract sendText?(text: string): void;

  /**
   * Send image input to provider (if supported)
   * @param imageUrl - URL or data URI of the image to send
   */
  abstract sendImage?(imageUrl: string): void;

  /**
   * Commit buffered audio (for client-side VAD mode)
   * 
   * Only implemented by providers that support push-to-talk behavior (e.g., Vowel Prime).
   * Called when client-side VAD detects speech end to commit the accumulated audio buffer.
   * 
   * @param concatenatedAudioBuffer - ArrayBuffer containing all concatenated audio chunks
   *                                  from speech start to speech end
   * 
   * @default No-op (not all providers need explicit commit - server VAD handles this automatically)
   */
  commitAudio?(concatenatedAudioBuffer: ArrayBuffer): void;

  /**
   * Send tool response back to provider
   * @param toolCallId - ID of the tool call
   * @param toolName - Name of the tool
   * @param result - Result of tool execution
   */
  abstract sendToolResponse(toolCallId: string, toolName: string, result: any): void;

  /**
   * Interrupt the current assistant response if the provider supports it.
   *
   * Providers that do not need explicit interruption can keep the default no-op.
   */
  interrupt(): void {
    // Optional override
  }

  /**
   * Send session.update event to update session configuration
   * This allows dynamic updates to system instructions and other session settings
   * 
   * @param updates - Session configuration updates (e.g., instructions)
   * 
   * @example
   * ```ts
   * // Update system instructions
   * provider.sendSessionUpdate?.({ 
   *   instructions: 'Updated system prompt with new context' 
   * });
   * ```
   */
  sendSessionUpdate?(updates: { instructions?: string }): void;

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get audio format requirements
   */
  abstract getAudioFormat(): AudioFormat;

  /**
   * Get microphone/input audio format requirements.
   * Defaults to the legacy single-format implementation.
   */
  getInputAudioFormat(): AudioFormat {
    return this.getAudioFormat();
  }

  /**
   * Get speaker/output audio format requirements.
   * Defaults to the legacy single-format implementation.
   */
  getOutputAudioFormat(): AudioFormat {
    return this.getAudioFormat();
  }

  /**
   * Get provider identifier
   */
  abstract getProviderId(): ProviderType;

  /**
   * Update connection state and notify callbacks
   */
  protected updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.callbacks.onConnectionStateChange?.(state);
  }

  /**
   * Normalize provider-specific message to common format
   */
  protected abstract normalizeMessage(rawMessage: any): RealtimeMessage | null;

  /**
   * Check if this provider handles audio input/output internally
   * If true, AudioManager will not be used (e.g., OpenAI SDK handles WebRTC audio)
   * If false, AudioManager will handle audio (e.g., Gemini WebSocket)
   */
  handlesAudioInternally(): boolean {
    return false; // Default: use AudioManager
  }
}
