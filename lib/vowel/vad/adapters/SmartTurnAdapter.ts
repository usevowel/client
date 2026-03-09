/**
 * @fileoverview Smart Turn VAD Adapter Implementation
 * 
 * Production-ready VAD adapter using PipeCat's Smart Turn v3.2 model.
 * Supports WebGPU acceleration with WASM fallback.
 * 
 * ONNX Runtime Loading Strategy:
 * - Library builds: Externalized (peer dependency), loaded from CDN at runtime
 * - Standalone builds: Loaded from CDN (unpkg/jsdelivr) to avoid bundling 64MB
 * - WASM files: Loaded from CDN, not bundled
 * 
 * This prevents the 64MB ONNX Runtime bundle from being included in the build.
 * 
 * @module @vowel.to/client/vad/adapters
 * @author vowel.to
 * @license Proprietary
 */

import type { VADAdapter, VADConfig, VADState, VADFactory, VADMetadata } from '../';
import { VADRegistry, VADInitializationError, VADEventEmitter } from '../';
import { WhisperFeatureExtractor } from '@huggingface/transformers';

/**
 * Smart Turn V3.2 Adapter Configuration
 */
export interface SmartTurnConfig extends VADConfig {
  /** Model URL override (defaults to CDN) */
  modelUrl?: string;
  
  /** Preferred backend ('webgpu', 'wasm', 'auto') */
  backend?: 'webgpu' | 'wasm' | 'auto';
  
  /** Maximum audio buffer duration in seconds (default: 8) */
  maxBufferDuration?: number;
  
  /** Run inference only when primary VAD detects silence (recommended) */
  useWithPrimaryVAD?: boolean;
  
  /** Primary VAD adapter ID (e.g., 'silero', 'simple') */
  primaryVADAdapter?: string;
  
  /** Confidence threshold for turn completion (0-1, default: 0.5) */
  completionThreshold?: number;
}

/**
 * Smart Turn VAD Adapter
 * 
 * Implements semantic turn detection using PipeCat's Smart Turn v3.2 model.
 * Supports WebGPU acceleration with WASM fallback.
 */
export class SmartTurnAdapter extends VADEventEmitter implements VADAdapter {
  readonly id = 'smart-turn';
  readonly name = 'Smart Turn V3.2';
  readonly version = '3.2.0';
  
  private config: SmartTurnConfig;
  private state: VADState;
  private initialized = false;
  private backend: 'webgpu' | 'wasm' | null = null;
  private session: any = null; // ONNX Runtime session
  private audioBuffer: Float32Array[] = [];
  private lastInferenceTime = 0;
  private inferenceInterval = 500; // Run inference every 500ms
  private inferenceInProgress = false; // Mutex to prevent concurrent inference
  private speechStartTime: number = 0; // Track speech start time for duration calculation
  
  // Model URL - Load from HuggingFace (official pipecat-ai model)
  // Using the v3.2 CPU-optimized ONNX model (8.67 MB) from pipecat-ai/smart-turn-v3
  // This is the official model designed for CPU inference with onnxruntime
  // The onnx-community version uses Transformers.js-specific ops that aren't supported by plain onnxruntime-web
  private static readonly MODEL_URL = 
    'https://huggingface.co/pipecat-ai/smart-turn-v3/resolve/main/smart-turn-v3.2-cpu.onnx';
  
  constructor(config: Partial<SmartTurnConfig> = {}) {
    super();
    this.config = {
      threshold: 0.5,
      minSpeechDurationMs: 200,
      silenceDurationMs: 500,
      sampleRate: 16000,
      frameDurationMs: 30,
      backend: 'auto',
      maxBufferDuration: 8,
      useWithPrimaryVAD: false,
      completionThreshold: 0.5,
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
   * Initialize the Smart Turn adapter
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    console.log('[SmartTurnAdapter] Initializing Smart Turn V3.2...');
    
    try {
      // Select and initialize backend
      await this.initializeBackend();
      
      // Load ONNX model
      await this.loadModel();
      
      this.initialized = true;
      console.log(`[SmartTurnAdapter] Initialized successfully (${this.backend} backend)`);
      
      // Emit ready event
      this.emit('vad:ready', {
        adapterId: this.id,
        adapterName: this.name
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[SmartTurnAdapter] Initialization failed:', err);
      throw new VADInitializationError(
        `Failed to initialize Smart Turn: ${err.message}`,
        this.id
      );
    }
  }
  
  /**
   * Initialize WebGPU or WASM backend
   */
  private async initializeBackend(): Promise<void> {
    const preferredBackend = this.config.backend;
    
    if (preferredBackend === 'webgpu' || preferredBackend === 'auto') {
      if (await this.isWebGPUSupported()) {
        this.backend = 'webgpu';
        console.log('[SmartTurnAdapter] Using WebGPU backend');
        return;
      } else if (preferredBackend === 'webgpu') {
        throw new Error('WebGPU requested but not supported');
      }
    }
    
    // Fallback to WASM
    this.backend = 'wasm';
    console.log('[SmartTurnAdapter] Using WASM backend');
  }
  
  /**
   * Check if WebGPU is supported
   */
  private async isWebGPUSupported(): Promise<boolean> {
    if (typeof navigator === 'undefined') {
      return false;
    }
    
    // Check for WebGPU support
    const nav = navigator as any;
    if (!nav.gpu) {
      return false;
    }
    
    try {
      const adapter = await nav.gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }
  
  /**
   * Configure ONNX Runtime to load all WASM assets from CDN
   * This must be called before creating any inference sessions
   */
  private configureONNXRuntimeCDN(ort: any, version: string = 'latest'): void {
    // Use unpkg CDN as requested
    const cdnBase = `https://unpkg.com/onnxruntime-web@${version}/dist/`;
    
    // Configure WASM paths to load from CDN
    // This ensures all WASM files (ort-wasm.wasm, ort-wasm-simd.wasm, etc.) load from CDN
    ort.env.wasm.wasmPaths = cdnBase;
    
    console.log(`[SmartTurnAdapter] Configured ONNX Runtime WASM paths: ${cdnBase}`);
  }
  
  /**
   * Load ONNX Runtime from CDN or local import
   * Prefers CDN to avoid bundling the 64MB library
   */
  private async loadONNXRuntime(): Promise<any> {
    const version = 'latest'; // Use latest version from CDN
    
    // Try to load from global (if loaded via script tag)
    if (typeof window !== 'undefined' && (window as any).ort) {
      const ort = (window as any).ort;
      // Configure CDN paths even if already loaded
      this.configureONNXRuntimeCDN(ort, version);
      console.log('[SmartTurnAdapter] Using ONNX Runtime from global (CDN)');
      return ort;
    }
    
    // Try dynamic import (for library builds where it's externalized)
    try {
      const ort = await import('onnxruntime-web');
      // Configure CDN paths for npm-imported version too
      this.configureONNXRuntimeCDN(ort, version);
      console.log('[SmartTurnAdapter] Using ONNX Runtime from npm package (CDN configured)');
      return ort;
    } catch (error) {
      // If import fails, try loading from CDN
      console.log('[SmartTurnAdapter] Import failed, loading from CDN...');
      return await this.loadONNXRuntimeFromCDN(version);
    }
  }
  
  /**
   * Load ONNX Runtime from CDN (unpkg)
   */
  private async loadONNXRuntimeFromCDN(version: string = 'latest'): Promise<any> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (typeof window !== 'undefined' && (window as any).ort) {
        const ort = (window as any).ort;
        this.configureONNXRuntimeCDN(ort, version);
        resolve(ort);
        return;
      }
      
      // Load from unpkg CDN
      const script = document.createElement('script');
      script.src = `https://unpkg.com/onnxruntime-web@${version}/dist/ort.min.js`;
      script.async = true;
      
      script.onload = () => {
        const ort = (window as any).ort;
        if (!ort) {
          reject(new Error('ONNX Runtime failed to load from CDN'));
          return;
        }
        
        // Configure WASM paths to load from CDN (not bundled)
        this.configureONNXRuntimeCDN(ort, version);
        
        console.log(`[SmartTurnAdapter] ONNX Runtime loaded from unpkg CDN (${version})`);
        resolve(ort);
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load ONNX Runtime from CDN'));
      };
      
      document.head.appendChild(script);
    });
  }
  
  /**
   * Load ONNX model using onnxruntime-web
   */
  private async loadModel(): Promise<void> {
    try {
      // Load ONNX Runtime (from CDN or npm)
      const ort = await this.loadONNXRuntime();
      
      // Log ONNX Runtime version for debugging
      const ortVersion = (ort as any).version || 'unknown';
      console.log(`[SmartTurnAdapter] ONNX Runtime version: ${ortVersion}`);
      
      // Force WASM execution provider only
      // The CPU-optimized model (smart-turn-v3.2-cpu.onnx) uses quantized ops
      // that WebGPU doesn't support (DequantizeLinear with int32).
      // The model is fast enough for CPU inference (~12ms per pipecat docs)
      const executionProviders = ['wasm'];
      
      // Load model
      const modelUrl = this.config.modelUrl || SmartTurnAdapter.MODEL_URL;
      
      console.log(`[SmartTurnAdapter] Loading model from ${modelUrl}...`);
      
      // Fetch model first to handle CORS and verify accessibility
      // HuggingFace URLs work better when fetched as ArrayBuffer
      let modelData: ArrayBuffer | string = modelUrl;
      
      try {
        // Try fetching the model first (handles CORS better)
        // HuggingFace URLs redirect to signed S3 URLs, fetch handles this automatically
        console.log(`[SmartTurnAdapter] Fetching model from ${modelUrl}...`);
        const response = await fetch(modelUrl, {
          redirect: 'follow', // Follow redirects (default, but explicit)
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(
            `Failed to fetch model: HTTP ${response.status} ${response.statusText}. ` +
            `Response: ${errorText.substring(0, 200)}`
          );
        }
        
        const contentType = response.headers.get('content-type');
        console.log(`[SmartTurnAdapter] Model response: ${response.status} ${response.statusText}, Content-Type: ${contentType}`);
        
        modelData = await response.arrayBuffer();
        console.log(`[SmartTurnAdapter] Model fetched successfully (${(modelData.byteLength / 1024 / 1024).toFixed(2)} MB)`);
      } catch (fetchError: any) {
        console.error(`[SmartTurnAdapter] Failed to fetch model:`, {
          error: fetchError,
          message: fetchError?.message,
          url: modelUrl
        });
        console.warn(`[SmartTurnAdapter] Falling back to direct URL loading...`);
        // Fall back to direct URL loading (may fail with CORS)
        modelData = modelUrl;
      }
      
      // Create inference session with better error handling
      // Note: Some options may not be supported in onnxruntime-web
      // Using minimal options that are known to work
      try {
        const sessionOptions: any = {
          executionProviders,
        };
        
        // Only add options that are supported in onnxruntime-web
        // graphOptimizationLevel might not be supported in web version
        if (ort.GraphOptimizationLevel) {
          sessionOptions.graphOptimizationLevel = ort.GraphOptimizationLevel.ORT_ENABLE_ALL;
        }
        
        this.session = await ort.InferenceSession.create(modelData, sessionOptions);
        
        console.log(`[SmartTurnAdapter] Model loaded successfully`);
        console.log(`[SmartTurnAdapter] Input names:`, this.session.inputNames);
        console.log(`[SmartTurnAdapter] Output names:`, this.session.outputNames);
      } catch (sessionError: any) {
        // Extract more details from ONNX Runtime errors
        const errorMessage = sessionError?.message || String(sessionError);
        const errorCode = typeof sessionError === 'number' ? sessionError : sessionError?.code;
        
        console.error('[SmartTurnAdapter] InferenceSession.create failed:', {
          error: sessionError,
          message: errorMessage,
          code: errorCode,
          executionProviders,
          modelUrl,
          modelSize: modelData instanceof ArrayBuffer ? `${(modelData.byteLength / 1024 / 1024).toFixed(2)} MB` : 'unknown'
        });
        
        // Create a more helpful error message
        const helpfulError = new Error(
          `Failed to load ONNX model: ${errorMessage || errorCode || 'Unknown error'}. ` +
          `Model URL: ${modelUrl}, Execution Providers: ${executionProviders.join(', ')}`
        );
        (helpfulError as any).originalError = sessionError;
        throw helpfulError;
      }
    } catch (error) {
      console.error('[SmartTurnAdapter] Failed to load model:', error);
      throw error;
    }
  }
  
  /**
   * Process audio frame
   * 
   * Strategy:
   * 1. Accumulate audio in buffer (max 8 seconds)
   * 2. Run inference periodically (every 500ms)
   * 3. Return probability of turn completion
   */
  processFrame(frame: Float32Array, _timestamp: number): number | null {
    if (!this.initialized || !this.session) {
      return null;
    }
    
    // Accumulate audio
    this.accumulateAudio(frame);
    
    // Run inference periodically
    const now = Date.now();
    if (now - this.lastInferenceTime >= this.inferenceInterval) {
      this.lastInferenceTime = now;
      // Run inference asynchronously
      this.runInferenceAsync();
    }
    
    return this.state.speechProbability;
  }
  
  /**
   * Accumulate audio in buffer
   */
  private accumulateAudio(frame: Float32Array): void {
    this.audioBuffer.push(frame);
    
    // Calculate current duration
    const totalSamples = this.audioBuffer.reduce((sum, f) => sum + f.length, 0);
    this.state.currentSpeechDurationMs = (totalSamples / this.config.sampleRate) * 1000;
    
    // Trim buffer if exceeds max duration
    const maxDurationMs = (this.config.maxBufferDuration || 8) * 1000;
    while (this.state.currentSpeechDurationMs > maxDurationMs && this.audioBuffer.length > 0) {
      const removed = this.audioBuffer.shift()!;
      this.state.currentSpeechDurationMs -= (removed.length / this.config.sampleRate) * 1000;
    }
    
    this.state.isSpeechActive = true;
    this.state.framesProcessed++;
  }
  
  /**
   * Run Smart Turn inference asynchronously
   */
  private async runInferenceAsync(): Promise<void> {
    if (this.audioBuffer.length === 0 || !this.session) return;
    
    // Prevent concurrent inference - ONNX Runtime sessions don't support parallel runs
    if (this.inferenceInProgress) return;
    this.inferenceInProgress = true;
    
    try {
      // Get ONNX Runtime (should already be loaded, but handle gracefully)
      let ort: any;
      if (typeof window !== 'undefined' && (window as any).ort) {
        ort = (window as any).ort;
      } else {
        ort = await import('onnxruntime-web');
        // Ensure CDN is configured even in this fallback path
        this.configureONNXRuntimeCDN(ort, 'latest');
      }
      
      // Concatenate audio buffer
      const totalLength = this.audioBuffer.reduce((sum, f) => sum + f.length, 0);
      const audio = new Float32Array(totalLength);
      let offset = 0;
      
      for (const frame of this.audioBuffer) {
        audio.set(frame, offset);
        offset += frame.length;
      }
      
      // Process audio through Whisper feature extraction using transformers.js
      // This ensures exact compatibility with the official Smart Turn model
      // The Smart Turn model expects exactly 8 seconds of audio processed with Whisper's feature extractor
      const targetDurationSec = 8;
      const samplingRate = 16000;
      const targetSamples = targetDurationSec * samplingRate;
      
      // Truncate or pad audio to exactly 8 seconds
      let processedAudio: Float32Array;
      if (audio.length > targetSamples) {
        // Truncate from beginning (keep last 8 seconds)
        processedAudio = audio.slice(-targetSamples);
      } else if (audio.length < targetSamples) {
        // Pad with zeros at beginning
        processedAudio = new Float32Array(targetSamples);
        processedAudio.set(audio, targetSamples - audio.length);
      } else {
        processedAudio = audio;
      }
      
      // Initialize WhisperFeatureExtractor with config matching Smart Turn Python library
      // Smart Turn uses: WhisperFeatureExtractor(chunk_length=8)
      // This creates a feature extractor configured for 8-second audio chunks
      const featureExtractor = new WhisperFeatureExtractor({
        feature_size: 80,        // Number of mel bins
        sampling_rate: 16000,    // Sample rate
        hop_length: 160,         // Hop length for STFT (10ms at 16kHz)
        n_fft: 400,              // FFT window size (25ms at 16kHz)
        chunk_length: 8,         // 8 seconds (matching Smart Turn)
        n_samples: 8 * 16000,    // 8 seconds = 128000 samples
        nb_max_frames: 800,      // 8 sec / 0.01 sec per frame = 800 frames
      });
      
      // Extract features - returns shape [1, 80, num_frames]
      const features = await featureExtractor._call(processedAudio, {
        max_length: targetSamples,  // 8 seconds = 128000 samples
      });
      
      // Extract the input_features tensor
      // features.input_features has shape [1, 80, num_frames]
      let inputFeatures = features.input_features;
      
      // The Smart Turn model expects exactly 800 time frames
      // Whisper produces approximately 1 frame per 0.01 seconds
      // For 8 seconds: 8 / 0.01 = 800 frames
      const targetFrames = 800;
      const currentFrames = inputFeatures.dims[2];  // dims = [1, 80, num_frames]
      
      let finalFeatures: Float32Array;
      
      if (currentFrames !== targetFrames) {
        // Create a new array with the target shape [1, 80, 800]
        finalFeatures = new Float32Array(1 * 80 * targetFrames);
        const inputData = inputFeatures.data as Float32Array;
        
        if (currentFrames < targetFrames) {
          // Pad with zeros at the beginning (audio at the end)
          const offsetFrames = targetFrames - currentFrames;
          for (let mel = 0; mel < 80; mel++) {
            for (let frame = 0; frame < currentFrames; frame++) {
              finalFeatures[mel * targetFrames + offsetFrames + frame] = 
                inputData[mel * currentFrames + frame];
            }
          }
        } else {
          // Truncate from the beginning (keep last 800 frames)
          const skipFrames = currentFrames - targetFrames;
          for (let mel = 0; mel < 80; mel++) {
            for (let frame = 0; frame < targetFrames; frame++) {
              finalFeatures[mel * targetFrames + frame] = 
                inputData[mel * currentFrames + skipFrames + frame];
            }
          }
        }
      } else {
        finalFeatures = inputFeatures.data as Float32Array;
      }
      
      // Shape: [batch=1, mel_bins=80, time_frames=800] - fixed size for Smart Turn v3
      const shape = [1, 80, targetFrames];
      
      // Create input tensor with correct shape and input name
      // The model expects "input_features" not "input"
      const inputTensor = new ort.Tensor('float32', inputFeatures.data, shape);
      
      // Run inference
      const startTime = performance.now();
      const results = await this.session.run({ input_features: inputTensor });
      const inferenceTime = performance.now() - startTime;
      
      // Get output probability - model output key may vary
      const outputKeys = Object.keys(results);
      const output = results.output || results['output'] || results[outputKeys[0]];
      if (!output || !output.data) {
        console.warn('[SmartTurnAdapter] Invalid output from model. Keys:', outputKeys);
        return;
      }
      
      const probability = output.data[0] as number;
      
      // Update state
      const wasSpeechActive = this.state.isSpeechActive;
      this.state.speechProbability = probability;
      
      // Determine if speech is complete based on completion threshold
      const isComplete = probability >= (this.config.completionThreshold || 0.5);
      
      if (isComplete && wasSpeechActive) {
        const timestamp = Date.now();
        const duration = this.speechStartTime > 0 ? timestamp - this.speechStartTime : 0;
        this.state.isSpeechActive = false;
        console.log(`[SmartTurnAdapter] Turn complete detected: ${probability.toFixed(3)} (${inferenceTime.toFixed(1)}ms)`);
        
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
        
        this.speechStartTime = 0;
      } else if (!isComplete && !wasSpeechActive) {
        const timestamp = Date.now();
        this.state.isSpeechActive = true;
        this.speechStartTime = timestamp;
        this.state.currentSpeechDurationMs = 0;
        
        // Emit speech start event
        this.emit('vad:speech:start', {
          timestamp,
          probability,
          adapterId: this.id
        });
        
        // Emit state change event
        this.emit('vad:state:change', {
          previousState: { ...this.state, isSpeechActive: false },
          currentState: { ...this.state },
          adapterId: this.id
        });
      }
      
      if (inferenceTime > 100) {
        console.warn(`[SmartTurnAdapter] Slow inference: ${inferenceTime.toFixed(1)}ms`);
      }
    } catch (error) {
      console.error('[SmartTurnAdapter] Inference error:', error);
    } finally {
      this.inferenceInProgress = false;
    }
  }
  
  configure(config: VADConfig): void {
    this.config = { ...this.config, ...config };
  }
  
  reset(): void {
    this.audioBuffer = [];
    this.lastInferenceTime = 0;
    this.inferenceInProgress = false;
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
    if (this.session) {
      try {
        // Release session resources
        this.session.release?.();
      } catch (e) {
        console.warn('[SmartTurnAdapter] Error releasing session:', e);
      }
      this.session = null;
    }
    this.initialized = false;
    this.audioBuffer = [];
    this.backend = null;
    this.inferenceInProgress = false;
    this.removeAllListeners();
  }
  
  isReady(): boolean {
    return this.initialized && this.session !== null;
  }
  
  getState(): VADState {
    return { ...this.state };
  }
  
  /**
   * Get current backend
   */
  getBackend(): 'webgpu' | 'wasm' | null {
    return this.backend;
  }
}

/**
 * Smart Turn Factory
 */
export class SmartTurnFactory implements VADFactory {
  create(config?: Partial<SmartTurnConfig>): SmartTurnAdapter {
    return new SmartTurnAdapter(config);
  }
  
  getMetadata(): VADMetadata {
    return {
      id: 'smart-turn',
      name: 'Smart Turn V3.2',
      version: '3.2.0',
      description: 'PipeCat Smart Turn semantic VAD with WebGPU/WASM support',
      supportedSampleRates: [16000],
      supportedFrameDurations: [30],
      requiresWasm: true,
      worksOffline: true,
      estimatedMemoryMB: 20, // Model (8MB) + overhead
      estimatedCpuUsage: 'medium'
    };
  }
}

// Auto-register the factory
VADRegistry.register(new SmartTurnFactory());

/**
 * Register Smart Turn adapter with VAD Registry
 * 
 * This function ensures the SmartTurnAdapter is registered.
 * The adapter auto-registers when the module is imported, but this function
 * can be called explicitly to ensure registration.
 * 
 * @returns void
 */
export function registerSmartTurnAdapter(): void {
  // Check if already registered
  if (!VADRegistry.getFactory('smart-turn')) {
    VADRegistry.register(new SmartTurnFactory());
  }
}