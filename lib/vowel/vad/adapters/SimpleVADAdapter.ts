/**
 * @fileoverview Simple VAD Adapter Implementation - Energy-based VAD
 * 
 * This adapter provides a lightweight, energy-based voice activity detection
 * that runs alongside more sophisticated VADs (like Silero) as a redundant
 * check. It uses RMS (Root Mean Square) energy analysis to detect speech.
 * 
 * @module @vowel.to/client/vad/adapters
 * @author vowel.to
 * @license Proprietary
 */

import type { VADAdapter, VADConfig, VADState, VADFactory, VADMetadata } from '../';
import { VADRegistry, VADEventEmitter } from '../';

/**
 * Simple VAD Adapter Configuration
 */
export interface SimpleVADConfig extends VADConfig {
  /** Energy threshold for speech detection (0-1, default: 0.15) */
  energyThreshold?: number;
  
  /** Minimum duration of silence (in frames) before speech is considered ended (default: 8) */
  redemptionFrames?: number;
}

/**
 * Simple VAD Adapter
 * 
 * Energy-based voice activity detection using RMS analysis.
 * Fast, lightweight, requires no model downloads, but less accurate than ML-based VADs.
 * 
 * This adapter is designed to run alongside Silero VAD as a redundant check.
 * If Simple VAD doesn't detect speech for an extended period while Silero VAD
 * is still detecting speech, it can signal that Silero VAD should be paused/cancelled.
 */
export class SimpleVADAdapter extends VADEventEmitter implements VADAdapter {
  readonly id = 'simple-vad';
  readonly name = 'Simple VAD (Energy-based)';
  readonly version = '1.0.0';
  
  private config: SimpleVADConfig;
  private state: VADState;
  private initialized = false;
  
  private isSpeakingFlag = false;
  private silenceFrames = 0;
  private lastSpeechFrameTime = 0;
  
  constructor(config: Partial<SimpleVADConfig> = {}) {
    super();
    this.config = {
      threshold: 0.5,
      minSpeechDurationMs: 200,
      silenceDurationMs: 500,
      energyThreshold: 0.15,
      // Increased from 8 (~240ms) to 50 (~1500ms) to avoid cutting off speech
      // EnhancedVADManager adds additional suffix padding on top of this
      redemptionFrames: 50,
      sampleRate: 16000,
      frameDurationMs: 30,
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
   * Initialize the Simple VAD adapter
   * 
   * Note: Simple VAD requires no initialization - it's ready immediately
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('[SimpleVADAdapter] Initializing Simple VAD (energy-based)...');
    
    // Simple VAD requires no model loading or setup
    this.initialized = true;
    console.log('[SimpleVADAdapter] Initialized successfully');
    
    // Emit ready event
    this.emit('vad:ready', {
      adapterId: this.id,
      adapterName: this.name
    });
  }
  
  /**
   * Process audio frame using energy-based detection
   * 
   * @param frame - Audio frame as Float32Array (typically 16kHz mono)
   * @param timestamp - Frame timestamp in milliseconds
   * @returns Speech probability (0.0 to 1.0) or null if not ready
   */
  processFrame(frame: Float32Array, timestamp: number): number | null {
    if (!this.initialized) {
      return null;
    }
    
    // Calculate RMS (Root Mean Square) energy
    const energy = this.calculateRMS(frame);
    
    // Normalize energy to 0-1 range (assuming max RMS is around 0.5 for typical speech)
    // This is an approximation - actual normalization depends on input levels
    const normalizedEnergy = Math.min(energy * 2, 1.0);
    
    // Calculate speech probability based on energy threshold
    const energyThreshold = this.config.energyThreshold ?? 0.15;
    const hasSpeech = normalizedEnergy > energyThreshold;
    
    // Update state
    this.state.framesProcessed++;
    this.state.totalProcessedMs += this.config.frameDurationMs;
    
    if (hasSpeech) {
      // Reset silence counter
      this.silenceFrames = 0;
      this.lastSpeechFrameTime = timestamp;
      
      // Trigger speech start if not already speaking
      if (!this.isSpeakingFlag) {
        const previousState = { ...this.state };
        this.isSpeakingFlag = true;
        this.state.isSpeechActive = true;
        this.state.currentSpeechDurationMs = 0;
        console.log('[SimpleVADAdapter] Speech started (energy detected)');
        
        // Emit speech start event
        this.emit('vad:speech:start', {
          timestamp,
          probability: this.state.speechProbability,
          adapterId: this.id
        });
        
        // Emit state change event
        this.emit('vad:state:change', {
          previousState,
          currentState: { ...this.state },
          adapterId: this.id
        });
      } else {
        // Update speech duration
        this.state.currentSpeechDurationMs += this.config.frameDurationMs;
      }
      
      // Set probability based on how much energy exceeds threshold
      const excessEnergy = Math.min((normalizedEnergy - energyThreshold) / (1.0 - energyThreshold), 1.0);
      this.state.speechProbability = 0.5 + (excessEnergy * 0.5); // Range: 0.5 to 1.0
    } else {
      // Increment silence counter
      if (this.isSpeakingFlag) {
        this.silenceFrames++;
        
        // Check if silence duration exceeds redemption threshold
        const redemptionFrames = this.config.redemptionFrames ?? 8;
        if (this.silenceFrames >= redemptionFrames) {
          const previousState = { ...this.state };
          const duration = this.state.currentSpeechDurationMs;
          this.isSpeakingFlag = false;
          this.state.isSpeechActive = false;
          this.silenceFrames = 0;
          this.state.currentSpeechDurationMs = 0;
          console.log('[SimpleVADAdapter] Speech ended (silence detected)');
          
          // Emit speech end event
          this.emit('vad:speech:end', {
            timestamp,
            duration,
            adapterId: this.id
          });
          
          // Emit state change event
          this.emit('vad:state:change', {
            previousState,
            currentState: { ...this.state },
            adapterId: this.id
          });
        } else {
          // Still in redemption period - update duration
          this.state.currentSpeechDurationMs += this.config.frameDurationMs;
          // Gradually decrease probability during silence
          const silenceRatio = this.silenceFrames / redemptionFrames;
          this.state.speechProbability = 0.5 * (1.0 - silenceRatio);
        }
      } else {
        // Not speaking - low probability
        this.state.speechProbability = normalizedEnergy * 0.3; // Range: 0.0 to 0.3
      }
    }
    
    return this.state.speechProbability;
  }
  
  /**
   * Calculate RMS (Root Mean Square) energy from audio samples
   * 
   * @param samples - Audio samples as Float32Array
   * @returns RMS energy value
   */
  private calculateRMS(samples: Float32Array): number {
    if (samples.length === 0) {
      return 0;
    }
    
    let sum = 0;
    
    // Calculate sum of squares
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      sum += sample * sample;
    }
    
    // Calculate mean and return square root
    const mean = sum / samples.length;
    return Math.sqrt(mean);
  }
  
  configure(config: VADConfig): void {
    this.config = { ...this.config, ...config };
  }
  
  reset(): void {
    this.isSpeakingFlag = false;
    this.silenceFrames = 0;
    this.lastSpeechFrameTime = 0;
    this.state = {
      isSpeechActive: false,
      speechProbability: 0,
      currentSpeechDurationMs: 0,
      totalProcessedMs: 0,
      framesProcessed: 0
    };
  }
  
  dispose(): void {
    // Simple VAD has no resources to dispose
    this.initialized = false;
    this.reset();
    this.removeAllListeners();
  }
  
  isReady(): boolean {
    return this.initialized;
  }
  
  getState(): VADState {
    return { ...this.state };
  }
  
  /**
   * Check if currently detecting speech
   */
  isSpeaking(): boolean {
    return this.isSpeakingFlag;
  }
  
  /**
   * Get time since last speech detection (in milliseconds)
   * Returns 0 if currently speaking
   */
  getTimeSinceLastSpeech(currentTimestamp: number): number {
    if (this.isSpeakingFlag) {
      return 0;
    }
    return this.lastSpeechFrameTime > 0 ? currentTimestamp - this.lastSpeechFrameTime : Infinity;
  }
}

/**
 * Simple VAD Factory
 */
export class SimpleVADFactory implements VADFactory {
  create(config?: Partial<SimpleVADConfig>): SimpleVADAdapter {
    return new SimpleVADAdapter(config);
  }
  
  getMetadata(): VADMetadata {
    return {
      id: 'simple-vad',
      name: 'Simple VAD (Energy-based)',
      version: '1.0.0',
      description: 'Lightweight energy-based voice activity detection using RMS analysis',
      supportedSampleRates: [16000],
      supportedFrameDurations: [30, 32],
      requiresWasm: false,
      worksOffline: true,
      estimatedMemoryMB: 0.1,
      estimatedCpuUsage: 'low'
    };
  }
}

// Auto-register the factory
VADRegistry.register(new SimpleVADFactory());

/**
 * Register Simple VAD adapter with VAD Registry
 * 
 * This function ensures the SimpleVADAdapter is registered.
 * The adapter auto-registers when the module is imported, but this function
 * can be called explicitly to ensure registration.
 * 
 * @returns void
 */
export function registerSimpleVADAdapter(): void {
  if (!VADRegistry.getFactory('simple-vad')) {
    VADRegistry.register(new SimpleVADFactory());
  }
}
