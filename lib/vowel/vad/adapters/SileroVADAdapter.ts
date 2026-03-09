/**
 * @fileoverview Silero VAD Adapter Implementation using @ricky0123/vad-web
 * 
 * This adapter wraps the @ricky0123/vad-web package which provides a pre-packaged
 * Silero VAD implementation that's already optimized for browser use.
 * 
 * @module @vowel.to/client/vad/adapters
 * @author vowel.to
 * @license Proprietary
 */

import type { VADAdapter, VADConfig, VADState, VADFactory, VADMetadata } from '../';
import { VADRegistry, VADInitializationError, VADEventEmitter } from '../';
import { loadVADWebFromCDN } from '../../utils/cdnLoader';

const VAD_WEB_CDN_VERSION = '0.0.30';

/**
 * Silero VAD Adapter Configuration
 */
export interface SileroVADConfig extends VADConfig {
  /** Positive speech threshold (0-1, default: 0.35) - Lower = more sensitive */
  positiveSpeechThreshold?: number;
  
  /** Negative speech threshold (0-1, default: 0.25) - Lower = keeps speech active longer */
  negativeSpeechThreshold?: number;
  
  /** Pre-speech padding in milliseconds (default: 1500ms = 1.5 seconds)
   * This captures audio before speech is detected to avoid cutting off the beginning of speech.
   * According to MicVAD API docs: https://docs.vad.ricky0123.com/user-guide/api/
   */
  preSpeechPadMs?: number;
  
  /** Minimum speech duration in milliseconds (default: 400ms)
   * Speech segments shorter than this will trigger onVADMisfire instead of onSpeechEnd
   */
  minSpeechMs?: number;
  
  /** Redemption duration in milliseconds (default: 1400ms)
   * Duration of silence before speech is considered ended
   */
  redemptionMs?: number;
}

/**
 * Silero VAD Adapter
 * 
 * Wraps @ricky0123/vad-web for voice activity detection.
 * This adapter emits events from MicVAD callbacks, allowing MicVAD to work
 * independently as intended without requiring frame-by-frame state checking.
 */
export class SileroVADAdapter extends VADEventEmitter implements VADAdapter {
  readonly id = 'silero-vad';
  readonly name = 'Silero VAD';
  readonly version = '5.0.0'; // Updated for V5 model support
  
  private config: SileroVADConfig;
  private state: VADState;
  private initialized = false;
  private vad: any = null; // MicVAD instance
  private isSpeakingFlag = false;
  private mediaStream: MediaStream | null = null; // MediaStream for MicVAD
  private speechStartTime: number = 0; // Track speech start time for duration calculation
  
  constructor(config: Partial<SileroVADConfig> = {}) {
    super();
    this.config = {
      threshold: 0.5,
      minSpeechDurationMs: 250,
      silenceDurationMs: 500,
      positiveSpeechThreshold: 0.35, // More sensitive (was 0.5)
      negativeSpeechThreshold: 0.25, // More sensitive (was 0.35)
      preSpeechPadMs: 3000, // 3 seconds of pre-speech padding (generous buffer)
      minSpeechMs: 200, // Minimum speech duration (more sensitive)
      redemptionMs: 600, // Faster redemption (EnhancedVADManager suffix handles the hangover)
      sampleRate: 16000,
      frameDurationMs: 32,
      ...config
    };
    
    this.state = {
      isSpeechActive: false,
      speechProbability: 0,
      currentSpeechDurationMs: 0,
      totalProcessedMs: 0,
      framesProcessed: 0
    };
  }
  
  /**
   * Initialize the Silero VAD adapter
   * 
   * Note: For MicVAD to work correctly with V5 model, it needs access to the MediaStream.
   * If stream is not provided, MicVAD will create its own stream (may cause duplicate mic access).
   * Call setMediaStream() after initialization if stream becomes available later.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('[SileroVADAdapter] Initializing Silero VAD via @ricky0123/vad-web...');
    
    try {
      // Load @ricky0123/vad-web from CDN (not bundled)
      const { MicVAD, getDefaultRealTimeVADOptions } = await loadVADWebFromCDN();
      
      // Create VAD instance with callbacks
      // CRITICAL for V5: MicVAD handles frame processing internally via AudioWorklet
      // It requires the MediaStream to process audio correctly (512 sample windows at 16kHz)
      // If stream is not provided, MicVAD will create its own (not ideal)
      const vadOptions: any = {
        ...getDefaultRealTimeVADOptions("legacy"),
        // Use CDN for model files
        baseAssetPath: `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${VAD_WEB_CDN_VERSION}/dist/`,
        onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
        positiveSpeechThreshold: this.config.positiveSpeechThreshold ?? 0.35,
        negativeSpeechThreshold: this.config.negativeSpeechThreshold ?? 0.25,
        preSpeechPadMs: this.config.preSpeechPadMs ?? 3000,
        minSpeechMs: this.config.minSpeechMs ?? 200,
        redemptionMs: this.config.redemptionMs ?? 600,
        
        // V5 Model Configuration
        // V5 requires fixed window sizes: 512 samples at 16kHz (32ms windows)
        // MicVAD handles this internally, but we need to ensure correct setup
        // model: "v5",
        ...(this.mediaStream ? {
          // Reuse the caller-provided stream so MicVAD stays on the same
          // RTC/AEC-processed audio path as the rest of the client.
          getStream: async () => this.mediaStream!,
          resumeStream: async () => this.mediaStream!,
          // The shared session stream is owned elsewhere; pausing VAD should
          // not stop tracks and force MicVAD to reacquire an uncancelled mic.
          pauseStream: async () => {},
        } : {}),

        // Callbacks - Emit events instead of just updating state
        
        onSpeechRealStart: () => {
          console.log("[SileroVADAdapter] Detected real speech");
          // Initial speech detection (may be false positive)
          // MicVAD will call onSpeechRealStart if it's confirmed speech
        },
        
        onSpeechStart: () => {
          this.isSpeakingFlag = true;
          this.state.isSpeechActive = true;
          this.speechStartTime = Date.now();
          this.state.currentSpeechDurationMs = 0;
          
          console.log('[SileroVADAdapter] Speech started');
          
          // Emit speech start event
          this.emit('vad:speech:start', {
            timestamp: this.speechStartTime,
            probability: this.config.positiveSpeechThreshold ?? 0.35,
            adapterId: this.id
          });
          
          // Emit state change event
          this.emit('vad:state:change', {
            previousState: { ...this.state, isSpeechActive: false },
            currentState: { ...this.state },
            adapterId: this.id
          });
        },
        
        onSpeechEnd: (_audio: Float32Array) => {
          const timestamp = Date.now();
          const duration = this.speechStartTime > 0 ? timestamp - this.speechStartTime : 0;
          
          this.isSpeakingFlag = false;
          this.state.isSpeechActive = false;
          this.state.currentSpeechDurationMs = duration;
          
          console.log(`[SileroVADAdapter] Speech ended (duration: ${duration}ms)`);
          
          // Emit speech end event
          this.emit('vad:speech:end', {
            timestamp,
            duration,
            adapterId: this.id
          });
          
          // Emit state change event
          this.emit('vad:state:change', {
            previousState: { ...this.state, isSpeechActive: true },
            currentState: { ...this.state },
            adapterId: this.id
          });
          
          // Reset speech start time
          this.speechStartTime = 0;
        },
        
        onVADMisfire: () => {
          this.isSpeakingFlag = false;
          this.state.isSpeechActive = false;
          console.debug('[SileroVADAdapter] VAD misfire (false positive)');
          
          // Emit state change event (speech was cancelled)
          this.emit('vad:state:change', {
            previousState: { ...this.state, isSpeechActive: true },
            currentState: { ...this.state },
            adapterId: this.id
          });
          
          // Reset speech start time
          this.speechStartTime = 0;
        },
      };
      
      this.vad = await MicVAD.new(vadOptions);
      
      this.initialized = true;
      console.log('[SileroVADAdapter] Initialized successfully' + (this.mediaStream ? ' with provided MediaStream' : ' (MicVAD will create its own stream)'));
      
      // Emit ready event
      this.emit('vad:ready', {
        adapterId: this.id,
        adapterName: this.name
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[SileroVADAdapter] Initialization failed:', err);
      throw new VADInitializationError(
        `Failed to initialize Silero VAD: ${err.message}`,
        this.id
      );
    }
  }
  
  /**
   * Set MediaStream for MicVAD
   * 
   * CRITICAL for V5 model: MicVAD needs the MediaStream to process audio correctly.
   * This should be called before initialize() if possible, or MicVAD will create its own stream.
   * 
   * @param stream - MediaStream from microphone
   */
  setMediaStream(stream: MediaStream): void {
    if (this.initialized) {
      console.warn('[SileroVADAdapter] MediaStream set after initialization - MicVAD may have already created its own stream');
      // Could recreate MicVAD with new stream, but that's complex
      // For now, just log a warning
      return;
    }
    this.mediaStream = stream;
    console.log('[SileroVADAdapter] MediaStream set - will be used during initialization');
  }
  
  /**
   * Process audio frame
   * 
   * Note: @ricky0123/vad-web handles audio processing internally via MicVAD.
   * This method is called for compatibility but the actual processing happens
   * in the MicVAD worklet. MicVAD emits events via callbacks, which we forward
   * as adapter events.
   * 
   * For adapters that handle audio internally (like MicVAD), this method may
   * be a no-op. The manager should listen to events instead of checking state.
   */
  processFrame(_frame: Float32Array, _timestamp: number): number | null {
    if (!this.initialized || !this.vad) {
      return null;
    }
    
    // Update state tracking (for compatibility with getState())
    // The actual VAD processing and event emission happens in MicVAD callbacks
    this.state.framesProcessed++;
    this.state.totalProcessedMs += this.config.frameDurationMs;
    
    // Update current speech duration if speaking
    if (this.isSpeakingFlag && this.speechStartTime > 0) {
      this.state.currentSpeechDurationMs = Date.now() - this.speechStartTime;
    }
    
    // Estimate probability based on speaking state
    // MicVAD doesn't expose per-frame probability, so we estimate
    this.state.speechProbability = this.isSpeakingFlag ? 0.8 : 0.1;
    
    return this.state.speechProbability;
  }
  
  configure(config: VADConfig): void {
    this.config = { ...this.config, ...config };
    
    // Warning: MicVAD configuration cannot be changed after initialization
    if (this.initialized && config.hasOwnProperty('preSpeechPadMs')) {
      console.warn('[SileroVADAdapter] preSpeechPadMs changed after initialization - MicVAD instance will not be updated. Reinitialize the adapter to apply changes.');
    }
  }
  
  reset(): void {
    this.isSpeakingFlag = false;
    this.speechStartTime = 0;
    this.state = {
      isSpeechActive: false,
      speechProbability: 0,
      currentSpeechDurationMs: 0,
      totalProcessedMs: 0,
      framesProcessed: 0
    };
  }
  
  dispose(): void {
    if (this.vad) {
      try {
        this.vad.destroy?.();
      } catch (e) {
        console.warn('[SileroVADAdapter] Error destroying VAD:', e);
      }
      this.vad = null;
    }
    this.initialized = false;
    this.removeAllListeners();
  }
  
  isReady(): boolean {
    return this.initialized && this.vad !== null;
  }
  
  getState(): VADState {
    return { ...this.state };
  }
  
  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.isSpeakingFlag;
  }
  
  /**
   * Start VAD processing
   */
  start(): void {
    if (this.vad) {
      this.vad.start();
    }
  }
  
  /**
   * Pause VAD processing
   */
  pause(): void {
    if (this.vad) {
      this.vad.pause();
    }
  }
  
  /**
   * Resume VAD processing
   */
  resume(): void {
    if (this.vad) {
      this.vad.resume();
    }
  }
}

/**
 * Silero VAD Factory
 */
export class SileroVADFactory implements VADFactory {
  create(config?: Partial<SileroVADConfig>): SileroVADAdapter {
    return new SileroVADAdapter(config);
  }
  
  getMetadata(): VADMetadata {
    return {
      id: 'silero-vad',
      name: 'Silero VAD',
      version: '5.0.0',
      description: 'Voice activity detection using @ricky0123/vad-web (Silero VAD V5). Supports 6000+ languages including Korean. Requires MediaStream for proper V5 frame processing (512 sample windows at 16kHz with context handling).',
      supportedSampleRates: [16000],
      supportedFrameDurations: [32], // V5 uses fixed 32ms windows (512 samples at 16kHz)
      requiresWasm: true,
      worksOffline: false, // Requires CDN download
      estimatedMemoryMB: 5, // Model (~2MB for V5) + overhead
      estimatedCpuUsage: 'low'
    };
  }
}

// Auto-register the factory
VADRegistry.register(new SileroVADFactory());

/**
 * Register Silero VAD adapter with VAD Registry
 * 
 * This function ensures the SileroVADAdapter is registered.
 * The adapter auto-registers when the module is imported, but this function
 * can be called explicitly to ensure registration.
 * 
 * @returns void
 */
export function registerSileroVADAdapter(): void {
  if (!VADRegistry.getFactory('silero-vad')) {
    VADRegistry.register(new SileroVADFactory());
  }
}
