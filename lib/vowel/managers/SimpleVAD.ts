/**
 * SimpleVAD - Energy-based Voice Activity Detection
 * 
 * This implementation uses audio energy analysis to detect speech without requiring
 * machine learning models. It's fast, requires no downloads, but less accurate than Silero VAD.
 * 
 * Algorithm:
 * - Analyzes audio samples in real-time using Web Audio API
 * - Calculates RMS (Root Mean Square) energy level
 * - Detects speech when energy exceeds threshold
 * - Uses redemption frames to avoid flickering (brief silence during speech)
 */

/**
 * SimpleVAD configuration
 */
export interface SimpleVADConfig {
  /** MediaStream from microphone */
  stream: MediaStream;
  
  /** Energy threshold for speech detection (0-1, default: 0.15) */
  energyThreshold?: number;
  
  /** Sample rate in Hz (default: 16000) */
  sampleRate?: number;
  
  /** FFT size for frequency analysis (default: 2048) */
  fftSize?: number;
  
  /** Analysis interval in ms (default: 100) */
  analysisInterval?: number;
  
  /** Minimum duration of silence (in frames) before speech is considered ended (default: 8) */
  redemptionFrames?: number;
  
  /** Called when speech starts */
  onSpeechStart?: () => void;
  
  /** Called when speech ends */
  onSpeechEnd?: () => void;
}

/**
 * SimpleVAD class
 * Energy-based voice activity detection using Web Audio API
 */
export class SimpleVAD {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private intervalId: number | null = null;
  
  private config: Required<Omit<SimpleVADConfig, 'stream' | 'onSpeechStart' | 'onSpeechEnd'>> & Pick<SimpleVADConfig, 'onSpeechStart' | 'onSpeechEnd'>;
  private stream: MediaStream;
  
  private isSpeaking: boolean = false;
  private silenceFrames: number = 0;
  private isActive: boolean = false;

  constructor(config: SimpleVADConfig) {
    this.stream = config.stream;
    this.config = {
      energyThreshold: config.energyThreshold ?? 0.15,
      sampleRate: config.sampleRate ?? 16000,
      fftSize: config.fftSize ?? 2048,
      analysisInterval: config.analysisInterval ?? 100,
      redemptionFrames: config.redemptionFrames ?? 8,
      onSpeechStart: config.onSpeechStart,
      onSpeechEnd: config.onSpeechEnd,
    };
  }

  /**
   * Start VAD processing
   */
  async start(): Promise<void> {
    if (this.isActive) {
      console.warn("SimpleVAD already started");
      return;
    }

    try {
      console.log("🎤 Initializing Simple VAD (energy-based)...");

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
      
      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);
      
      // Start analysis loop
      this.isActive = true;
      this.startAnalysis();
      
      console.log("✅ Simple VAD initialized");
    } catch (error) {
      console.error("❌ Failed to initialize Simple VAD:", error);
      throw error;
    }
  }

  /**
   * Stop VAD processing
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    console.log("🛑 Stopping Simple VAD...");
    
    this.isActive = false;
    
    // Stop analysis loop
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Disconnect audio nodes
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    // Close audio context
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    
    // Reset state
    this.isSpeaking = false;
    this.silenceFrames = 0;
    
    console.log("✅ Simple VAD stopped");
  }

  /**
   * Pause VAD processing
   */
  pause(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("⏸️ Simple VAD paused");
    }
  }

  /**
   * Resume VAD processing
   */
  resume(): void {
    if (this.isActive && this.intervalId === null) {
      this.startAnalysis();
      console.log("▶️ Simple VAD resumed");
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeakingNow(): boolean {
    return this.isSpeaking;
  }

  /**
   * Start the audio analysis loop
   */
  private startAnalysis(): void {
    this.intervalId = window.setInterval(() => {
      this.analyzeFrame();
    }, this.config.analysisInterval);
  }

  /**
   * Analyze a single audio frame
   */
  private analyzeFrame(): void {
    if (!this.analyser || !this.isActive) {
      return;
    }

    // Get frequency data
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate RMS (Root Mean Square) energy
    const energy = this.calculateRMS(dataArray);
    
    // Normalize energy to 0-1 range
    const normalizedEnergy = energy / 255;

    // Check if energy exceeds threshold
    const hasSpeech = normalizedEnergy > this.config.energyThreshold;

    if (hasSpeech) {
      // Reset silence counter
      this.silenceFrames = 0;
      
      // Trigger speech start if not already speaking
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        console.log("🗣️ User started speaking (Simple VAD)");
        this.config.onSpeechStart?.();
      }
    } else {
      // Increment silence counter
      if (this.isSpeaking) {
        this.silenceFrames++;
        
        // Check if silence duration exceeds redemption threshold
        if (this.silenceFrames >= this.config.redemptionFrames) {
          this.isSpeaking = false;
          this.silenceFrames = 0;
          console.log("🔇 User stopped speaking (Simple VAD)");
          this.config.onSpeechEnd?.();
        }
      }
    }
  }

  /**
   * Calculate RMS (Root Mean Square) energy from frequency data
   * 
   * @param dataArray - Frequency data array
   * @returns RMS energy value
   */
  private calculateRMS(dataArray: Uint8Array): number {
    let sum = 0;
    
    // Calculate sum of squares
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    
    // Calculate mean and return square root
    const mean = sum / dataArray.length;
    return Math.sqrt(mean);
  }
}

