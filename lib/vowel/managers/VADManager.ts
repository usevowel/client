/**
 * VAD Manager - Client-side Voice Activity Detection
 * Supports multiple VAD types: Silero (ML-based), Simple (energy-based), or None (disabled)
 */

import { loadVADWebFromCDN } from "../utils/cdnLoader";
import type { VADType } from "../types";

const VAD_WEB_CDN_VERSION = "0.0.30";

  /**
   * VAD configuration and callbacks
   */
export interface VADConfig {
  /**
   * VAD type to use (default: "silero")
   * - "silero": ML-based VAD using Silero model (most accurate, requires model download)
   * - "simple": Energy-based VAD algorithm (fast, no download, good accuracy)
   * - "none": Disable client-side VAD (rely only on server-side VAD)
   */
  vadType?: VADType;

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
   * Minimum duration of silence (in frames) before speech is considered ended
   * Default: 8 frames (~800ms at 10fps frame rate)
   */
  redemptionFrames?: number;

  /**
   * Threshold for positive speech detection (0-1)
   * Higher = more conservative (fewer false positives)
   * Default: 0.5
   */
  positiveSpeechThreshold?: number;

  /**
   * Threshold for negative speech detection (0-1)
   * Lower = more conservative (fewer false negatives)
   * Default: 0.35
   */
  negativeSpeechThreshold?: number;
}

/**
 * VAD Manager class
 * Manages client-side voice activity detection with support for multiple VAD types
 */
export class VADManager {
  private vad: any = null; // MicVAD instance (loaded from CDN)
  private simpleVad: any = null; // SimpleVAD instance (lazy loaded)
  private config: VADConfig;
  private isActive: boolean = false;
  private isSpeaking: boolean = false;
  private vadType: VADType;

  constructor(config: VADConfig) {
    this.config = config;
    this.vadType = config.vadType ?? "silero";
  }

  /**
   * Start VAD with the provided media stream
   * @param stream MediaStream from microphone - REUSE existing stream to avoid duplicate permissions
   */
  async start(stream: MediaStream): Promise<void> {
    if (this.isActive) {
      console.warn("VAD already started");
      return;
    }

    try {
      console.log(`🎤 Initializing Voice Activity Detection (${this.vadType})...`);

      // Handle "none" type - disable VAD
      if (this.vadType === "none") {
        console.log("⚠️ VAD disabled (type: none) - relying on server-side VAD only");
        this.isActive = true;
        this.config.onVADReady?.();
        return;
      }

      // Handle "simple" type - use energy-based VAD
      if (this.vadType === "simple") {
        const { SimpleVAD } = await import("./SimpleVAD");
        
        this.simpleVad = new SimpleVAD({
          stream,
          redemptionFrames: this.config.redemptionFrames ?? 8,
          energyThreshold: this.config.positiveSpeechThreshold ?? 0.15,
          onSpeechStart: () => {
            if (!this.isSpeaking) {
              this.isSpeaking = true;
              console.log("🗣️ User started speaking (Simple VAD)");
              this.config.onSpeechStart?.();
            }
          },
          onSpeechEnd: () => {
            if (this.isSpeaking) {
              this.isSpeaking = false;
              console.log("🔇 User stopped speaking (Simple VAD)");
              this.config.onSpeechEnd?.();
            }
          },
        });

        await this.simpleVad.start();
        this.isActive = true;
        console.log("✅ Voice Activity Detection initialized (Simple)");
        this.config.onVADReady?.();
        return;
      }

      // Handle "silero" type - use ML-based VAD (~10MB, lazy loaded from CDN)
      console.log("📦 Loading Silero VAD model from CDN (this may take a moment)...");
      
      // Load @ricky0123/vad-web from CDN (not bundled)
      const { MicVAD } = await loadVADWebFromCDN();
      
      // Detect Safari - VAD may have issues on Safari/iOS
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
      const isSafari = userAgent.indexOf('safari') > -1 && userAgent.indexOf('chrome') === -1;
      
      if (isSafari) {
        console.log("🧭 Safari detected - using existing audio stream for VAD (avoids duplicate mic permissions)");
      }

      // Create MicVAD instance with configuration
      // IMPORTANT: Pass the existing stream to avoid requesting microphone permission again!
      this.vad = await MicVAD.new({
        // Reuse the provided stream so MicVAD stays on the same AEC-processed
        // path as the rest of the audio pipeline instead of opening a raw mic.
        getStream: async () => stream,
        resumeStream: async () => stream,
        pauseStream: async () => {},
        // Use CDN URLs for model and ONNX runtime files
        // This ensures reliable loading without bundling large binary files
        baseAssetPath: `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${VAD_WEB_CDN_VERSION}/dist/`,
        onnxWASMBasePath: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
        // Minimum duration of silence before speech ends
        redemptionMs: (this.config.redemptionFrames ?? 8) * 100,
        // Speech detection thresholds
        positiveSpeechThreshold: this.config.positiveSpeechThreshold ?? 0.5,
        negativeSpeechThreshold: this.config.negativeSpeechThreshold ?? 0.35,
        // Callbacks
        onSpeechStart: () => {
          if (!this.isSpeaking) {
            this.isSpeaking = true;
            console.log("🗣️ User started speaking (Silero VAD)");
            this.config.onSpeechStart?.();
          }
        },
        onSpeechEnd: () => {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            console.log("🔇 User stopped speaking (Silero VAD)");
            this.config.onSpeechEnd?.();
          }
        },
        onVADMisfire: () => {
          // VAD detected speech but it was a false positive
          console.debug("VAD misfire (false positive)");
        },
      } as any); // Type assertion due to version mismatch

      this.isActive = true;
      console.log("✅ Voice Activity Detection initialized (Silero)");
      this.config.onVADReady?.();

      // Start listening for speech
      this.vad.start();
    } catch (error) {
      const err = error as Error;
      console.error("❌ Failed to initialize VAD:", error);
      this.config.onVADError?.(err);
      // Don't throw - allow session to continue without VAD
    }
  }

  /**
   * Stop VAD and cleanup resources
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      console.log("🛑 Stopping Voice Activity Detection...");
      
      // If user was speaking, trigger speech end callback to update UI state
      if (this.isSpeaking) {
        console.log("🔇 VAD stopping while user was speaking - triggering speech end callback");
        this.isSpeaking = false;
        this.config.onSpeechEnd?.();
      }
      
      // Stop Silero VAD
      if (this.vad) {
      this.vad.pause();
      await this.vad.destroy();
      this.vad = null;
      }
      
      // Stop Simple VAD
      if (this.simpleVad) {
        await this.simpleVad.stop();
        this.simpleVad = null;
      }
      
      this.isActive = false;
      this.isSpeaking = false;
      console.log("✅ Voice Activity Detection stopped");
    } catch (error) {
      console.error("❌ Error stopping VAD:", error);
      // If user was speaking, trigger speech end callback even on error
      if (this.isSpeaking) {
        this.isSpeaking = false;
        this.config.onSpeechEnd?.();
      }
      // Force cleanup
      this.vad = null;
      this.simpleVad = null;
      this.isActive = false;
      this.isSpeaking = false;
    }
  }

  /**
   * Check if user is currently speaking
   */
  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }

  /**
   * Check if VAD is initialized and active
   */
  isInitialized(): boolean {
    return this.isActive;
  }

  /**
   * Pause VAD (temporarily stop processing)
   */
  pause(): void {
    if (!this.isActive) {
      return;
    }
    
    if (this.vad) {
      this.vad.pause();
      console.log("⏸️ VAD paused (Silero)");
    }
    
    if (this.simpleVad) {
      this.simpleVad.pause();
      console.log("⏸️ VAD paused (Simple)");
    }
  }

  /**
   * Resume VAD (restart processing)
   */
  resume(): void {
    if (!this.isActive) {
      return;
    }
    
    if (this.vad) {
      this.vad.start();
      console.log("▶️ VAD resumed (Silero)");
    }
    
    if (this.simpleVad) {
      this.simpleVad.resume();
      console.log("▶️ VAD resumed (Simple)");
    }
  }
}
