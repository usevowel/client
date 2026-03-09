/**
 * @fileoverview Typing Sound Manager - Plays filler typing/clicking sounds during AI thinking state
 * 
 * This file contains the `TypingSoundManager` class which manages client-side playback
 * of typing and clicking filler sounds during AI thinking states. These sounds provide
 * audio feedback to users while the AI is processing, improving perceived responsiveness.
 * 
 * Responsibilities:
 * - Load typing/clicking sound files from CDN (assets.vowel.to)
 * - Play randomized typing/clicking segments during isAIThinking state
 * - Stop immediately when thinking state ends or AI starts speaking
 * - Integrate with AudioManager for playback
 * - Handle sound file caching and error recovery
 * 
 * @module @vowel.to/client/managers
 * @author vowel.to
 * @license Proprietary
 */

import type { AudioManager } from './AudioManager';

/**
 * Typing sound configuration
 */
export interface TypingSoundConfig {
  /** Enable typing sounds (default: true) */
  enabled: boolean;
  /** Volume multiplier (0.0 to 1.0, default: 0.3) */
  volume: number;
  /** Typing sound URL (default: assets.vowel.to/typing-sound.pcm) */
  typingSoundUrl: string;
  /** Click sound URL (default: assets.vowel.to/mouse-click-sound.pcm) */
  clickSoundUrl?: string;
  /** Minimum segment duration in ms (default: 200) */
  minSegmentDurationMs: number;
  /** Maximum segment duration in ms (default: 800) */
  maxSegmentDurationMs: number;
  /** Minimum pause duration in ms (default: 300) */
  minPauseDurationMs: number;
  /** Maximum pause duration in ms (default: 1500) */
  maxPauseDurationMs: number;
  /** Probability of click sound vs typing (0.0 to 1.0, default: 0.15) */
  clickSoundProbability: number;
}

/**
 * Typing Sound Manager class
 * Manages client-side typing/clicking filler sounds during AI thinking
 */
export class TypingSoundManager {
  private config: TypingSoundConfig;
  private audioManager: AudioManager;
  private typingSoundData: Uint8Array | null = null;
  private clickSoundData: Uint8Array | null = null;
  private isPlaying: boolean = false;
  private activeTimeout: ReturnType<typeof setTimeout> | null = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private typingSoundDurationMs: number = 0;
  private clickSoundDurationMs: number = 0;

  /**
   * Constructor
   * @param config - Typing sound configuration
   * @param audioManager - Audio manager instance for playback
   */
  constructor(config: Partial<TypingSoundConfig>, audioManager: AudioManager) {
    this.config = {
      enabled: config.enabled ?? true,
      volume: config.volume ?? 0.3,
      typingSoundUrl: config.typingSoundUrl ?? 'https://assets.vowel.to/typing-sound.pcm',
      clickSoundUrl: config.clickSoundUrl ?? 'https://assets.vowel.to/mouse-click-sound.pcm',
      minSegmentDurationMs: config.minSegmentDurationMs ?? 200,
      maxSegmentDurationMs: config.maxSegmentDurationMs ?? 800,
      minPauseDurationMs: config.minPauseDurationMs ?? 300,
      maxPauseDurationMs: config.maxPauseDurationMs ?? 1500,
      clickSoundProbability: config.clickSoundProbability ?? 0.15,
    };
    this.audioManager = audioManager;
  }

  /**
   * Initialize and load sound files from CDN
   * This is called lazily on first use
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // If initialization is already in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }

  /**
   * Internal initialization implementation
   */
  private async _doInitialize(): Promise<void> {
    try {
      console.log('🔊 [TypingSoundManager] Initializing typing sounds...');
      
      // Load typing sound
      try {
        this.typingSoundData = await this.loadSoundFromCDN(this.config.typingSoundUrl);
        const samples = this.typingSoundData.length / 2; // PCM16 = 2 bytes per sample
        const sampleRate = 24000; // 24kHz
        this.typingSoundDurationMs = (samples / sampleRate) * 1000;
        console.log(`✅ [TypingSoundManager] Typing sound loaded (${this.typingSoundDurationMs.toFixed(0)}ms)`);
      } catch (error) {
        console.warn('⚠️ [TypingSoundManager] Failed to load typing sound:', error);
        // Continue without typing sound
      }

      // Load click sound (optional)
      if (this.config.clickSoundUrl) {
        try {
          this.clickSoundData = await this.loadSoundFromCDN(this.config.clickSoundUrl);
          const samples = this.clickSoundData.length / 2;
          const sampleRate = 24000;
          this.clickSoundDurationMs = (samples / sampleRate) * 1000;
          console.log(`✅ [TypingSoundManager] Click sound loaded (${this.clickSoundDurationMs.toFixed(0)}ms)`);
        } catch (error) {
          console.warn('⚠️ [TypingSoundManager] Failed to load click sound, continuing without it:', error);
          // Continue without click sound
        }
      }

      // Check if we have at least one sound
      if (!this.typingSoundData && !this.clickSoundData) {
        console.warn('⚠️ [TypingSoundManager] No sound files loaded, typing sounds disabled');
        this.config.enabled = false;
      }

      this.isInitialized = true;
      console.log('✅ [TypingSoundManager] Initialization complete');
    } catch (error) {
      console.error('❌ [TypingSoundManager] Initialization failed:', error);
      this.config.enabled = false;
      throw error;
    }
  }

  /**
   * Load sound file from CDN
   * @param url - CDN URL for sound file
   * @returns Promise resolving to audio data as Uint8Array
   */
  private async loadSoundFromCDN(url: string): Promise<Uint8Array> {
    try {
      const response = await fetch(url, {
        cache: 'force-cache', // Use browser cache if available
      });

      if (!response.ok) {
        throw new Error(`Failed to load sound: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.warn(`⚠️ [TypingSoundManager] Failed to load sound from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Start playing typing sounds
   * Automatically initializes if not already done
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    if (this.isPlaying) {
      return; // Already playing
    }

    // Ensure initialized
    if (!this.isInitialized) {
      try {
        await this.initialize();
      } catch (error) {
        console.warn('⚠️ [TypingSoundManager] Failed to initialize, skipping typing sounds');
        return;
      }
    }

    // Check if we have sound data
    if (!this.typingSoundData && !this.clickSoundData) {
      return; // No sounds available
    }

    this.isPlaying = true;
    console.log('🔊 [TypingSoundManager] Starting typing sounds');
    this.playRandomSegment();
  }

  /**
   * Stop playing typing sounds immediately
   */
  stop(): void {
    if (!this.isPlaying) {
      return;
    }

    this.isPlaying = false;
    
    // Clear any pending timeout
    if (this.activeTimeout) {
      clearTimeout(this.activeTimeout);
      this.activeTimeout = null;
    }

    // Stop all typing sounds in AudioManager
    this.audioManager.stopTypingSounds();
    
    console.log('⏸️ [TypingSoundManager] Stopped typing sounds');
  }

  /**
   * Set volume (0.0 to 1.0)
   * @param volume - Volume level
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Play a random typing/clicking segment
   */
  private playRandomSegment(): void {
    if (!this.isPlaying) {
      return;
    }

    // Decide whether to play click or typing sound
    const useClickSound = 
      this.clickSoundData && 
      Math.random() < this.config.clickSoundProbability;

    let segmentData: Uint8Array | null = null;

    if (useClickSound && this.clickSoundData) {
      // Play click sound
      segmentData = this.clickSoundData;
      console.log('🖱️ [TypingSoundManager] Playing click sound');
    } else if (this.typingSoundData) {
      // Play random typing segment
      const segmentDurationMs = this.randomBetween(
        this.config.minSegmentDurationMs,
        this.config.maxSegmentDurationMs
      );

      // Calculate bytes for segment duration
      // PCM16, 24kHz, mono = 2 bytes per sample, 24000 samples per second
      const bytesPerMs = (24000 * 2) / 1000; // 48 bytes per millisecond
      const segmentBytes = Math.floor(segmentDurationMs * bytesPerMs);
      
      // Round to even byte boundary (PCM16 samples are 2 bytes)
      const segmentBytesAligned = Math.floor(segmentBytes / 2) * 2;
      
      // Ensure we don't exceed sound data length
      const maxSegmentBytes = Math.min(segmentBytesAligned, this.typingSoundData.length);
      
      // Generate random start position (aligned to sample boundaries)
      const maxStartPosition = Math.max(0, this.typingSoundData.length - maxSegmentBytes);
      const startPositionAligned = Math.floor(Math.random() * Math.floor(maxStartPosition / 2)) * 2;
      const endPosition = startPositionAligned + maxSegmentBytes;

      // Extract segment
      segmentData = this.typingSoundData.slice(startPositionAligned, endPosition);
      
      // Apply fade-in and fade-out to prevent clicks/pops
      segmentData = this.applyFadeInOut(segmentData, 50); // 50ms fade
      
      console.log(`⌨️ [TypingSoundManager] Playing typing sound segment (${segmentDurationMs.toFixed(0)}ms)`);
    } else {
      // No sound data available
      return;
    }

    // Play the segment via AudioManager
    if (segmentData) {
      this.audioManager.playTypingSound(segmentData, this.config.volume);
    }

    // Schedule next segment after a random pause
    const pauseDurationMs = this.randomBetween(
      this.config.minPauseDurationMs,
      this.config.maxPauseDurationMs
    );

    this.activeTimeout = setTimeout(() => {
      this.activeTimeout = null;
      if (this.isPlaying) {
        this.playRandomSegment();
      }
    }, pauseDurationMs);
  }

  /**
   * Apply fade-in and fade-out to audio data to prevent clicks/pops
   * @param data - Audio data (PCM16)
   * @param fadeMs - Fade duration in milliseconds
   * @returns Processed audio data with fade applied
   */
  private applyFadeInOut(data: Uint8Array, fadeMs: number): Uint8Array {
    const sampleRate = 24000; // 24kHz
    const fadeSamples = Math.floor((fadeMs / 1000) * sampleRate);
    const totalSamples = data.length / 2; // PCM16 = 2 bytes per sample
    
    if (fadeSamples >= totalSamples) {
      return data; // Fade longer than segment, skip
    }

    // Convert to Int16Array for processing
    const samples = new Int16Array(data.buffer, data.byteOffset, data.length / 2);
    const result = new Int16Array(samples);

    // Fade in
    for (let i = 0; i < fadeSamples && i < totalSamples; i++) {
      const fade = i / fadeSamples;
      result[i] = Math.floor(samples[i] * fade);
    }

    // Fade out
    for (let i = 0; i < fadeSamples && i < totalSamples; i++) {
      const fade = i / fadeSamples;
      const index = totalSamples - 1 - i;
      result[index] = Math.floor(samples[index] * fade);
    }

    // Convert back to Uint8Array
    return new Uint8Array(result.buffer);
  }

  /**
   * Generate random number between min and max (inclusive)
   */
  private randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop();
    this.typingSoundData = null;
    this.clickSoundData = null;
    this.isInitialized = false;
    this.initializationPromise = null;
  }
}
