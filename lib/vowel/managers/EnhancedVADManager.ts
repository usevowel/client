/**
 * @fileoverview Enhanced VAD Manager - Integrates with VAD Adapter Interface
 * 
 * This is an enhanced version of VADManager that supports the new modular
 * VAD adapter interface while maintaining backward compatibility with the
 * existing VADType-based configuration.
 * 
 * @module @vowel.to/client/managers
 * @author vowel.to
 * @license Proprietary
 */

// Simple EventEmitter implementation for browser compatibility
class EventEmitter {
  private listeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  on(event: string, listener: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.length === 0) {
      return false;
    }
    listeners.forEach(listener => listener(...args));
    return true;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }
}
import type { VADAdapter, VADConfig, VADState } from '../vad';
import { VADRegistry, VADInitializationError, registerSmartTurnAdapter, registerSileroVADAdapter, registerSimpleVADAdapter } from '../vad';
import type { TurnDetectionMode, ClientVADConfig } from '../types';

// Register built-in VAD adapters
registerSmartTurnAdapter();
registerSileroVADAdapter();
registerSimpleVADAdapter();

/**
 * Configuration for the enhanced VAD manager
 */
export interface EnhancedVADManagerConfig {
  /**
   * Turn detection mode
   * @default 'client_vad'
   */
  mode?: TurnDetectionMode;
  
  /**
   * Client VAD configuration (for 'client_vad' mode)
   */
  clientVAD?: ClientVADConfig;
  
  /**
   * MediaStream for VAD adapters that need direct stream access (e.g., MicVAD/Silero VAD)
   * If not provided, adapters may create their own streams (not ideal)
   */
  mediaStream?: MediaStream;
  
  /**
   * Rolling buffer configuration for capturing audio around VAD segments
   * 
   * Note: With MicVAD (Silero VAD), padding is handled internally by the library.
   * This buffer is mainly for compatibility with other VAD adapters.
   */
  rollingBuffer?: {
    /**
     * Duration of audio to capture before speech detection (in milliseconds)
     * @default 3000
     */
    prefixMs?: number;
    
    /**
     * Duration of audio to capture after speech ends (in milliseconds)
     * @default 100
     */
    suffixMs?: number;
  };
  
  /**
   * Enable redundant Simple VAD alongside Silero VAD
   * When enabled, Simple VAD runs in parallel and can pause/cancel Silero VAD
   * if it doesn't detect speech for an extended period while Silero is still detecting speech.
   * @default true for Silero VAD, false otherwise
   */
  enableRedundantSimpleVAD?: boolean;
  
  /**
   * Duration (in milliseconds) that Simple VAD must not detect speech before
   * pausing/cancelling Silero VAD when Silero is still detecting speech.
   * @default 6000 (6 seconds)
   */
  simpleVADSilenceThresholdMs?: number;
  
  /**
   * Called when speech is detected
   */
  onSpeechStart?: () => void;
  
  /**
   * Called when speech ends
   */
  onSpeechEnd?: () => void;
  
  /**
   * Called when VAD is ready to use
   */
  onVADReady?: () => void;
  
  /**
   * Called when VAD encounters an error
   */
  onVADError?: (error: Error) => void;
  
  /**
   * Called when VAD state changes
   */
  onVADStateChange?: (state: VADState) => void;
}

/**
 * Enhanced VAD Manager
 * 
 * Supports both legacy VADType configuration and new modular VAD adapters.
 * This class extends EventEmitter to provide event-based communication.
 * 
 * Features a rolling buffer to capture audio around VAD segments, ensuring
 * we don't miss speech that occurred before or after the VAD detected segment.
 */
export class EnhancedVADManager extends EventEmitter {
  private adapter: VADAdapter | null = null;
  private simpleVADAdapter: VADAdapter | null = null; // Redundant Simple VAD
  private config: EnhancedVADManagerConfig;
  private mode: TurnDetectionMode;
  private isActive: boolean = false;
  private isSpeakingFromEvent: boolean = false; // Track speaking state from events (not state polling)
  private audioBuffer: Float32Array[] = [];
  
  // Rolling buffer for capturing audio before speech detection
  // CRITICAL: MicVAD uses padding internally for detection accuracy, but does NOT
  // expose the padded audio to the application. This rolling buffer captures
  // pre-speech audio that will be sent to the server (required for all adapters).
  private rollingBuffer: Float32Array[] = [];
  private rollingBufferMaxSize: number = 0; // Number of frames to keep
  
  // Suffix buffer for capturing audio after speech ends
  private suffixBuffer: Float32Array[] = [];
  private suffixBufferMaxSize: number = 0; // Number of frames to keep
  private collectingSuffix: boolean = false;
  
  // Simple VAD redundancy tracking
  private enableRedundantSimpleVAD: boolean = false;
  // Increased from 2000ms to 6000ms to prevent false cancellations during natural pauses
  private simpleVADSilenceThresholdMs: number = 500; // 6 seconds
  private lastSimpleVADSpeechTime: number = 0;
  
  constructor(config: EnhancedVADManagerConfig = {}) {
    super();
    this.config = config;
    this.mode = config.mode ?? 'server_vad';
    
    // Calculate rolling buffer sizes based on configuration
    // Priority: config.rollingBuffer > config.clientVAD.rollingBuffer > defaults
    // Prefix (pre-speech): 3000ms to capture speech onset that VAD missed
    // Suffix (post-speech): 100ms for quick response while still catching trailing audio
    const rollingBufferConfig = config.rollingBuffer ?? config.clientVAD?.rollingBuffer;
    const prefixMs = rollingBufferConfig?.prefixMs ?? 3000;
    const suffixMs = rollingBufferConfig?.suffixMs ?? 100;
    
    // Assuming 16kHz sample rate and 30ms frames (480 samples per frame)
    // This will be adjusted based on actual frame size when processing starts
    const frameDurationMs = config.clientVAD?.config?.frameDurationMs ?? 30;
    this.rollingBufferMaxSize = Math.ceil(prefixMs / frameDurationMs);
    this.suffixBufferMaxSize = Math.ceil(suffixMs / frameDurationMs);
    
    // Configure redundant Simple VAD
    // Enable by default for Silero VAD, disabled for others
    this.enableRedundantSimpleVAD = config.enableRedundantSimpleVAD ?? 
      (config.clientVAD?.adapter === 'silero-vad');
    this.simpleVADSilenceThresholdMs = config.simpleVADSilenceThresholdMs ?? 500;
    
    console.log(`[EnhancedVADManager] Rolling buffer configured: ${this.rollingBufferMaxSize} frames (${prefixMs}ms) prefix, ${this.suffixBufferMaxSize} frames (${suffixMs}ms) suffix`);
    if (this.enableRedundantSimpleVAD) {
      console.log(`[EnhancedVADManager] Redundant Simple VAD enabled (silence threshold: ${this.simpleVADSilenceThresholdMs}ms)`);
    }
  }
  
  /**
   * Initialize VAD based on the configured mode
   */
  async initialize(): Promise<void> {
    if (this.isActive) {
      console.warn('[EnhancedVADManager] VAD already initialized');
      return;
    }
    
    try {
      console.log(`[EnhancedVADManager] Initializing VAD (mode: ${this.mode})...`);
      
      switch (this.mode) {
        case 'disabled':
          await this.initializeDisabledMode();
          break;
        case 'client_vad':
          await this.initializeClientVAD();
          break;
        case 'server_vad':
        case 'semantic_vad':
          // Server-side VAD - no client initialization needed
          this.isActive = true;
          console.log('[EnhancedVADManager] Server VAD mode - no client initialization needed');
          this.config.onVADReady?.();
          this.emit('vad:ready', { adapterId: 'server', adapterName: 'Server VAD' });
          break;
        default:
          throw new VADInitializationError(`Unknown VAD mode: ${this.mode}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[EnhancedVADManager] Failed to initialize VAD:', err);
      this.config.onVADError?.(err);
      this.emit('vad:error', { error: err, adapterId: this.adapter?.id, recoverable: false });
      throw err;
    }
  }
  
  /**
   * Initialize disabled mode (no VAD)
   */
  private async initializeDisabledMode(): Promise<void> {
    console.log('[EnhancedVADManager] VAD disabled - relying on manual control');
    this.isActive = true;
    this.config.onVADReady?.();
    this.emit('vad:ready', { adapterId: 'disabled', adapterName: 'Disabled' });
  }
  
  /**
   * Initialize client-side VAD with adapter
   */
  private async initializeClientVAD(): Promise<void> {
    const clientVADConfig = this.config.clientVAD;
    if (!clientVADConfig) {
      throw new VADInitializationError('Client VAD mode requires clientVAD configuration');
    }
    
    const factory = VADRegistry.getFactory(clientVADConfig.adapter);
    if (!factory) {
      throw new VADInitializationError(
        `VAD adapter '${clientVADConfig.adapter}' not found. ` +
        `Make sure it's registered with VADRegistry.`,
        clientVADConfig.adapter
      );
    }
    
    // Create adapter with configuration
    const vadConfig: Partial<VADConfig> = {
      threshold: 0.5,
      minSpeechDurationMs: 200,
      silenceDurationMs: 500,
      sampleRate: 16000,
      frameDurationMs: 30,
      ...clientVADConfig.config
    };
    
    this.adapter = factory.create(vadConfig);
    
    // For Silero VAD (MicVAD), pass MediaStream if available
    // CRITICAL: MicVAD needs the stream for V5 model to process audio correctly
    // (512 sample windows at 16kHz with proper context handling)
    if (clientVADConfig.adapter === 'silero-vad' && this.config.mediaStream) {
      if ('setMediaStream' in this.adapter && typeof (this.adapter as any).setMediaStream === 'function') {
        (this.adapter as any).setMediaStream(this.config.mediaStream);
        console.log('[EnhancedVADManager] MediaStream passed to Silero VAD adapter');
      }
    }
    
    // Set up event listeners BEFORE initialization
    // Adapters now emit events instead of requiring frame-by-frame state checking
    this.setupAdapterEventListeners();
    
    // Initialize the adapter
    await this.adapter.initialize();
    
    // Initialize redundant Simple VAD if enabled
    if (this.enableRedundantSimpleVAD && clientVADConfig.adapter === 'silero-vad') {
      const simpleVADFactory = VADRegistry.getFactory('simple-vad');
      if (simpleVADFactory) {
        this.simpleVADAdapter = simpleVADFactory.create({
          energyThreshold: 0.15,
          redemptionFrames: 8,
          sampleRate: 16000,
          frameDurationMs: 30,
        });
        await this.simpleVADAdapter.initialize();
        console.log('[EnhancedVADManager] Redundant Simple VAD initialized');
      } else {
        console.warn('[EnhancedVADManager] Simple VAD factory not found - redundant VAD disabled');
        this.enableRedundantSimpleVAD = false;
      }
    }
    
    this.isActive = true;
    console.log(`[EnhancedVADManager] Client VAD initialized (${this.adapter.name})`);
    
    this.config.onVADReady?.();
    this.emit('vad:ready', { 
      adapterId: this.adapter.id, 
      adapterName: this.adapter.name 
    });
  }
  
  /**
   * Set up event listeners for the VAD adapter
   * Adapters now emit events instead of requiring frame-by-frame state checking
   */
  private setupAdapterEventListeners(): void {
    if (!this.adapter) return;
    
    // Type assertion: adapters extend VADEventEmitter and implement event methods
    // Using 'any' here because TypeScript doesn't properly infer the overloaded 'on' method
    const adapter = this.adapter as any;
    
    // Listen for speech start events
    adapter.on('vad:speech:start', (data: { timestamp: number; probability: number; adapterId: string }) => {
      this.handleSpeechStart(data.timestamp, data.probability);
    });
    
    // Listen for speech end events
    adapter.on('vad:speech:end', (data: { timestamp: number; duration: number; adapterId: string }) => {
      this.handleSpeechEnd(data.timestamp, data.duration);
    });
    
    // Listen for state change events
    adapter.on('vad:state:change', (data: { previousState: VADState; currentState: VADState; adapterId: string }) => {
      this.config.onVADStateChange?.(data.currentState);
      this.emit('vad:state:change', data);
    });
    
    // Listen for adapter errors
    adapter.on('vad:error', (data: { error: Error; adapterId: string; recoverable: boolean }) => {
      console.error('[EnhancedVADManager] Adapter error:', data.error);
      this.config.onVADError?.(data.error);
      this.emit('vad:error', data);
    });
  }
  
  /**
   * Handle speech start event from adapter
   */
  private handleSpeechStart(timestamp: number, probability: number): void {
    // Transfer rolling buffer to audio buffer
    const frameDurationMs = this.config.clientVAD?.config?.frameDurationMs ?? 30;
    const preSpeechDurationMs = this.rollingBuffer.length * frameDurationMs;
    console.log(`[EnhancedVADManager] Speech started (event) - including ${this.rollingBuffer.length} frames (${preSpeechDurationMs}ms) of pre-speech audio`);
    
    // Mark that we're speaking (based on event, not state polling)
    this.isSpeakingFromEvent = true;
    
    this.config.onSpeechStart?.();
    this.emit('vad:speech:start', {
      timestamp,
      probability,
      adapterId: this.adapter!.id
    });
    
    // Start buffering audio with the rolling buffer content
    this.audioBuffer = [...this.rollingBuffer];
    this.rollingBuffer = [];
    this.collectingSuffix = false;
    this.suffixBuffer = [];
  }
  
  /**
   * Handle speech end event from adapter
   */
  private handleSpeechEnd(timestamp: number, duration: number): void {
    // Mark that we're no longer speaking (based on event)
    this.isSpeakingFromEvent = false;
    
    // Start suffix collection if configured
    if (this.suffixBufferMaxSize > 0) {
      console.log('[EnhancedVADManager] Speech ended (event) - starting suffix collection');
      this.collectingSuffix = true;
      this.suffixBuffer = [];
    } else {
      // No suffix padding - commit immediately
      console.log('[EnhancedVADManager] Speech ended (event, no suffix padding)');
      this.config.onSpeechEnd?.();
      this.emit('vad:speech:end', {
        timestamp,
        duration,
        adapterId: this.adapter!.id
      });
      
      if (this.audioBuffer.length > 0 && this.config.clientVAD?.autoCommit !== false) {
        console.log(`[EnhancedVADManager] Committing ${this.audioBuffer.length} frames of audio`);
        this.commitAudioBuffer();
      }
      this.collectingSuffix = false;
      this.suffixBuffer = [];
    }
  }
  
  /**
   * Process audio frame
   * Called by AudioWorklet for every frame when in client_vad mode
   * 
   * This method now only buffers audio. VAD adapters emit events instead of
   * requiring frame-by-frame state checking. The manager listens to adapter events
   * and trims audio accordingly.
   */
  processFrame(frame: Float32Array, timestamp: number): void {
    if (!this.isActive || this.mode !== 'client_vad' || !this.adapter) {
      return;
    }
    
    try {
      // Process frame with adapter (may be a no-op for adapters like MicVAD that handle audio internally)
      // We still call this for compatibility, but the adapter emits events instead of requiring state checks
      this.adapter.processFrame(frame, timestamp);
      
      // Process frame with Simple VAD if enabled (for redundancy check)
      if (this.simpleVADAdapter && this.enableRedundantSimpleVAD) {
        const simpleProbability = this.simpleVADAdapter.processFrame(frame, timestamp);
        if (simpleProbability !== null) {
          const simpleVADState = this.simpleVADAdapter.getState();
          
          // Update last speech time if Simple VAD detects speech
          if (simpleVADState.isSpeechActive) {
            this.lastSimpleVADSpeechTime = timestamp;
          }
          
          // Initialize on first frame if not already set
          if (this.lastSimpleVADSpeechTime === 0) {
            this.lastSimpleVADSpeechTime = timestamp;
          }
          
          // Check if Simple VAD should cancel Silero VAD (safety mechanism)
          // This is still checked frame-by-frame since Simple VAD doesn't emit events
          const adapterState = this.adapter.getState();
          if (adapterState.isSpeechActive && 
              !simpleVADState.isSpeechActive &&
              this.lastSimpleVADSpeechTime > 0) {
            const timeSinceSimpleVADSpeech = timestamp - this.lastSimpleVADSpeechTime;
            
            if (timeSinceSimpleVADSpeech > this.simpleVADSilenceThresholdMs &&
                adapterState.currentSpeechDurationMs > this.simpleVADSilenceThresholdMs) {
              console.warn(`[EnhancedVADManager] Silero VAD stuck detecting speech (${adapterState.currentSpeechDurationMs}ms) but Simple VAD detected no speech for ${timeSinceSimpleVADSpeech}ms - cancelling Silero VAD`);
              
              // Reset Silero VAD state
              this.adapter.reset();
              
              // Emit cancellation event
              this.emit('vad:speech:cancelled', {
                timestamp,
                reason: 'silero_vad_stuck_no_speech',
                adapterId: this.adapter.id
              });
              
              // Clear any buffered audio (it was a false positive)
              this.audioBuffer = [];
              this.rollingBuffer = [];
              this.suffixBuffer = [];
              this.collectingSuffix = false;
              this.isSpeakingFromEvent = false;
              
              return; // Don't process this frame further
            }
          }
        }
      }
      
      // Get current state for buffering logic (but don't check for transitions - events handle that)
      const state = this.adapter.getState();
      
      // Use event-based speaking flag OR state-based flag (events are authoritative)
      // This handles race conditions where events fire before state is updated
      const isSpeaking = this.isSpeakingFromEvent || state.isSpeechActive;
      
      // CRITICAL: Handle speech resumption during suffix collection (prevents sentence fragmentation)
      // If we were collecting suffix audio (post-speech padding) but speech resumed,
      // merge the suffix back into the main buffer and continue the same utterance.
      if (this.collectingSuffix && isSpeaking) {
        const frameDurationMs = this.config.clientVAD?.config?.frameDurationMs ?? 30;
        const suffixDurationMs = this.suffixBuffer.length * frameDurationMs;
        console.log(`[EnhancedVADManager] Speech resumed during suffix collection - merging ${this.suffixBuffer.length} frames (${suffixDurationMs}ms) back into utterance`);
        
        // Merge suffix frames back into main audio buffer (keeps continuity)
        if (this.suffixBuffer.length > 0) {
          this.audioBuffer.push(...this.suffixBuffer);
        }
        this.suffixBuffer = [];
        this.collectingSuffix = false;
        this.isSpeakingFromEvent = true; // Mark as speaking again
      }
      
      // Handle rolling buffer (always active to capture pre-speech audio)
      // CRITICAL: MicVAD uses padding internally for detection, but does NOT expose
      // the padded audio to the application. We must maintain our own rolling buffer
      // to capture pre-speech audio for transmission to the server.
      if (!isSpeaking && !this.collectingSuffix) {
        // Not speaking and not collecting suffix - maintain rolling buffer
        // This captures audio before speech is detected (pre-speech padding)
        this.rollingBuffer.push(new Float32Array(frame)); // Clone the frame
        
        // Keep rolling buffer at max size
        if (this.rollingBuffer.length > this.rollingBufferMaxSize) {
          this.rollingBuffer.shift(); // Remove oldest frame
        }
      }
      
      // Buffer audio when speech is active (use event flag OR state flag)
      if (isSpeaking) {
        this.audioBuffer.push(new Float32Array(frame)); // Clone the frame
        
        // Clear rolling buffer during speech (it's been transferred to audioBuffer)
        this.rollingBuffer = [];
      }
      
      // Collect suffix audio after speech ends (post-speech padding)
      if (this.collectingSuffix && !isSpeaking) {
        this.suffixBuffer.push(new Float32Array(frame)); // Clone the frame
        
        // Once we've collected enough suffix audio, finalize the turn
        if (this.suffixBuffer.length >= this.suffixBufferMaxSize) {
          const frameDurationMs = this.config.clientVAD?.config?.frameDurationMs ?? 30;
          const suffixDurationMs = this.suffixBuffer.length * frameDurationMs;
          const totalFrames = this.audioBuffer.length + this.suffixBuffer.length;
          const totalDurationMs = totalFrames * frameDurationMs;
          console.log(`[EnhancedVADManager] Suffix collection complete (${this.suffixBuffer.length} frames, ${suffixDurationMs}ms) - finalizing turn (total: ${totalFrames} frames, ${totalDurationMs}ms)`);
          
          // Add suffix frames to audio buffer
          this.audioBuffer.push(...this.suffixBuffer);
          
          // Emit speech:end event (deferred from when adapter first detected end)
          this.config.onSpeechEnd?.();
          this.emit('vad:speech:end', {
            timestamp,
            duration: totalDurationMs,
            adapterId: this.adapter.id
          });
          
          // Commit buffered audio if autoCommit is enabled
          if (this.config.clientVAD?.autoCommit !== false) {
            this.commitAudioBuffer();
          }
          
          // Reset suffix collection
          this.collectingSuffix = false;
          this.suffixBuffer = [];
          this.isSpeakingFromEvent = false; // Clear speaking flag
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[EnhancedVADManager] Error processing frame:', err);
      this.emit('vad:error', { 
        error: err, 
        adapterId: this.adapter?.id, 
        recoverable: true 
      });
    }
  }
  
  /**
   * Commit the current audio buffer
   * Called when speech ends (if autoCommit is enabled) or manually
   */
  commitAudioBuffer(): Float32Array | null {
    if (this.audioBuffer.length === 0) {
      return null;
    }
    
    // Concatenate buffered audio
    const totalLength = this.audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);
    const audio = new Float32Array(totalLength);
    let offset = 0;
    
    for (const chunk of this.audioBuffer) {
      audio.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Clear buffer
    this.audioBuffer = [];
    
    // Emit commit event
    this.emit('audio:commit', { audio });
    
    return audio;
  }
  
  /**
   * Get current VAD state
   */
  getState(): VADState | null {
    if (this.mode === 'client_vad' && this.adapter) {
      return this.adapter.getState();
    }
    return null;
  }
  
  /**
   * Check if VAD is initialized and active
   */
  isInitialized(): boolean {
    return this.isActive;
  }
  
  /**
   * Check if currently in speech
   */
  isSpeaking(): boolean {
    if (this.mode === 'client_vad' && this.adapter) {
      return this.adapter.getState().isSpeechActive;
    }
    return false;
  }
  
  /**
   * Get current mode
   */
  getMode(): TurnDetectionMode {
    return this.mode;
  }
  
  /**
   * Reset VAD state
   */
  reset(): void {
    this.adapter?.reset();
    this.simpleVADAdapter?.reset();
    this.audioBuffer = [];
    this.rollingBuffer = [];
    this.suffixBuffer = [];
    this.collectingSuffix = false;
    this.isSpeakingFromEvent = false;
    this.lastSimpleVADSpeechTime = 0;
  }
  
  /**
   * Dispose VAD resources
   */
  dispose(): void {
    if (!this.isActive) {
      return;
    }
    
    console.log('[EnhancedVADManager] Disposing VAD...');
    
    // Dispose adapter if present
    if (this.adapter) {
      this.adapter.dispose();
      this.adapter = null;
    }
    
    // Dispose Simple VAD adapter if present
    if (this.simpleVADAdapter) {
      this.simpleVADAdapter.dispose();
      this.simpleVADAdapter = null;
    }
    
    this.isActive = false;
    this.isSpeakingFromEvent = false;
    this.audioBuffer = [];
    this.rollingBuffer = [];
    this.suffixBuffer = [];
    this.collectingSuffix = false;
    this.lastSimpleVADSpeechTime = 0;
    
    // Remove all listeners
    this.removeAllListeners();
    
    console.log('[EnhancedVADManager] VAD disposed');
  }
  
  /**
   * Pause VAD processing
   */
  pause(): void {
    if (!this.isActive) {
      return;
    }
    
    console.log('[EnhancedVADManager] VAD paused');
    // In client_vad mode, we just stop processing frames
    // The adapter remains initialized
  }
  
  /**
   * Resume VAD processing
   */
  resume(): void {
    if (!this.isActive) {
      return;
    }
    
    console.log('[EnhancedVADManager] VAD resumed');
    // In client_vad mode, we resume processing frames
  }
}

// Export event types for TypeScript
export interface EnhancedVADManager {
  on(event: 'vad:ready', listener: (data: { adapterId: string; adapterName: string }) => void): this;
  on(event: 'vad:speech:start', listener: (data: { timestamp: number; probability: number; adapterId: string }) => void): this;
  on(event: 'vad:speech:end', listener: (data: { timestamp: number; duration: number; adapterId: string }) => void): this;
  on(event: 'vad:speech:progress', listener: (data: { timestamp: number; duration: number; probability: number; adapterId: string }) => void): this;
  on(event: 'vad:speech:cancelled', listener: (data: { timestamp: number; reason: string; adapterId: string }) => void): this;
  on(event: 'vad:state:change', listener: (data: { previousState: VADState; currentState: VADState; adapterId: string }) => void): this;
  on(event: 'vad:error', listener: (data: { error: Error; adapterId?: string; recoverable: boolean }) => void): this;
  on(event: 'audio:commit', listener: (data: { audio: Float32Array }) => void): this;
  
  emit(event: 'vad:ready', data: { adapterId: string; adapterName: string }): boolean;
  emit(event: 'vad:speech:start', data: { timestamp: number; probability: number; adapterId: string }): boolean;
  emit(event: 'vad:speech:end', data: { timestamp: number; duration: number; adapterId: string }): boolean;
  emit(event: 'vad:speech:progress', data: { timestamp: number; duration: number; probability: number; adapterId: string }): boolean;
  emit(event: 'vad:speech:cancelled', data: { timestamp: number; reason: string; adapterId: string }): boolean;
  emit(event: 'vad:state:change', data: { previousState: VADState; currentState: VADState; adapterId: string }): boolean;
  emit(event: 'vad:error', data: { error: Error; adapterId?: string; recoverable: boolean }): boolean;
  emit(event: 'audio:commit', data: { audio: Float32Array }): boolean;
}
