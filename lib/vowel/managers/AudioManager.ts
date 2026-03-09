/**
 * @fileoverview Audio Manager - Handles all audio-related functionality for voice sessions
 * 
 * This file contains the `AudioManager` class which manages the complete audio pipeline
 * for voice interactions. It handles microphone input capture, audio encoding for streaming
 * to Gemini Live, audio decoding from AI responses, and playback through the browser's
 * audio system.
 * 
 * Responsibilities:
 * - Microphone permission and stream setup
 * - Audio context initialization and management
 * - Real-time audio encoding (PCM16 format)
 * - Audio streaming to Gemini Live session
 * - AI audio response decoding and playback
 * - Audio cleanup and resource management
 * - Speaking state detection and callbacks
 * 
 * @module @vowel.to/client/managers
 * @author vowel.to
 * @license Proprietary
 */

import type { RealtimeProvider } from "../providers/RealtimeProvider";
import type { EnhancedVADManager } from "./EnhancedVADManager";
// Import worklet as raw JavaScript string for inline bundling
// Using .js file to avoid TypeScript syntax issues in AudioWorklet context
// @ts-ignore - Vite will handle this
import audioWorkletCode from './audio-processor.worklet.js?raw';
import { getOperatingSystem } from "../utils/device-detection";
import { AUDIO_CAPTURE_CONFIG } from "../types/constants";

/**
 * Audio context and node references
 */
interface AudioRefs {
  inputContext: AudioContext | null;
  outputContext: AudioContext | null;
  inputNode: GainNode | null;
  outputNode: GainNode | null;
  workletNode: AudioWorkletNode | null;
  sourceNode: MediaStreamAudioSourceNode | null;
  mediaStream: MediaStream | null;
  // RTC loopback for echo cancellation
  rtcConnection: RTCPeerConnection | null; // CLIENT side (sends mic, receives TTS)
  rtcLoopbackConnection: RTCPeerConnection | null; // SERVER side (receives mic, sends TTS)
  micLoopbackStream: MediaStream | null; // Mic audio from SERVER receiver side
  ttsLoopbackStream: MediaStream | null; // TTS audio from CLIENT receiver side
  loopbackAudioElement: HTMLAudioElement | null;
  mediaStreamDestination: MediaStreamAudioDestinationNode | null;
}

/**
 * Audio Manager configuration
 */
export interface AudioManagerConfig {
  /**
   * Called when AI speaking state changes
   */
  onAISpeakingChange?: (isSpeaking: boolean) => void;
}

/**
 * Audio Manager class
 * Handles microphone setup, audio streaming, and playback
 */
export class AudioManager {
  private refs: AudioRefs = {
    inputContext: null,
    outputContext: null,
    inputNode: null,
    outputNode: null,
    workletNode: null,
    sourceNode: null,
    mediaStream: null,
    // RTC loopback for echo cancellation
    rtcConnection: null, // CLIENT side
    rtcLoopbackConnection: null, // SERVER side
    micLoopbackStream: null, // Mic from SERVER receiver
    ttsLoopbackStream: null, // TTS from CLIENT receiver
    loopbackAudioElement: null,
    mediaStreamDestination: null,
  };

  private nextStartTime = 0;
  private audioSources: Set<AudioBufferSourceNode> = new Set();
  private typingSoundSources: Set<AudioBufferSourceNode> = new Set();
  private providerRef: RealtimeProvider | null = null;
  private config: AudioManagerConfig;
  private isAISpeaking: boolean = false;
  private isInterrupted: boolean = false; // Flag to discard incoming audio after client-side interrupt
  private isMuted: boolean = false;
  private selectedDeviceId: string | null = null;
  private currentDevice: MediaDeviceInfo | null = null;
  private enhancedVADManager: EnhancedVADManager | null = null;
  private frameTimestamp: number = 0;
  private clientVADAudioBuffer: string[] = []; // Buffer original provider-rate audio chunks when client VAD is active
  private rollingAudioBuffer: string[] = []; // Rolling buffer for pre-speech audio capture
  private rollingAudioBufferMaxSize: number = 150; // ~1.5 seconds at 100 chunks/sec (10ms chunks)
  private isCurrentlySpeaking: boolean = false; // Track speech state to detect transitions

  constructor(config: AudioManagerConfig = {}) {
    this.config = config;
  }

  private async createOutputAudioContext(sampleRate: number): Promise<void> {
    this.refs.outputContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)({
      sampleRate,
    });

    if (this.refs.outputContext.state === 'suspended') {
      await this.refs.outputContext.resume();
      console.log(`✅ Output AudioContext resumed @ ${sampleRate}Hz`);
    }

    this.refs.outputNode = this.refs.outputContext.createGain();
    this.refs.mediaStreamDestination = this.refs.outputContext.createMediaStreamDestination();
    this.refs.outputNode.connect(this.refs.mediaStreamDestination);
    this.nextStartTime = this.refs.outputContext.currentTime;
  }

  private async ensureOutputAudioContext(sampleRate: number): Promise<void> {
    if (
      this.refs.outputContext?.sampleRate === sampleRate &&
      this.refs.outputNode &&
      this.refs.mediaStreamDestination
    ) {
      return;
    }

    if (this.audioSources.size > 0) {
      this.stopAllAudio();
    }

    if (this.refs.outputContext) {
      try {
        await this.refs.outputContext.close();
      } catch (error) {
        console.warn("⚠️ Failed to close previous output AudioContext:", error);
      }
    }

    this.refs.outputContext = null;
    this.refs.outputNode = null;
    this.refs.mediaStreamDestination = null;

    await this.createOutputAudioContext(sampleRate);
    console.log(`✅ Output audio context initialized @ ${sampleRate}Hz`);
  }

  /**
   * Initialize audio contexts for input and output
   * Also loads the AudioWorklet processor module
   * 
   * CRITICAL for iOS: This must be called synchronously within a user gesture handler.
   * iOS Safari requires AudioContext creation and resume() to happen within the same
   * user gesture event handler. Any async operations between gesture and resume()
   * will cause the AudioContext to remain suspended.
   */
  async initAudio(): Promise<void> {
    // Don't specify sampleRate for input - let browser use hardware default
    // This avoids sample rate mismatch errors on Safari/Firefox
    // The AudioWorklet will handle resampling to 16kHz for Gemini
    this.refs.inputContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    await this.createOutputAudioContext(24000);

    // CRITICAL: Resume AudioContext immediately after creation (within user gesture)
    // iOS Safari requires this to happen synchronously in the user gesture handler
    // If we wait, the context will remain suspended and getUserMedia will fail
    try {
      if (this.refs.inputContext.state === 'suspended') {
        await this.refs.inputContext.resume();
        console.log("✅ Input AudioContext resumed (iOS compatibility)");
      }
      if (this.refs.outputContext?.state === 'suspended') {
        await this.refs.outputContext.resume();
        console.log("✅ Output AudioContext resumed (iOS compatibility)");
      }
    } catch (error) {
      console.warn("⚠️ Failed to resume AudioContext immediately:", error);
      // Continue anyway - resume() will be called again in setupMicrophone()
    }

    this.refs.inputNode = this.refs.inputContext.createGain();
    console.log("✅ MediaStreamDestination created (RTC loopback will be set up in setupMicrophone)");

    // Load AudioWorklet processor module
    // The worklet runs on a separate audio rendering thread for better performance
    try {
      // Check AudioWorklet support
      if (!this.refs.inputContext.audioWorklet) {
        throw new Error(
          "AudioWorklet is not supported in this browser. " +
          "AudioWorklet requires iOS 14.5+ or modern desktop browsers."
        );
      }

      let workletUrl: string;
      let needsCleanup = false;
      
      // Check if running in a Chrome extension context
      const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
      const isIOS = getOperatingSystem() === 'ios';
      
      if (isExtension) {
        // In extension: use web_accessible_resource
        workletUrl = chrome.runtime.getURL('audio-processor.worklet.js');
        console.log('🔌 Loading audio worklet from extension:', workletUrl);
      } else {
        // In regular web page: use blob URL
        // iOS Safari supports blob URLs for AudioWorklet (iOS 14.5+)
        const blob = new Blob([audioWorkletCode], { type: 'application/javascript' });
        workletUrl = URL.createObjectURL(blob);
        needsCleanup = true;
        console.log(`🌐 Loading audio worklet from blob${isIOS ? ' (iOS)' : ''}`);
      }
      
      // Load the worklet module
      // On iOS, this must happen within the user gesture handler chain
      // (which it does, since initAudio() is called from startSession() which is called from user gesture)
      await this.refs.inputContext.audioWorklet.addModule(workletUrl);
      
      // Clean up the blob URL if we created one
      // Note: We can revoke immediately after addModule() resolves - the browser keeps a reference
      if (needsCleanup) {
        URL.revokeObjectURL(workletUrl);
      }
      
      console.log("✅ Audio contexts initialized with AudioWorklet");
    } catch (error: any) {
      console.error("❌ Failed to load AudioWorklet:", error);
      const isIOS = getOperatingSystem() === 'ios';
      
      if (isIOS) {
        // Provide iOS-specific error message
        if (error.message?.includes('not supported') || error.name === 'NotSupportedError') {
          throw new Error(
            "AudioWorklet is not supported on this iOS version. " +
            "Please update to iOS 14.5 or later, or use a different browser."
          );
        } else if (error.message?.includes('user gesture') || error.name === 'InvalidStateError') {
          throw new Error(
            "AudioWorklet initialization failed. On iOS, startSession() must be called " +
            "directly from a user gesture handler (click/touch event)."
          );
        }
      }
      
      throw new Error(`Failed to initialize audio worklet: ${error.message || error}`);
    }
  }

  /**
   * Set up RTC loopback connection for echo cancellation
   * 
   * CRITICAL: This routes BOTH microphone input AND TTS output through the SAME
   * RTCPeerConnection loopback, simulating a real WebRTC peer-to-peer call.
   * This is essential for Chrome's Acoustic Echo Cancellation (AEC) to work.
   * 
   * Architecture:
   * - Mic → RTC Connection (sender) → RTC Loopback Connection (receiver) → MediaStream → Web Audio API → Server
   * - TTS → Web Audio API → MediaStreamDestination → RTC Connection (sender) → RTC Loopback Connection (receiver) → Audio Element → Speakers
   * 
   * Both streams go through the SAME RTCPeerConnection, allowing Chrome's AEC to
   * correlate input/output and cancel echo.
   * 
   * @param micStream - The microphone MediaStream to add to the loopback
   * 
   * Reference: https://gist.github.com/alexciarlillo/4b9f75516f93c10d7b39282d10cd17bc
   */
  private async setupRTCLoopback(micStream: MediaStream): Promise<void> {
    try {
      console.log("🔄 Setting up RTC loopback for echo cancellation...");
      console.log("  Architecture: Mic + TTS → SAME RTC loopback → Output (simulating WebRTC peer call)");

      if (!this.refs.mediaStreamDestination) {
        throw new Error("MediaStreamDestination not initialized");
      }

      // Create two RTCPeerConnections for loopback (simulating LiveKit client ↔ server)
      // rtcConnection = CLIENT side (sends mic → server, receives TTS ← server)
      // rtcLoopbackConnection = SERVER side (receives mic ← client, sends TTS → client)
      this.refs.rtcConnection = new RTCPeerConnection();
      this.refs.rtcLoopbackConnection = new RTCPeerConnection();
      this.refs.micLoopbackStream = new MediaStream(); // SERVER receives mic from CLIENT
      this.refs.ttsLoopbackStream = new MediaStream(); // CLIENT receives TTS from SERVER

      console.log("✅ RTCPeerConnection pair created (simulating LiveKit client ↔ server)");

      // Set up ICE candidate exchange between the two connections
      this.refs.rtcConnection.onicecandidate = (e) => {
        if (e.candidate && this.refs.rtcLoopbackConnection) {
          this.refs.rtcLoopbackConnection.addIceCandidate(new RTCIceCandidate(e.candidate));
        }
      };

      this.refs.rtcLoopbackConnection.onicecandidate = (e) => {
        if (e.candidate && this.refs.rtcConnection) {
          this.refs.rtcConnection.addIceCandidate(new RTCIceCandidate(e.candidate));
        }
      };

      // SERVER side: Receive mic audio from CLIENT
      // This simulates the server receiving microphone audio from the client
      // All audio tracks received by rtcLoopbackConnection are mic audio (from client)
      this.refs.rtcLoopbackConnection.ontrack = (e) => {
        if (e.streams[0] && this.refs.micLoopbackStream) {
          e.streams[0].getAudioTracks().forEach((track) => {
            this.refs.micLoopbackStream!.addTrack(track);
            console.log(`✅ [SERVER] Received mic track from CLIENT: ${track.label || 'audio'}`);
          });
        }
      };

      // CLIENT side: Receive TTS audio from SERVER
      // This simulates the client receiving TTS audio from the server
      // All audio tracks received by rtcConnection are TTS audio (from server)
      this.refs.rtcConnection.ontrack = (e) => {
        if (e.streams[0] && this.refs.ttsLoopbackStream) {
          e.streams[0].getAudioTracks().forEach((track) => {
            this.refs.ttsLoopbackStream!.addTrack(track);
            console.log(`✅ [CLIENT] Received TTS track from SERVER: ${track.label || 'audio'}`);
          });
        }
      };

      // CLIENT SIDE: Add microphone stream to rtcConnection (client → server)
      // This simulates the client sending mic audio to the server
      console.log("🎤 [CLIENT] Adding microphone stream to RTC connection (client → server)...");
      micStream.getTracks().forEach((track) => {
        this.refs.rtcConnection!.addTrack(track, micStream);
      });
      console.log("✅ Microphone stream added (client sending to server)");

      // SERVER SIDE: Add TTS output stream to rtcLoopbackConnection (server → client)
      // This simulates the server sending TTS audio to the client
      console.log("🔊 [SERVER] Adding TTS output stream to RTC loopback connection (server → client)...");
      const outputStream = this.refs.mediaStreamDestination.stream;
      outputStream.getTracks().forEach((track) => {
        this.refs.rtcLoopbackConnection!.addTrack(track, outputStream);
      });
      console.log("✅ TTS output stream added (server sending to client)");

      // Create offer/answer for loopback
      // CLIENT side (rtcConnection) creates offer - wants to send mic and receive TTS
      // SERVER side (rtcLoopbackConnection) creates answer - wants to receive mic and send TTS
      const offerOptions = {
        offerToReceiveAudio: true, // CLIENT wants to receive TTS from server
        offerToReceiveVideo: false,
      };

      const offer = await this.refs.rtcConnection.createOffer(offerOptions);
      await this.refs.rtcConnection.setLocalDescription(offer);

      await this.refs.rtcLoopbackConnection.setRemoteDescription(offer);
      const answer = await this.refs.rtcLoopbackConnection.createAnswer();
      await this.refs.rtcLoopbackConnection.setLocalDescription(answer);

      await this.refs.rtcConnection.setRemoteDescription(answer);

      // Wait for ICE connection to be established
      const iceSuccess = await this.waitForICEConnection();
      if (!iceSuccess) {
        console.warn("⚠️ ICE connection not established, AEC may not work");
      }

      // Create audio element to play TTS from CLIENT receiver side
      // CRITICAL: Chrome's AEC requires the output to be connected to an unmuted audio element
      // According to https://github.com/twilio/twilio-video.js/issues/323 and the RTC loopback hack,
      // the stream MUST be fed into an <audio> element (not just Web Audio API destination)
      // See: https://gist.github.com/alexciarlillo/4b9f75516f93c10d7b39282d10cd17bc#gistcomment-3347305
      this.refs.loopbackAudioElement = document.createElement('audio');
      this.refs.loopbackAudioElement.autoplay = true;
      this.refs.loopbackAudioElement.muted = false; // CRITICAL: Must be unmuted for AEC to work
      this.refs.loopbackAudioElement.srcObject = this.refs.ttsLoopbackStream; // CLIENT receives TTS
      
      // Hide the audio element (it's just for playback, not user-facing controls)
      this.refs.loopbackAudioElement.style.display = 'none';
      document.body.appendChild(this.refs.loopbackAudioElement);
      
      // CRITICAL: Explicitly play the audio element to ensure it's actually playing
      // Autoplay may be blocked by browser policies, so we need to call play() explicitly
      // This is required for Chrome's AEC to activate
      try {
        await this.refs.loopbackAudioElement.play();
        console.log("✅ Audio element is playing (required for AEC)");
      } catch (error: any) {
        console.warn("⚠️ Failed to play audio element (AEC may not work):", error);
        // Note: This might fail due to autoplay policies, but we'll try again when user interacts
      }

      console.log("✅ RTC loopback setup complete (simulating LiveKit agent session)");
      console.log("  → CLIENT (rtcConnection): Sends mic → Receives TTS");
      console.log("  → SERVER (rtcLoopbackConnection): Receives mic → Sends TTS");
      console.log("  → Mic audio comes from SERVER receiver side (for processing)");
      console.log("  → TTS audio comes from CLIENT receiver side (for playback)");
      console.log("  → Echo cancellation should now work properly");
    } catch (error: any) {
      console.error("❌ Failed to set up RTC loopback:", error);
      console.warn("⚠️ Echo cancellation may not work properly");
      // Clean up partial setup
      this.cleanupRTCLoopback();
    }
  }

  /**
   * Wait for ICE connection to be established
   * Returns true if connection succeeds, false if it fails or times out
   */
  private async waitForICEConnection(): Promise<boolean> {
    if (!this.refs.rtcConnection || !this.refs.rtcLoopbackConnection) {
      return false;
    }

    const goodStates = ['completed', 'connected'];
    const maxWaitTime = 2000; // 2 seconds timeout

    return new Promise((resolve) => {
      const checkState = () => {
        const inputState = this.refs.rtcConnection!.iceConnectionState;
        const outputState = this.refs.rtcLoopbackConnection!.iceConnectionState;

        if (goodStates.includes(inputState) && goodStates.includes(outputState)) {
          console.log(`✅ ICE connection established: ${inputState}/${outputState}`);
          resolve(true);
          return;
        }

        if (inputState === 'failed' || outputState === 'failed') {
          console.warn(`⚠️ ICE connection failed: ${inputState}/${outputState}`);
          resolve(false);
          return;
        }
      };

      // Check immediately
      checkState();

      // Set up listeners
      const inputHandler = () => checkState();
      const outputHandler = () => checkState();

      if (this.refs.rtcConnection && this.refs.rtcLoopbackConnection) {
        this.refs.rtcConnection.addEventListener('iceconnectionstatechange', inputHandler);
        this.refs.rtcLoopbackConnection.addEventListener('iceconnectionstatechange', outputHandler);
      }

      // Timeout after maxWaitTime
      setTimeout(() => {
        const rtcConn = this.refs.rtcConnection;
        const rtcLoopbackConn = this.refs.rtcLoopbackConnection;
        
        if (rtcConn && rtcLoopbackConn) {
          rtcConn.removeEventListener('iceconnectionstatechange', inputHandler);
          rtcLoopbackConn.removeEventListener('iceconnectionstatechange', outputHandler);
          
          const inputState = rtcConn.iceConnectionState;
          const outputState = rtcLoopbackConn.iceConnectionState;
          
          if (!goodStates.includes(inputState) || !goodStates.includes(outputState)) {
            console.warn(`⚠️ ICE connection timeout: ${inputState}/${outputState}`);
            resolve(false);
          } else {
            resolve(true);
          }
        } else {
          resolve(false);
        }
      }, maxWaitTime);
    });
  }

  /**
   * Clean up RTC loopback resources
   */
  private cleanupRTCLoopback(): void {
    if (this.refs.loopbackAudioElement) {
      this.refs.loopbackAudioElement.pause();
      this.refs.loopbackAudioElement.srcObject = null;
      if (this.refs.loopbackAudioElement.parentNode) {
        this.refs.loopbackAudioElement.parentNode.removeChild(this.refs.loopbackAudioElement);
      }
      this.refs.loopbackAudioElement = null;
    }

    if (this.refs.micLoopbackStream) {
      this.refs.micLoopbackStream.getTracks().forEach((track) => track.stop());
      this.refs.micLoopbackStream = null;
    }

    if (this.refs.ttsLoopbackStream) {
      this.refs.ttsLoopbackStream.getTracks().forEach((track) => track.stop());
      this.refs.ttsLoopbackStream = null;
    }

    if (this.refs.rtcConnection) {
      this.refs.rtcConnection.close();
      this.refs.rtcConnection = null;
    }

    if (this.refs.rtcLoopbackConnection) {
      this.refs.rtcLoopbackConnection.close();
      this.refs.rtcLoopbackConnection = null;
    }

    if (this.refs.mediaStreamDestination) {
      this.refs.mediaStreamDestination.disconnect();
      this.refs.mediaStreamDestination = null;
    }
  }

  /**
   * Setup microphone and start streaming to session
   * @param provider - The realtime provider to stream audio to
   * @param onStatusUpdate - Callback for status updates
   * @param deviceId - Optional device ID to use (if not provided, uses default or previously selected device)
   * 
   * CRITICAL for iOS: This must be called within a user gesture handler chain.
   * getUserMedia() requires user gesture on iOS Safari.
   */
  async setupMicrophone(
    provider: RealtimeProvider,
    onStatusUpdate?: (status: string) => void,
    deviceId?: string
  ): Promise<void> {
    if (!this.refs.inputContext) {
      throw new Error("Audio context not initialized");
    }

    this.providerRef = provider;
    const inputAudioFormat = provider.getInputAudioFormat();
    const outputAudioFormat = provider.getOutputAudioFormat();

    await this.ensureOutputAudioContext(outputAudioFormat.sampleRate);

    // Use provided deviceId or fall back to stored preference
    const deviceToUse = deviceId ?? this.selectedDeviceId;

    // Detect iOS for compatibility adjustments
    const isIOS = getOperatingSystem() === 'ios';
    
    console.log("🎤 Setting up microphone...");
    console.log(`  Provider: ${provider.getProviderId()}`);
    console.log(`  Input sample rate: ${inputAudioFormat.sampleRate}Hz`);
    console.log(`  Output sample rate: ${outputAudioFormat.sampleRate}Hz`);
    console.log(`  Platform: ${isIOS ? 'iOS' : 'Other'}`);
    if (deviceToUse) {
      console.log(`  Device ID: ${deviceToUse}`);
    }
    onStatusUpdate?.("Requesting microphone access...");

    // Ensure AudioContext is resumed (may have been suspended if initAudio was delayed)
    // This is a fallback - ideally resume() was called in initAudio() within user gesture
    if (this.refs.inputContext.state === 'suspended') {
      console.log("⚠️ AudioContext is suspended, attempting to resume...");
      try {
        await this.refs.inputContext.resume();
        console.log("✅ AudioContext resumed successfully");
      } catch (error) {
        console.error("❌ Failed to resume AudioContext:", error);
        throw new Error(
          "Failed to resume audio context. On iOS, this must happen within a user gesture handler. " +
          "Make sure startSession() is called directly from a click/touch event handler."
        );
      }
    }

    // Build audio constraints with iOS compatibility
    // iOS Safari may reject certain constraints, so we make them optional
    const audioConstraints: MediaTrackConstraints = {
      channelCount: 1,
      // iOS Safari compatibility: Make advanced constraints optional
      // Some iOS versions reject echoCancellation, noiseSuppression, autoGainControl
      ...(isIOS ? {
        // On iOS, only use basic constraints that are well-supported
        // The browser will apply its own optimizations
      } : {
        // On other platforms, use full constraints for better audio quality
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }),
    };

    // Add deviceId if specified
    if (deviceToUse) {
      audioConstraints.deviceId = { exact: deviceToUse };
    }

    // Don't specify sampleRate - let browser use hardware default
    // This ensures AudioContext and MediaStream use the same rate
    try {
      this.refs.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
    } catch (error: any) {
      // Provide helpful error messages for iOS-specific issues
      if (isIOS) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error(
            "Microphone permission denied. Please allow microphone access in Safari settings. " +
            "On iOS, microphone access must be granted within a user gesture handler."
          );
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          throw new Error(
            "No microphone found. Please check that your device has a microphone and it's not being used by another app."
          );
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          throw new Error(
            "Microphone is already in use by another application. Please close other apps using the microphone."
          );
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
          // Retry with minimal constraints
          console.warn("⚠️ Audio constraints rejected, retrying with minimal constraints...");
          try {
            this.refs.mediaStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                channelCount: 1,
                ...(deviceToUse ? { deviceId: { exact: deviceToUse } } : {}),
              },
              video: false,
            });
            console.log("✅ Microphone access granted with minimal constraints");
          } catch (retryError: any) {
            throw new Error(
              `Failed to access microphone: ${retryError.message}. ` +
              "On iOS, ensure startSession() is called directly from a user gesture handler."
            );
          }
        } else {
          throw new Error(
            `Failed to access microphone: ${error.message}. ` +
            "On iOS, ensure startSession() is called directly from a user gesture handler."
          );
        }
      } else {
        // Re-throw original error for non-iOS platforms
        throw error;
      }
    }

    // Store the device ID if we successfully got a stream
    if (deviceToUse) {
      this.selectedDeviceId = deviceToUse;
    }

    // Get current device info
    const tracks = this.refs.mediaStream.getAudioTracks();
    if (tracks.length > 0) {
      const trackSettings = tracks[0].getSettings();
      const deviceId = trackSettings.deviceId;
      if (deviceId) {
        // Try to find the device in the available devices list
        try {
          const devices = await this.getAvailableDevices();
          const device = devices.find(d => d.deviceId === deviceId);
          if (device) {
            this.currentDevice = device;
          }
        } catch (error) {
          console.warn("Could not get device info:", error);
        }
      }
    }

    console.log("✅ Microphone access granted");
    
    // Log sample rates for debugging
    const inputSampleRate = this.refs.inputContext.sampleRate;
    console.log(`🎤 Input sample rate: ${inputSampleRate}Hz (will resample to ${inputAudioFormat.sampleRate}Hz)`);
    
    onStatusUpdate?.("Setting up echo cancellation...");

    // CRITICAL: Set up RTC loopback with BOTH mic and TTS streams
    // This routes everything through a single RTCPeerConnection for proper echo cancellation
    await this.setupRTCLoopback(this.refs.mediaStream);

    // Use the MIC LOOPBACK stream (SERVER receiver side) as the audio source
    // This gives us the mic audio AFTER it's passed through RTC and AEC
    // Architecture: CLIENT sends mic → SERVER receives it → Use SERVER receiver for processing
    if (this.refs.micLoopbackStream && this.refs.micLoopbackStream.getAudioTracks().length > 0) {
      console.log("✅ Using SERVER receiver side mic stream for processing (simulating LiveKit server)");
      this.refs.sourceNode = this.refs.inputContext.createMediaStreamSource(
        this.refs.micLoopbackStream
      );
    } else {
      // Fallback: Direct connection if RTC loopback failed
      console.warn("⚠️ RTC loopback not available, using direct microphone connection");
      this.refs.sourceNode = this.refs.inputContext.createMediaStreamSource(
        this.refs.mediaStream
      );
    }
    
    if (this.refs.inputNode) {
      this.refs.sourceNode.connect(this.refs.inputNode);
    }
    
    onStatusUpdate?.("Microphone connected...");

    // Create AudioWorklet node for audio processing
    // AudioWorklet runs on a separate thread, reducing main thread load
    // This is especially important for mobile/Safari performance
    // Pass the input sample rate so the worklet can resample to provider's target rate
    const captureBufferSize = AUDIO_CAPTURE_CONFIG.bufferSize;
    this.refs.workletNode = new AudioWorkletNode(
      this.refs.inputContext,
      'vowel-audio-processor',
      {
        processorOptions: {
          inputSampleRate: inputSampleRate,
          targetSampleRate: inputAudioFormat.sampleRate,
          bufferSize: captureBufferSize,
        }
      }
    );

    // Listen for processed audio data from the worklet
    let chunkCount = 0;
    let smallChunkDetected = false;
    this.refs.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audio' && this.providerRef) {
        // Check if muted - if so, skip sending audio
        if (this.isMuted) {
          return;
        }

        // Audio is already encoded as base64 PCM16 by the worklet
        const base64Data = event.data.data;

        // Decode to get actual byte count
        const bytes = atob(base64Data).length;
        const samples = bytes / 2; // PCM16 = 2 bytes per sample
        const durationMs = (samples / inputAudioFormat.sampleRate) * 1000;
        
        // CRITICAL: Check for small chunks (indicates worklet bug)
        const EXPECTED_CHUNK_SIZE = captureBufferSize * 2; // samples * 2 bytes (PCM16)
        const MIN_ACCEPTABLE_SIZE = 1024; // 512 samples minimum - below this indicates a bug
        
        if (bytes < MIN_ACCEPTABLE_SIZE && !smallChunkDetected) {
          console.error(`❌ CRITICAL: Worklet sending tiny chunks! ${bytes} bytes (expected ${EXPECTED_CHUNK_SIZE})`);
          console.error(`   This indicates the worklet file is outdated or corrupted.`);
          console.error(`   Chunk details: ${samples} samples, ${durationMs.toFixed(1)}ms @ ${inputAudioFormat.sampleRate}Hz`);
          smallChunkDetected = true;
        }
        
        // Log first few chunks to verify size
        if (chunkCount < 5) {
          const status = bytes < MIN_ACCEPTABLE_SIZE ? '❌ TOO SMALL' : 
                        bytes < EXPECTED_CHUNK_SIZE ? '⚠️  SMALL' : '✅ OK';
          console.log(`🎤 [AudioManager] Chunk ${chunkCount + 1}: ${bytes} bytes (${samples} samples, ${durationMs.toFixed(1)}ms @ ${inputAudioFormat.sampleRate}Hz) ${status}`);
        }
        chunkCount++;

        // If EnhancedVADManager is active, process frame for client-side VAD
        // Note: We need to decode PCM16 back to Float32Array for VAD processing
        const isClientVADMode = this.enhancedVADManager && 
                                 this.enhancedVADManager.getMode() === 'client_vad';
        
        if (this.enhancedVADManager) {
          try {
            // Decode base64 to Uint8Array
            const binary = atob(base64Data);
            const uint8Array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              uint8Array[i] = binary.charCodeAt(i);
            }
            
            // Convert Uint8Array to Int16Array (little-endian PCM16)
            const int16Array = new Int16Array(uint8Array.buffer);
            
            // Convert Int16Array to Float32Array (normalized to -1.0 to 1.0)
            const float32Array = new Float32Array(int16Array.length);
            for (let i = 0; i < int16Array.length; i++) {
              // Normalize: divide by 32768.0 to get range [-1.0, 1.0]
              float32Array[i] = int16Array[i] / 32768.0;
            }
            
            // Process frame with EnhancedVADManager
            // VAD expects 16kHz, but provider input may be higher - resample if needed
            let vadFrame = float32Array;
            if (inputAudioFormat.sampleRate !== 16000) {
              // Simple downsampling: take every Nth sample
              const ratio = inputAudioFormat.sampleRate / 16000;
              const vadLength = Math.round(float32Array.length / ratio);
              vadFrame = new Float32Array(vadLength);
              for (let i = 0; i < vadLength; i++) {
                vadFrame[i] = float32Array[Math.round(i * ratio)];
              }
            }
            
            // Process frame with timestamp
            this.frameTimestamp += durationMs;
            this.enhancedVADManager.processFrame(vadFrame, this.frameTimestamp);
          } catch (error) {
            console.warn("⚠️ [AudioManager] Error processing frame for EnhancedVAD:", error);
          }
        }

        // CRITICAL: In client-side VAD mode, only send audio when speech is detected
        // The EnhancedVADManager will buffer audio and emit 'audio:commit' when speech ends
        // We listen to that event to send the batched audio segment
        if (isClientVADMode) {
          const isSpeaking = this.enhancedVADManager?.isSpeaking() ?? false;
          
          // Detect speech start transition
          if (isSpeaking && !this.isCurrentlySpeaking) {
            // Speech just started - prepend rolling buffer to capture pre-speech audio
            console.log(`[AudioManager] Speech started - prepending ${this.rollingAudioBuffer.length} rolling buffer chunks`);
            this.clientVADAudioBuffer = [...this.rollingAudioBuffer, base64Data];
            this.rollingAudioBuffer = []; // Clear rolling buffer
            this.isCurrentlySpeaking = true;
          } else if (isSpeaking && this.isCurrentlySpeaking) {
            // Speech continuing - buffer the audio chunk
            this.clientVADAudioBuffer.push(base64Data);
            console.log(`[AudioManager] Buffered audio chunk (${this.clientVADAudioBuffer.length} total)`);
          } else if (!isSpeaking && this.isCurrentlySpeaking) {
            // Speech just ended
            console.log('[AudioManager] Speech ended - waiting for commit');
            this.isCurrentlySpeaking = false;
            // Don't add to rolling buffer yet - this is the transition frame
          } else {
            // Not speaking - maintain rolling buffer for pre-speech capture
            this.rollingAudioBuffer.push(base64Data);
            
            // Keep rolling buffer at max size (FIFO)
            if (this.rollingAudioBuffer.length > this.rollingAudioBufferMaxSize) {
              this.rollingAudioBuffer.shift(); // Remove oldest chunk
            }
          }
          
          // Don't send audio continuously - only send when VAD commits (speech ends)
          // The audio:commit event handler will send the buffered audio
          return;
        }

        // Send to provider (server-side VAD or disabled mode)
        this.providerRef.sendAudio(base64Data, inputAudioFormat);
      }
    };

    // Connect: Microphone -> Input Gain -> Worklet -> Destination
    if (this.refs.inputNode && this.refs.workletNode) {
      this.refs.inputNode.connect(this.refs.workletNode);
      this.refs.workletNode.connect(this.refs.inputContext.destination);
    }

    console.log("🎤 Microphone streaming started with AudioWorklet");
    onStatusUpdate?.("Listening...");
  }

  /**
   * Decode base64 audio data to Uint8Array
   */
  private decode(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Decode audio data for playback
   */
  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number
  ): Promise<AudioBuffer> {
    const buffer = ctx.createBuffer(
      numChannels,
      data.length / 2 / numChannels,
      sampleRate
    );

    const dataInt16 = new Int16Array(data.buffer);
    const l = dataInt16.length;
    const dataFloat32 = new Float32Array(l);
    for (let i = 0; i < l; i++) {
      dataFloat32[i] = dataInt16[i] / 32768.0;
    }

    // Extract interleaved channels
    if (numChannels === 1) {
      buffer.copyToChannel(dataFloat32, 0);
    } else {
      for (let i = 0; i < numChannels; i++) {
        const channel = dataFloat32.filter(
          (_, index) => index % numChannels === i
        );
        buffer.copyToChannel(channel, i);
      }
    }

    return buffer;
  }

  /**
   * Play audio data (from AI response)
   * @param audioData - Either base64 string or ArrayBuffer
   */
  async playAudio(audioData: string | ArrayBuffer): Promise<void> {
    if (!this.refs.outputContext) {
      console.warn("Output audio context not initialized");
      return;
    }

    const outputAudioFormat = this.providerRef?.getOutputAudioFormat() ?? {
      mimeType: 'audio/pcm;rate=24000',
      sampleRate: this.refs.outputContext.sampleRate,
      channels: 1,
      encoding: 'pcm16',
    };

    // Discard audio if interrupted (client-side VAD detected user speech)
    if (this.isInterrupted) {
      console.log("🚫 [AudioManager] Discarding audio chunk (interrupted by user speech)");
      return;
    }

    try {
      // First audio chunk - AI started speaking
      if (!this.isAISpeaking) {
        this.isAISpeaking = true;
        this.config.onAISpeakingChange?.(true);
        console.log("🤖 AI started speaking");
      }

      console.log("🔊 Playing AI audio response...");
      
      // Handle both base64 string and ArrayBuffer
      let audioBytes: Uint8Array;
      if (typeof audioData === 'string') {
        // Base64 encoded (Gemini, some OpenAI scenarios)
        audioBytes = this.decode(audioData);
      } else {
        // ArrayBuffer (Vowel Prime, OpenAI WebSocket)
        audioBytes = new Uint8Array(audioData);
      }
      
      const audioBuffer = await this.decodeAudioData(
        audioBytes,
        this.refs.outputContext,
        outputAudioFormat.sampleRate,
        outputAudioFormat.channels
      );

      this.nextStartTime = Math.max(
        this.nextStartTime,
        this.refs.outputContext.currentTime
      );

      const source = this.refs.outputContext.createBufferSource();
      source.buffer = audioBuffer;
      // CRITICAL: Connect to outputNode, which routes through MediaStreamDestination
      // and RTC loopback for echo cancellation. Do NOT connect directly to destination.
      source.connect(this.refs.outputNode!);
      source.addEventListener("ended", () => {
        this.audioSources.delete(source);
        console.log("✅ Audio playback completed");

        // If all audio sources finished - AI stopped speaking
        if (this.audioSources.size === 0 && this.isAISpeaking) {
          this.isAISpeaking = false;
          this.config.onAISpeakingChange?.(false);
          console.log("🤖 AI stopped speaking (all audio complete)");
        }
      });

      source.start(this.nextStartTime);
      this.nextStartTime = this.nextStartTime + audioBuffer.duration;
      this.audioSources.add(source);
    } catch (error) {
      console.error("❌ Failed to play audio:", error);
    }
  }

  /**
   * Play typing sound segment
   * Uses separate audio source queue to allow immediate stopping
   * @param audioData - PCM16 audio data (Uint8Array)
   * @param volume - Volume multiplier (0.0 to 1.0)
   * @returns AudioBufferSourceNode instance
   */
  playTypingSound(audioData: Uint8Array, volume: number = 0.3): AudioBufferSourceNode | null {
    if (!this.refs.outputContext) {
      console.warn("⚠️ [AudioManager] Output audio context not initialized for typing sounds");
      return null;
    }

    try {
      // Decode audio data
      const audioBufferPromise = this.decodeAudioData(
        audioData,
        this.refs.outputContext,
        24000, // 24kHz
        1 // mono
      );

      // Play asynchronously
      audioBufferPromise.then((audioBuffer) => {
        if (!this.refs.outputContext) {
          return; // Context was closed
        }

        const source = this.refs.outputContext.createBufferSource();
        source.buffer = audioBuffer;

        // Apply volume via gain node
        const gainNode = this.refs.outputContext.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode);
        // CRITICAL: Connect to outputNode, which routes through MediaStreamDestination
        // and RTC loopback for echo cancellation. Do NOT connect directly to destination.
        gainNode.connect(this.refs.outputNode!);

        // Track for cleanup
        this.typingSoundSources.add(source);

        // Remove from set when ended
        source.addEventListener("ended", () => {
          this.typingSoundSources.delete(source);
        });

        // Start playback immediately (no queueing for typing sounds)
        source.start();
      }).catch((error) => {
        console.error("❌ [AudioManager] Failed to play typing sound:", error);
      });

      // Return null since playback is async
      // The source will be tracked internally
      return null;
    } catch (error) {
      console.error("❌ [AudioManager] Failed to decode typing sound:", error);
      return null;
    }
  }

  /**
   * Stop all typing sounds immediately
   */
  stopTypingSounds(): void {
    const sourcesCount = this.typingSoundSources.size;
    
    if (sourcesCount === 0) {
      return; // Nothing to stop
    }

    console.log(`⏸️ [AudioManager] Stopping ${sourcesCount} typing sound sources...`);

    // Stop and remove all typing sound sources
    let stoppedCount = 0;
    for (const source of this.typingSoundSources.values()) {
      try {
        source.stop();
        this.typingSoundSources.delete(source);
        stoppedCount++;
      } catch (error) {
        // Source may have already ended
        this.typingSoundSources.delete(source);
      }
    }

    console.log(`✅ [AudioManager] Stopped ${stoppedCount}/${sourcesCount} typing sound sources`);
  }

  /**
   * Stop all audio playback (e.g., on interruption)
   */
  stopAllAudio(): void {
    const sourcesCount = this.audioSources.size;
    const wasAISpeaking = this.isAISpeaking;
    
    console.log("⏸️ [AudioManager] Stopping all audio playback...");
    console.log(`  Active audio sources: ${sourcesCount}`);
    console.log(`  Was AI speaking: ${wasAISpeaking}`);
    console.log(`  Next start time before reset: ${this.nextStartTime}`);
    
    // Set interrupted flag to discard incoming audio chunks
    this.isInterrupted = true;
    console.log("🚫 [AudioManager] Interrupt flag set - will discard incoming audio");
    
    // Stop and remove all audio sources
    let stoppedCount = 0;
    for (const source of this.audioSources.values()) {
      try {
        source.stop();
        this.audioSources.delete(source);
        stoppedCount++;
      } catch (error) {
        console.warn('⚠️ [AudioManager] Error stopping audio source:', error);
      }
    }
    
    console.log(`  Stopped ${stoppedCount}/${sourcesCount} audio sources`);
    
    // Reset playback timing
    this.nextStartTime = 0;
    console.log(`  Next start time reset to: ${this.nextStartTime}`);

    // Update AI speaking state
    if (this.isAISpeaking) {
      this.isAISpeaking = false;
      this.config.onAISpeakingChange?.(false);
      console.log("🤖 [AudioManager] AI stopped speaking (interrupted)");
      console.log("  ✅ onAISpeakingChange callback triggered");
    } else {
      console.log("ℹ️ [AudioManager] AI was not speaking");
    }
    
    console.log("✅ [AudioManager] Audio playback stopped successfully");
  }

  /**
   * Clear the interrupt flag to allow audio playback again.
   * Called when a new response starts from the AI.
   */
  clearInterrupt(): void {
    if (this.isInterrupted) {
      console.log("✅ [AudioManager] Interrupt flag cleared - ready to play audio");
      this.isInterrupted = false;
    }
  }

  /**
   * Get available audio input devices
   * 
   * Note: On iOS Safari, getUserMedia must be called from a user gesture context
   * to get device labels. If permission hasn't been granted, this will return
   * devices with empty labels.
   * 
   * @param requirePermission - If true, request getUserMedia first (requires user gesture on iOS)
   * @returns Promise resolving to array of MediaDeviceInfo for audio inputs
   */
  async getAvailableDevices(requirePermission: boolean = false): Promise<MediaDeviceInfo[]> {
    try {
      // Check if we already have an active stream (permission was granted)
      const hasActiveStream = this.refs.mediaStream?.active;
      
      if (requirePermission && !hasActiveStream) {
        // Request permission first to ensure device labels are available
        // NOTE: On iOS Safari, this MUST be called from a user gesture handler
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the temp stream immediately - we just needed it for permission
        tempStream.getTracks().forEach(track => track.stop());
      }
      
      // Enumerate all devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filter to only audio input devices
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error("Error getting available devices:", error);
      return [];
    }
  }

  /**
   * Check if microphone permission has been granted
   * @returns Promise resolving to true if permission granted, false otherwise
   */
  async hasMicrophonePermission(): Promise<boolean> {
    try {
      // Check permissions API if available
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return result.state === 'granted';
      }
      
      // Fallback: try to enumerate devices and check for labels
      // Devices only have labels if permission was previously granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      return audioInputs.some(d => d.label && d.label.length > 0);
    } catch {
      return false;
    }
  }

  /**
   * Request microphone permission
   * MUST be called from a user gesture handler on iOS Safari
   * @returns Promise resolving to true if permission granted, false otherwise
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      return false;
    }
  }

  /**
   * Get the currently active microphone device
   * @returns MediaDeviceInfo for current device, or null if not available
   */
  getCurrentDevice(): MediaDeviceInfo | null {
    return this.currentDevice;
  }

  /**
   * Switch to a different microphone device
   * This will reinitialize the microphone stream with the new device
   * @param deviceId - The device ID to switch to
   * @param provider - The realtime provider (required if microphone is already set up)
   * @param onStatusUpdate - Optional status update callback
   */
  async switchDevice(
    deviceId: string,
    provider?: RealtimeProvider,
    onStatusUpdate?: (status: string) => void
  ): Promise<void> {
    // Store the device preference
    this.selectedDeviceId = deviceId;

    // If microphone is already set up and provider is available, reinitialize
    if (this.refs.mediaStream && provider) {
      console.log("🔄 Switching microphone device...");
      
      // Stop current stream
      this.refs.mediaStream.getTracks().forEach(track => track.stop());
      
      // Disconnect current source node
      if (this.refs.sourceNode) {
        this.refs.sourceNode.disconnect();
        this.refs.sourceNode = null;
      }

      // Disconnect worklet node
      if (this.refs.workletNode) {
        this.refs.workletNode.port.onmessage = null;
        this.refs.workletNode.disconnect();
        this.refs.workletNode = null;
      }

      // Set up microphone again with new device
      await this.setupMicrophone(provider, onStatusUpdate, deviceId);
      
      console.log("✅ Microphone device switched successfully");
    } else {
      console.log("📝 Device preference saved (will apply on next microphone setup)");
    }
  }

  /**
   * Cleanup all audio resources
   */
  cleanup(): void {
    console.log("🧹 Cleaning up audio resources...");

    // Stop media stream
    if (this.refs.mediaStream) {
      this.refs.mediaStream.getTracks().forEach((track) => track.stop());
      this.refs.mediaStream = null;
      console.log("✅ Media stream stopped");
    }

    // Disconnect audio nodes
    if (this.refs.workletNode) {
      this.refs.workletNode.port.onmessage = null;
      this.refs.workletNode.disconnect();
      this.refs.workletNode = null;
    }

    if (this.refs.sourceNode) {
      this.refs.sourceNode.disconnect();
      this.refs.sourceNode = null;
    }

    // Stop all audio playback (including typing sounds)
    this.stopAllAudio();
    this.stopTypingSounds();

    // Clean up RTC loopback
    this.cleanupRTCLoopback();

    // Close audio contexts
    if (this.refs.inputContext) {
      this.refs.inputContext.close();
      this.refs.inputContext = null;
    }

    if (this.refs.outputContext) {
      this.refs.outputContext.close();
      this.refs.outputContext = null;
    }

    this.providerRef = null;
    this.clientVADAudioBuffer = []; // Clear VAD audio buffer
    this.rollingAudioBuffer = []; // Clear rolling buffer
    this.isCurrentlySpeaking = false; // Reset speaking state
    console.log("✅ Audio cleanup complete");
  }

  /**
   * Get the media stream for VAD integration
   * 
   * CRITICAL: Returns the SERVER receiver side stream (micLoopbackStream) if available,
   * which is what the SERVER receives from the CLIENT. This ensures VAD processes
   * audio that has gone through the RTC loopback and AEC.
   * 
   * Falls back to original mediaStream if RTC loopback is not set up.
   */
  getMediaStream(): MediaStream | null {
    // Prefer micLoopbackStream (SERVER receiver side) - this is what SERVER receives from CLIENT
    // This ensures VAD processes audio that has gone through RTC and AEC
    if (this.refs.micLoopbackStream && this.refs.micLoopbackStream.getAudioTracks().length > 0) {
      console.log("✅ [AudioManager] getMediaStream() returning SERVER receiver stream (micLoopbackStream)");
      return this.refs.micLoopbackStream;
    }
    
    // Fallback to original stream if RTC loopback not available
    console.log("⚠️ [AudioManager] getMediaStream() falling back to original mediaStream (RTC loopback not available)");
    return this.refs.mediaStream;
  }

  /**
   * Check if audio is initialized
   */
  isInitialized(): boolean {
    return this.refs.inputContext !== null && this.refs.outputContext !== null;
  }

  /**
   * Check if microphone is streaming
   */
  isStreaming(): boolean {
    return this.refs.mediaStream !== null && this.refs.workletNode !== null;
  }

  /**
   * Mute audio input (stop sending audio to server)
   * WebSocket stays connected, but no audio data is transmitted
   */
  setMuted(muted: boolean): void {
    if (this.isMuted === muted) {
      return; // No change
    }

    this.isMuted = muted;
    console.log(`🎤 [AudioManager] Audio input ${muted ? 'muted' : 'unmuted'}`);
  }

  /**
   * Check if audio input is muted
   */
  isMutedState(): boolean {
    return this.isMuted;
  }
  
  /**
   * Set EnhancedVADManager reference for client-side VAD frame processing
   * Called by SessionManager when EnhancedVADManager is initialized
   */
  setEnhancedVADManager(vadManager: EnhancedVADManager | null): void {
    // Remove previous listener if exists
    if (this.enhancedVADManager) {
      this.enhancedVADManager.removeAllListeners('audio:commit');
      this.enhancedVADManager.removeAllListeners('vad:speech:start');
    }
    
    // Clear buffer when disconnecting
    if (!vadManager) {
      this.clientVADAudioBuffer = [];
      this.rollingAudioBuffer = [];
      this.isCurrentlySpeaking = false;
    }
    
    this.enhancedVADManager = vadManager;
    this.frameTimestamp = 0; // Reset timestamp when VAD manager changes
    
    if (vadManager) {
      console.log("✅ [AudioManager] EnhancedVADManager connected for frame processing");
      
      // Listen for audio:commit events - this is when VAD detects speech end
      // and commits the buffered audio segment
      vadManager.on('audio:commit', () => {
        if (!this.providerRef) {
          console.warn("⚠️ [AudioManager] Cannot send committed audio: no provider");
          this.clientVADAudioBuffer = []; // Clear buffer
          return;
        }
        
        try {
          // Check if there's audio to commit
          if (this.clientVADAudioBuffer.length === 0) {
            console.warn("⚠️ [AudioManager] No audio buffered for commit");
            this.rollingAudioBuffer = []; // Clear rolling buffer
            this.isCurrentlySpeaking = false; // Reset speaking state
            return;
          }
          
          console.log(`🎤 [AudioManager] Committing VAD audio: ${this.clientVADAudioBuffer.length} chunks (includes pre-speech padding)`);
          
          // Check if provider supports commitAudio with concatenated buffer
          if (this.providerRef && typeof (this.providerRef as any).commitAudio === 'function') {
            // For client VAD mode (push-to-talk): Concatenate all chunks and send as single commit
            // Decode all base64 chunks to Uint8Array and concatenate
            const audioArrays: Uint8Array[] = [];
            let totalLength = 0;
            
            for (const base64Chunk of this.clientVADAudioBuffer) {
              const binaryString = atob(base64Chunk);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              audioArrays.push(bytes);
              totalLength += bytes.length;
            }
            
            // Concatenate all audio chunks into single ArrayBuffer
            const concatenated = new Uint8Array(totalLength);
            let offset = 0;
            for (const audioArray of audioArrays) {
              concatenated.set(audioArray, offset);
              offset += audioArray.length;
            }
            
            const concatenatedBuffer = concatenated.buffer;
            console.log(`✅ [AudioManager] Concatenated ${this.clientVADAudioBuffer.length} chunks into ${concatenatedBuffer.byteLength} bytes`);
            
            // Send concatenated buffer with commit=true
            (this.providerRef as any).commitAudio(concatenatedBuffer);
          } else {
            // Fallback: Send chunks individually (for providers that don't support commitAudio)
            // This is for server VAD mode or providers without push-to-talk support
            for (const base64Chunk of this.clientVADAudioBuffer) {
              this.providerRef.sendAudio(base64Chunk, {
                mimeType: 'audio/pcm',
                sampleRate: this.providerRef.getInputAudioFormat().sampleRate,
                channels: 1,
                encoding: 'pcm16'
              });
            }
          }
          
          // Clear buffer after sending
          this.clientVADAudioBuffer = [];
          // Note: Don't clear rollingAudioBuffer here - it continues to accumulate
          // for the next speech segment
        } catch (error) {
          console.error("❌ [AudioManager] Error sending committed audio:", error);
          this.clientVADAudioBuffer = []; // Clear buffer on error
          this.rollingAudioBuffer = []; // Clear rolling buffer on error
          this.isCurrentlySpeaking = false; // Reset speaking state on error
        }
      });
    } else {
      console.log("ℹ️ [AudioManager] EnhancedVADManager disconnected");
    }
  }
}
