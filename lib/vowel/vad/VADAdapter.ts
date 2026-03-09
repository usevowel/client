/**
 * @fileoverview VAD (Voice Activity Detection) Adapter Interface
 * 
 * This module defines the core interfaces and types for implementing
 * Voice Activity Detection in the vowel client library. It provides a
 * modular, plugin-based architecture that allows developers to create
 * and register their own VAD implementations.
 * 
 * Key Components:
 * - VADAdapter: Core interface for VAD implementations
 * - VADConfig: Configuration options for VAD adapters
 * - VADState: Current state of the VAD adapter
 * - VADEvents: Event types emitted by VAD adapters
 * - VADFactory: Factory interface for creating VAD instances
 * - VADRegistry: Central registry for VAD implementations
 * 
 * @module @vowel.to/client/vad
 * @author vowel.to
 * @license Proprietary
 */

/**
 * Configuration options for VAD adapters
 */
export interface VADConfig {
  /** Speech detection threshold (0.0 - 1.0) */
  threshold: number;
  
  /** Minimum speech duration in milliseconds */
  minSpeechDurationMs: number;
  
  /** Silence duration before speech end (ms) */
  silenceDurationMs: number;
  
  /** Audio sample rate in Hz */
  sampleRate: number;
  
  /** Frame duration in milliseconds */
  frameDurationMs: number;
  
  /** Additional provider-specific options */
  [key: string]: any;
}

/**
 * Current state of the VAD adapter
 */
export interface VADState {
  /** Whether VAD is currently detecting speech */
  isSpeechActive: boolean;
  
  /** Current speech probability (0.0 - 1.0) */
  speechProbability: number;
  
  /** Duration of current speech segment in ms */
  currentSpeechDurationMs: number;
  
  /** Total processed audio duration in ms */
  totalProcessedMs: number;
  
  /** Number of frames processed */
  framesProcessed: number;
  
  /** Adapter-specific state information */
  metadata?: Record<string, any>;
}

/**
 * Simple EventEmitter implementation for browser compatibility
 * Used by VAD adapters to emit events
 */
export class VADEventEmitter {
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  /**
   * Register an event listener
   */
  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
    return this;
  }

  /**
   * Emit an event
   */
  emit(event: string, ...args: any[]): boolean {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.length === 0) {
      return false;
    }
    listeners.forEach(listener => listener(...args));
    return true;
  }

  /**
   * Remove all listeners for an event, or all events if none specified
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  /**
   * Remove a specific listener
   */
  off(event: string, listener: (...args: any[]) => void): this {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }
}

/**
 * Interface for Voice Activity Detection implementations
 * 
 * VAD adapters should emit events rather than requiring frame-by-frame state checking.
 * This allows libraries like MicVAD to work independently as intended.
 * 
 * The processFrame() method is still called for compatibility, but adapters should
 * primarily communicate via events. For adapters that process audio internally
 * (like MicVAD), processFrame() may be a no-op.
 */
export interface VADAdapter {
  /**
   * Unique identifier for this VAD implementation
   * Used for registration and configuration
   */
  readonly id: string;
  
  /**
   * Human-readable name of the VAD implementation
   */
  readonly name: string;
  
  /**
   * Version of the VAD implementation
   */
  readonly version: string;
  
  /**
   * Initialize the VAD engine
   * Called once when the adapter is first used
   * @throws VADInitializationError if initialization fails
   */
  initialize(): Promise<void>;
  
  /**
   * Process a single audio frame
   * 
   * Note: For adapters that handle audio internally (like MicVAD), this may be a no-op.
   * Adapters should primarily communicate via events rather than requiring frame-by-frame
   * state checking.
   * 
   * @param frame - Audio frame as Float32Array (typically 16kHz mono)
   * @param timestamp - Frame timestamp in milliseconds
   * @returns Speech probability (0.0 to 1.0) or null if not ready
   */
  processFrame(frame: Float32Array, timestamp: number): number | null;
  
  /**
   * Configure VAD parameters
   * Called when configuration changes
   */
  configure(config: VADConfig): void;
  
  /**
   * Reset VAD state
   * Called when starting a new conversation or clearing buffer
   */
  reset(): void;
  
  /**
   * Release resources and cleanup
   * Called when the adapter is no longer needed
   */
  dispose(): void;
  
  /**
   * Check if the adapter is initialized and ready
   */
  isReady(): boolean;
  
  /**
   * Get current VAD state
   * Note: This is primarily for compatibility. Prefer listening to events.
   */
  getState(): VADState;
  
  /**
   * Register an event listener
   * Adapters should emit events for speech start/end rather than requiring state polling
   */
  on(event: 'vad:speech:start', listener: (data: VADSpeechStartEvent) => void): this;
  on(event: 'vad:speech:end', listener: (data: VADSpeechEndEvent) => void): this;
  on(event: 'vad:speech:progress', listener: (data: VADSpeechProgressEvent) => void): this;
  on(event: 'vad:state:change', listener: (data: VADStateChangeEvent) => void): this;
  on(event: 'vad:ready', listener: (data: VADReadyEvent) => void): this;
  on(event: 'vad:error', listener: (data: VADErrorEvent) => void): this;
  on(event: string, listener: (...args: any[]) => void): this;
  
  /**
   * Remove an event listener
   */
  off(event: string, listener: (...args: any[]) => void): this;
  
  /**
   * Remove all listeners for an event, or all events if none specified
   */
  removeAllListeners(event?: string): this;
}

/**
 * Events emitted by VAD adapters
 * These events are forwarded to the VowelClient event system
 */
export interface VADSpeechStartEvent {
  timestamp: number;
  probability: number;
  adapterId: string;
}

export interface VADSpeechEndEvent {
  timestamp: number;
  duration: number;
  adapterId: string;
}

export interface VADSpeechProgressEvent {
  timestamp: number;
  duration: number;
  probability: number;
  adapterId: string;
}

export interface VADStateChangeEvent {
  previousState: VADState;
  currentState: VADState;
  adapterId: string;
}

export interface VADReadyEvent {
  adapterId: string;
  adapterName: string;
}

export interface VADErrorEvent {
  error: Error;
  adapterId: string;
  recoverable: boolean;
}

/**
 * Union type of all VAD events
 */
export type VADEvent =
  | { type: 'vad:speech:start'; data: VADSpeechStartEvent }
  | { type: 'vad:speech:end'; data: VADSpeechEndEvent }
  | { type: 'vad:speech:progress'; data: VADSpeechProgressEvent }
  | { type: 'vad:state:change'; data: VADStateChangeEvent }
  | { type: 'vad:ready'; data: VADReadyEvent }
  | { type: 'vad:error'; data: VADErrorEvent };

/**
 * Metadata for VAD implementations
 */
export interface VADMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  
  /** Supported sample rates */
  supportedSampleRates: number[];
  
  /** Supported frame durations in ms */
  supportedFrameDurations: number[];
  
  /** Whether the adapter requires WASM/WebGL */
  requiresWasm: boolean;
  
  /** Whether the adapter works offline */
  worksOffline: boolean;
  
  /** Estimated memory usage in MB */
  estimatedMemoryMB: number;
  
  /** Estimated CPU usage (low/medium/high) */
  estimatedCpuUsage: 'low' | 'medium' | 'high';
  
  /** Provider-specific configuration schema */
  configSchema?: Record<string, any>;
}

/**
 * Factory for creating VAD adapter instances
 * Implementations register themselves with the factory
 */
export interface VADFactory {
  /**
   * Create a new VAD adapter instance
   * @param config - VAD configuration
   * @returns VAD adapter instance
   */
  create(config?: Partial<VADConfig>): VADAdapter;
  
  /**
   * Get adapter metadata
   */
  getMetadata(): VADMetadata;
}

/**
 * Error thrown when VAD initialization fails
 */
export class VADInitializationError extends Error {
  adapterId?: string;
  
  constructor(message: string, adapterId?: string) {
    super(message);
    this.name = 'VADInitializationError';
    this.adapterId = adapterId;
  }
}

/**
 * Error thrown when VAD processing fails
 */
export class VADProcessingError extends Error {
  adapterId?: string;
  
  constructor(message: string, adapterId?: string) {
    super(message);
    this.name = 'VADProcessingError';
    this.adapterId = adapterId;
  }
}
