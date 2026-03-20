/**
 * @fileoverview Session Manager - Handles Gemini Live session lifecycle and communication
 * 
 * This file contains the `SessionManager` class which manages the complete lifecycle
 * of a Gemini Live voice session. It handles connection establishment, message routing,
 * tool execution, audio streaming, and graceful disconnection.
 * 
 * Responsibilities:
 * - Establishing and maintaining WebSocket connection to Gemini Live API
 * - Managing session authentication and token refresh
 * - Routing messages between client and Gemini Live
 * - Coordinating tool/action execution
 * - Managing Voice Activity Detection (VAD)
 * - Handling audio stream setup and teardown
 * - Providing event notifications to the AI
 * 
 * @module @vowel.to/client/managers
 * @author vowel.to
 * @license Proprietary
 */

import type { VowelRoute, VowelVoiceConfig } from "../types";
import { VOWEL_TOKEN_ENDPOINT } from "../types/constants";
import type { ToolContext } from "./ToolManager";
import { ToolManager } from "./ToolManager";
import { AudioManager } from "./AudioManager";
import { VADManager } from "./VADManager";
import { EnhancedVADManager } from "./EnhancedVADManager";
import { registerSimpleVADAdapter } from "../vad";
import type { TypingSoundManager } from "./TypingSoundManager";
import type { VoiceSessionState } from "./StateManager";
import { RealtimeProviderFactory } from "../providers/RealtimeProviderFactory";
import type { RealtimeProvider } from "../providers/RealtimeProvider";
import { RealtimeMessageType } from "../providers/RealtimeProvider";
import type { ProviderType } from "../types/providers";

/**
 * Enable server VAD events to update UI state (button speaking indicator)
 * When true, server VAD events (AUDIO_BUFFER_SPEECH_STARTED/STOPPED) will update
 * the user speaking state even if useServerVad config flag is not set.
 * This allows simple VAD in server_vad mode to update button state.
 */
const ENABLE_SERVER_VAD_UI_UPDATES = false;
const HOSTED_INITIAL_GREETING_DELAY_MS = 150;
const HOSTED_INITIAL_GREETING_PROVIDERS = new Set<ProviderType>(["openai", "grok"]);

/**
 * Message handler callback
 */
export type MessageHandler = (message: any) => void | Promise<void>;

/**
 * Status update callback
 */
export type StatusUpdateHandler = (status: string) => void;

interface DisconnectOptions {
  closeReason?: string;
  notifyClose?: boolean;
  preserveHibernated?: boolean;
}

/**
 * Token response from backend (multi-provider)
 */
interface TokenResponse {
  tokenName: string;
  model: string;
  expiresAt: string;
  provider: ProviderType;
  metadata?: Record<string, any>;
  systemInstructions?: string; // Server-built system instructions (includes app context)
}

/**
 * Session configuration options
 */
export interface SessionConfig {
  /** App ID (optional if using direct token via voiceConfig.token) */
  appId?: string;
  /** Available routes */
  routes: VowelRoute[];
  /** Tool manager for executing tools */
  toolManager: ToolManager;
  /** Audio manager for audio handling */
  audioManager: AudioManager;
  /** Voice configuration */
  voiceConfig?: VowelVoiceConfig;
  /** Custom system instructions for the AI agent */
  instructions?: string;
  /** 
   * @deprecated Use 'instructions' instead
   * Legacy alias for instructions (backward compatibility)
   */
  systemInstructionOverride?: string;
  /** Message handler callback */
  onMessage?: MessageHandler;
  /** Status update callback */
  onStatusUpdate?: StatusUpdateHandler;
  /** Connection opened callback */
  onOpen?: () => void;
  /** Connection closed callback */
  onClose?: (reason: string) => void;
  /** Error callback */
  onError?: (error: string) => void;
  /** Custom Convex platform URL (base URL) */
  convexUrl?: string;
  /** Custom token endpoint URL */
  tokenEndpoint?: string;
  /** Custom token provider function */
  tokenProvider?: (config: any) => Promise<{
    tokenName: string;
    model: string;
    provider: ProviderType;
    expiresAt: string;
    systemInstructions?: string;
  }>;
  /** User speaking state change callback */
  onUserSpeakingChange?: (isSpeaking: boolean) => void;
  /** AI thinking state change callback */
  onAIThinkingChange?: (isThinking: boolean) => void;
  /** Tool execution state change callback */
  onToolExecutingChange?: (isExecuting: boolean) => void;
  /** AI speaking state change callback (already handled by AudioManager) */
  onAISpeakingChange?: (isSpeaking: boolean) => void;
  /** Typing sound manager instance */
  typingSoundManager?: TypingSoundManager;
  /** Transcript event callback (for caption system) */
  onTranscriptEvent?: (event: {
    type: 'delta' | 'done';
    text: string;
    role: 'user' | 'assistant';
    responseId?: string;
    itemId?: string;
  }) => void;
  /** Hibernation state change callback */
  onHibernationChange?: (isHibernated: boolean) => void;
}

/**
 * Session Manager class
 * Manages realtime voice session lifecycle (multi-provider)
 */
export class SessionManager {
  private config: SessionConfig;
  private provider: RealtimeProvider | null = null;
  private vadManager: VADManager | null = null; // Legacy VADManager (for backward compatibility)
  private enhancedVADManager: EnhancedVADManager | null = null; // New EnhancedVADManager (for client_vad mode)
  private isAIThinking: boolean = false;
  private isToolExecuting: boolean = false;
  private isResponseInProgress: boolean = false; // Track if response generation is in progress
  //@ts-ignore
  private isHibernated: boolean = false; // Track if session is hibernated
  private userStoppedSpeakingTime: number = 0;
  private thinkingInitiatedBySpeech: boolean = false; // Track if thinking started from speech_stopped
  private toolInitiatedThinkingTimeout: ReturnType<typeof setTimeout> | null = null;
  private TOOL_THINKING_TIMEOUT_MS: number = 30000; // 30 seconds timeout for tool-initiated thinking
  
  // Step limiting and failure tracking
  private totalStepCount: number = 0;
  private maxSteps: number = 30;
  private hasReachedStepLimit: boolean = false;
  
  // Track consecutive failures per tool (for AI-guided retry)
  private toolFailureCount: Map<string, number> = new Map();
  private maxToolFailures: number = 3;
  
  // Timing tracking for initialization
  private initTimings: {
    startTime?: number;
    tokenRequestStart?: number;
    tokenRequestEnd?: number;
    connectionStart?: number;
    connectionEnd?: number;
    microphoneStart?: number;
    microphoneEnd?: number;
    vadStart?: number;
    vadEnd?: number;
    setupCompleteTime?: number;
  } = {};
  
  // Context management
  private currentContext: Record<string, unknown> | null = null; // Dynamic context object that gets stringified and appended to system prompt
  private baseInstructions: string = ""; // Store original instructions (before context is added)
  private initialGreetingTimeout: ReturnType<typeof setTimeout> | null = null;
  private idleHibernateTimeout: ReturnType<typeof setTimeout> | null = null;
  private isClientSpeechActive: boolean = false;
  private isServerSpeechActive: boolean = false;
  private isAssistantAudioActive: boolean = false;
  private managedCloseReason: string | null = null;
  private suppressProviderClose: boolean = false;
  private isInitializingSession: boolean = false;
  private providerLifecycleId: number = 0;

  constructor(config: SessionConfig) {
    this.config = config;
    
    // Initialize step limiting configuration from voice config
    const retryConfig = config.voiceConfig?.toolRetry;
    if (retryConfig) {
      this.maxSteps = retryConfig.maxSteps ?? 30;
      this.maxToolFailures = retryConfig.maxRetries ?? 3;
    }
    
    console.log(`🔧 [SessionManager] Tool execution limits:`);
    console.log(`   Max total steps: ${this.maxSteps}`);
    console.log(`   Max failures per tool: ${this.maxToolFailures}`);
    console.log(`   Strategy: AI-guided retry (AI sees errors and can self-correct)`);
  }

  /**
   * Update tool execution state
   * @param isExecuting - New tool execution state
   */
  private updateToolExecutingState(isExecuting: boolean): void {
    if (this.isToolExecuting === isExecuting) {
      return; // No change
    }

    this.isToolExecuting = isExecuting;
    this.config.onToolExecutingChange?.(isExecuting);
    this.updateIdleHibernateTimer("tool execution state changed");
  }

  /**
   * Update AI thinking state and trigger typing sounds
   * @param isThinking - New thinking state
   * @param initiatedBySpeech - Whether thinking was initiated by speech_stopped (default: false)
   */
  private updateThinkingState(isThinking: boolean, initiatedBySpeech: boolean = false): void {
    if (this.isAIThinking === isThinking) {
      return; // No change
    }

    // Clear any existing timeout
    if (this.toolInitiatedThinkingTimeout) {
      clearTimeout(this.toolInitiatedThinkingTimeout);
      this.toolInitiatedThinkingTimeout = null;
    }

    this.isAIThinking = isThinking;
    
    if (isThinking) {
      this.thinkingInitiatedBySpeech = initiatedBySpeech;
      
      // If thinking was NOT initiated by speech (i.e., started by tool call),
      // set a timeout to clear it
      if (!initiatedBySpeech) {
        this.toolInitiatedThinkingTimeout = setTimeout(() => {
          if (this.isAIThinking && !this.thinkingInitiatedBySpeech) {
            console.log("⏱️ [SessionManager] Tool-initiated thinking timeout - clearing thinking state");
            this.updateThinkingState(false);
          }
        }, this.TOOL_THINKING_TIMEOUT_MS);
      }
    } else {
      this.thinkingInitiatedBySpeech = false;
    }

    this.config.onAIThinkingChange?.(isThinking);
    this.updateIdleHibernateTimer("thinking state changed");

    // Start/stop typing sounds
    if (isThinking) {
      this.config.typingSoundManager?.start().then(() => {
        console.log('🎵 [SessionManager] Typing sounds started');
      }).catch((error) => {
        console.warn('⚠️ [SessionManager] Failed to start typing sounds:', error);
      });
    } else {
      this.config.typingSoundManager?.stop();
      console.log('🎵 [SessionManager] Typing sounds stopped');
    }
  }

  /**
   * Fetch token from HTTP endpoint
   * 
   * This replaces the Convex action call with a direct HTTP request
   * to the Vowel platform API endpoint.
   * 
   * @param params - Request parameters
   * @param endpoint - Custom endpoint URL (optional, uses default if not provided)
   * @returns Token response
   */
  private async fetchToken(params: {
    appId: string;
    origin: string;
    config: any;
  }, endpoint?: string): Promise<TokenResponse> {
    // Construct endpoint if not provided
    let tokenEndpoint: string;
    if (endpoint) {
      tokenEndpoint = endpoint;
    } else if (this.config.convexUrl) {
      const baseUrl = this.config.convexUrl.replace(/\/$/, ''); // Remove trailing slash
      tokenEndpoint = `${baseUrl}/vowel/api/generateToken`;
    } else {
      tokenEndpoint = VOWEL_TOKEN_ENDPOINT;
    }
    console.log("🔐 Fetching token from HTTP endpoint:", tokenEndpoint);
    
    try {
      const response = await fetch(tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error("❌ Failed to fetch token:", error);
      throw new Error(`Failed to fetch token: ${error.message}`);
    }
  }

  /**
   * Check if session is active
   */
  isActive(): boolean {
    return this.provider !== null && this.provider.getConnectionState() === "connected";
  }

  /**
   * Get the underlying provider
   */
  getProvider(): RealtimeProvider | null {
    return this.provider;
  }

  /**
   * Get default model for a given provider
   */
  private getDefaultModelForProvider(provider: string): string {
    switch (provider) {
      case 'gemini':
        return 'gemini-2.0-flash-live-001';
      case 'openai':
        return 'gpt-4o-realtime-preview';
      case 'vowel-prime':
        return 'vowel-prime';
      default:
        return 'gemini-2.0-flash-live-001';
    }
  }

  private clearPendingInitialGreeting(): void {
    if (this.initialGreetingTimeout) {
      clearTimeout(this.initialGreetingTimeout);
      this.initialGreetingTimeout = null;
    }
  }

  private getClientIdleHibernateTimeoutMs(): number | null {
    const timeoutMs = this.config.voiceConfig?.clientIdleHibernateTimeoutMs;
    return typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : null;
  }

  private clearIdleHibernateTimer(): void {
    if (this.idleHibernateTimeout) {
      clearTimeout(this.idleHibernateTimeout);
      this.idleHibernateTimeout = null;
    }
  }

  private refreshIdleHibernateTimer(context: string): void {
    this.clearIdleHibernateTimer();
    this.updateIdleHibernateTimer(context);
  }

  private hasActiveSessionWork(): boolean {
    return (
      this.isClientSpeechActive ||
      this.isServerSpeechActive ||
      this.isAssistantAudioActive ||
      this.isAIThinking ||
      this.isToolExecuting ||
      this.isResponseInProgress
    );
  }

  private updateIdleHibernateTimer(context: string): void {
    const timeoutMs = this.getClientIdleHibernateTimeoutMs();
    if (!timeoutMs) {
      this.clearIdleHibernateTimer();
      return;
    }

    if (
      this.isInitializingSession ||
      this.suppressProviderClose ||
      !this.provider ||
      this.provider.getConnectionState() !== "connected" ||
      this.isHibernated
    ) {
      this.clearIdleHibernateTimer();
      return;
    }

    if (this.hasActiveSessionWork()) {
      this.clearIdleHibernateTimer();
      console.log(`⏱️ [SessionManager] Idle hibernation paused (${context}): session is active`);
      return;
    }

    if (this.idleHibernateTimeout) {
      return;
    }

    console.log(`⏱️ [SessionManager] Scheduling client idle hibernation in ${timeoutMs}ms (${context})`);
    this.idleHibernateTimeout = setTimeout(() => {
      this.idleHibernateTimeout = null;
      void this.hibernateForIdleTimeout(timeoutMs);
    }, timeoutMs);
  }

  private setClientSpeechActive(isActive: boolean, source: string): void {
    if (this.isClientSpeechActive === isActive) {
      return;
    }

    this.isClientSpeechActive = isActive;
    this.updateIdleHibernateTimer(`client speech ${source}`);
  }

  private setServerSpeechActive(isActive: boolean, source: string): void {
    if (this.isServerSpeechActive === isActive) {
      return;
    }

    this.isServerSpeechActive = isActive;
    this.updateIdleHibernateTimer(`server speech ${source}`);
  }

  private setAssistantAudioActive(isActive: boolean, source: string): void {
    if (this.isAssistantAudioActive === isActive) {
      return;
    }

    this.isAssistantAudioActive = isActive;
    this.updateIdleHibernateTimer(`assistant audio ${source}`);
  }

  private isStaleProviderCallback(expectedLifecycleId: number, callbackName: string): boolean {
    if (expectedLifecycleId !== this.providerLifecycleId) {
      console.log(
        `ℹ️ [SessionManager] Ignoring stale provider callback (${callbackName}) for lifecycle ${expectedLifecycleId}; current lifecycle is ${this.providerLifecycleId}`
      );
      return true;
    }

    return false;
  }

  private async hibernateForIdleTimeout(timeoutMs: number): Promise<void> {
    if (!this.provider || this.provider.getConnectionState() !== "connected") {
      return;
    }

    if (this.hasActiveSessionWork()) {
      this.updateIdleHibernateTimer("idle timeout skipped due to renewed activity");
      return;
    }

    console.log(`💤 [SessionManager] Client idle hibernation triggered after ${timeoutMs}ms`);
    this.isHibernated = true;
    this.config.onHibernationChange?.(true);
    this.config.onStatusUpdate?.("Sleeping...");

    await this.disconnect({
      closeReason: `Client idle hibernation after ${timeoutMs}ms`,
      notifyClose: true,
      preserveHibernated: true,
    });
  }

  private scheduleHostedInitialGreeting(provider: ProviderType): void {
    const initialGreetingPrompt = this.config.voiceConfig?.initialGreetingPrompt?.trim();
    if (!initialGreetingPrompt || !HOSTED_INITIAL_GREETING_PROVIDERS.has(provider)) {
      return;
    }

    if (!this.provider?.sendText) {
      console.warn(`⚠️ [SessionManager] Cannot schedule initial greeting for ${provider}: provider does not support text input`);
      return;
    }

    this.clearPendingInitialGreeting();

    console.log(
      `⏳ [SessionManager] Scheduling hosted initial greeting for ${provider} in ${HOSTED_INITIAL_GREETING_DELAY_MS}ms`
    );

    this.initialGreetingTimeout = setTimeout(() => {
      this.initialGreetingTimeout = null;

      if (!this.provider || this.provider.getConnectionState() !== "connected") {
        console.warn(`⚠️ [SessionManager] Skipping initial greeting for ${provider}: session is no longer connected`);
        return;
      }

      if (!this.provider.sendText) {
        console.warn(`⚠️ [SessionManager] Skipping initial greeting for ${provider}: provider does not support text input`);
        return;
      }

      const prompt = [
        "Notify the user that the voice session is ready and deliver the initial greeting now.",
        `Follow this greeting guidance: ${initialGreetingPrompt}`,
      ].join("\n\n");

      console.log(`👋 [SessionManager] Triggering hosted initial greeting for ${provider}`);
      this.provider.sendText(prompt);
      this.refreshIdleHibernateTimer("initial greeting prompt");
    }, HOSTED_INITIAL_GREETING_DELAY_MS);
  }

  /**
   * Log comprehensive initialization timing breakdown
   */
  // @ts-ignore - Method kept for future debugging but not currently used
  private logInitializationTimings(): void {
    const t = this.initTimings;
    
    if (!t.startTime) return;
    
    // Calculate durations
    const tokenDuration = t.tokenRequestEnd && t.tokenRequestStart 
      ? t.tokenRequestEnd - t.tokenRequestStart 
      : 0;
    
    const connectionDuration = t.connectionEnd && t.connectionStart 
      ? t.connectionEnd - t.connectionStart 
      : 0;
    
    const microphoneDuration = t.microphoneEnd && t.microphoneStart 
      ? t.microphoneEnd - t.microphoneStart 
      : 0;
    
    const vadDuration = t.vadEnd && t.vadStart 
      ? t.vadEnd - t.vadStart 
      : 0;
    
    const geminiSetupDuration = t.setupCompleteTime && t.connectionEnd 
      ? t.setupCompleteTime - t.connectionEnd 
      : 0;
    
    const totalDuration = t.setupCompleteTime 
      ? t.setupCompleteTime - t.startTime 
      : 0;
    
    // Create visual breakdown
    console.log("\n" + "=".repeat(70));
    console.log("⏱️  VOWEL SESSION INITIALIZATION TIMING BREAKDOWN");
    console.log("=".repeat(70));
    
    console.log("\n📊 Stage Timings:");
    console.log(`   1️⃣  Token Request (HTTP):        ${tokenDuration}ms`);
    console.log(`   2️⃣  WebSocket Connection:         ${connectionDuration}ms`);
    console.log(`   3️⃣  Microphone Setup:            ${microphoneDuration}ms`);
    console.log(`   4️⃣  VAD Initialization:          ${vadDuration}ms`);
    console.log(`   5️⃣  Gemini Setup (server-side):  ${geminiSetupDuration}ms  ⚠️ KEY DELAY`);
    console.log(`   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   🎯 TOTAL TIME TO READY:          ${totalDuration}ms\n`);
    
    // Percentage breakdown
    if (totalDuration > 0) {
      console.log("📈 Time Distribution:");
      console.log(`   Token Request:     ${((tokenDuration / totalDuration) * 100).toFixed(1)}%`);
      console.log(`   WebSocket:         ${((connectionDuration / totalDuration) * 100).toFixed(1)}%`);
      console.log(`   Microphone:        ${((microphoneDuration / totalDuration) * 100).toFixed(1)}%`);
      console.log(`   VAD:               ${((vadDuration / totalDuration) * 100).toFixed(1)}%`);
      console.log(`   Gemini Setup:      ${((geminiSetupDuration / totalDuration) * 100).toFixed(1)}% ⚠️\n`);
    }
    
    // Performance assessment
    console.log("💡 Performance Assessment:");
    if (geminiSetupDuration > 3000) {
      console.log("   ⚠️  Gemini setup is taking significant time (>3s)");
      console.log("   💭 This is normal for first connection or complex configs");
    } else if (geminiSetupDuration > 2000) {
      console.log("   ✅ Gemini setup time is reasonable (2-3s)");
    } else {
      console.log("   🚀 Excellent Gemini setup time (<2s)");
    }
    
    if (totalDuration > 5000) {
      console.log("   ⏳ Total init time is high - consider optimizing");
    } else {
      console.log("   ✨ Good overall initialization time");
    }
    
    console.log("\n" + "=".repeat(70) + "\n");
    
    // Actionable insights
    if (geminiSetupDuration > connectionDuration + microphoneDuration + vadDuration) {
      console.log("🎯 Optimization Insight:");
      console.log("   Most delay is in Gemini server-side setup.");
      console.log("   Consider: warming up with an initial greeting prompt.\n");
    }
  }


  /**
   * Handle tool calls from Gemini
   */
  // @ts-ignore - Legacy method kept for reference but replaced by handleProviderMessage
  private async handleToolCalls(
    functionCalls: any[],
    context: ToolContext
  ): Promise<void> {
    console.log(`🔧 Received ${functionCalls.length} tool call(s)`);

    const functionResponses: Array<{ id: any; name: any; response: any }> = [];

    for (const call of functionCalls) {
      // Handle both formats: direct function calls and parts with functionCall
      const functionCall = call.functionCall || call;
      if (!functionCall) continue;

      const { id, name, args } = functionCall;
      console.log(`🔧 Executing tool: ${name} (ID: ${id})`);
      console.log(`   Args:`, JSON.stringify(args, null, 2));

      try {
        const result = await this.config.toolManager.executeTool(
          name,
          args || {},
          context
        );

        console.log(`✅ Tool ${name} executed successfully:`, result);

        functionResponses.push({
          id,
          name,
          response: result,
        });
      } catch (error: any) {
        console.error(`❌ Failed to execute tool ${name}:`, error);

        functionResponses.push({
          id,
          name,
          response: {
            success: false,
            error: error.message || "Tool execution failed",
          },
        });
      }
    }

    // Note: Tool responses are now handled through the provider abstraction
    // The provider will handle sending tool responses back to the API
    if (functionResponses.length > 0) {
      console.log(
        `📤 Tool responses prepared: ${functionResponses.length}`
      );
      
      // Log tool response data
      console.log('📋 Tool responses:');
      functionResponses.forEach((fr, i) => {
        console.log(`  Response ${i + 1}:`);
        console.log(`    Tool: ${fr.name}`);
        console.log(`    ID: ${fr.id}`);
        console.log(`    Success:`, fr.response.success !== false);
      });
    }
  }

  /**
   * Handle normalized messages from realtime provider
   */
  private async handleProviderMessage(
    message: any,
    context: ToolContext
  ): Promise<void> {
    try {
      // Call external message handler
      this.config.onMessage?.(message);

      // Handle message based on type
      const messageType = message.type;

      switch (messageType) {
        case RealtimeMessageType.SESSION_CREATED:
        case RealtimeMessageType.SESSION_UPDATED:
          this.initTimings.setupCompleteTime = Date.now();
          console.log("✅ Session setup complete");
          this.config.onStatusUpdate?.("Connected - ready to listen");
          this.updateIdleHibernateTimer("session ready");
          break;

        case RealtimeMessageType.AUDIO_BUFFER_SPEECH_STARTED:
          // Server-side VAD detected user started speaking
          this.clearPendingInitialGreeting();
          this.setServerSpeechActive(true, "started");
          if (this.config.voiceConfig?.useServerVad || ENABLE_SERVER_VAD_UI_UPDATES) {
            console.log("🗣️ [SessionManager] User started speaking (server VAD)");
            this.config.onUserSpeakingChange?.(true);
          }
          break;

        case RealtimeMessageType.AUDIO_BUFFER_SPEECH_STOPPED:
          // Server-side VAD detected user stopped speaking
          this.setServerSpeechActive(false, "stopped");
          if (this.config.voiceConfig?.useServerVad || ENABLE_SERVER_VAD_UI_UPDATES) {
            console.log("🔇 [SessionManager] User stopped speaking (server VAD)");
            this.config.onUserSpeakingChange?.(false);
          }
          
          // Don't start thinking here - wait for turn_started (response.created)
          // There may be a delay between speech stopping and response creation
          console.log("🔇 [SessionManager] User stopped speaking - waiting for turn_started to start thinking");
          break;

        case RealtimeMessageType.RESPONSE_CREATED:
          // Response generation started (turn_started) - start thinking state
          // This is when AI actually begins processing/generating a response
          this.clearPendingInitialGreeting();
          this.isResponseInProgress = true;
          
          // Clear interrupt flag so new audio can play
          this.config.audioManager.clearInterrupt();
          
          // User is no longer speaking when AI starts responding
          this.setClientSpeechActive(false, "response created");
          this.setServerSpeechActive(false, "response created");
          this.config.onUserSpeakingChange?.(false);
          
          // Start thinking state when turn starts
          // Mark as initiated by response (no timeout - will end on turn_done)
          if (!this.isAIThinking) {
            this.updateThinkingState(true, true); // true = initiated by response (no timeout)
            console.log("🧠 [SessionManager] Thinking started (turn_started/response.created)");
          }
          
          console.log("🤖 [SessionManager] ═══════════════════════════════════════");
          console.log("🤖 [SessionManager] RESPONSE_CREATED received (turn_started)");
          console.log("🤖 [SessionManager] Response ID:", message.payload?.responseId);
          console.log("🤖 [SessionManager] Setting isResponseInProgress = true");
          console.log("🤖 [SessionManager] Thinking state:", this.isAIThinking);
          console.log("🤖 [SessionManager] Tool executing state:", this.isToolExecuting);
          console.log("🤖 [SessionManager] ═══════════════════════════════════════");
          break;

        case RealtimeMessageType.RESPONSE_DONE:
          // Response generation complete (turn_done) - clear all states
          // Thinking state lasts from turn_started to turn_done
          console.log("✅ [SessionManager] ═══════════════════════════════════════");
          console.log("✅ [SessionManager] RESPONSE_DONE received (turn_done)");
          console.log("✅ [SessionManager] Response ID:", message.payload?.responseId);
          console.log("✅ [SessionManager] Full payload:", JSON.stringify(message.payload, null, 2));
          console.log("✅ [SessionManager] Current isResponseInProgress:", this.isResponseInProgress);
          console.log("✅ [SessionManager] Current thinking state:", this.isAIThinking);
          console.log("✅ [SessionManager] Current tool executing state:", this.isToolExecuting);
          
          this.isResponseInProgress = false;
          this.setAssistantAudioActive(false, "response done");
          
          // Clear thinking state - thinking lasts from turn_started to turn_done
          if (this.isAIThinking) {
            console.log("✅ [SessionManager] Clearing thinking state (turn_done received)...");
            this.updateThinkingState(false);
            console.log("✅ [SessionManager] Thinking state cleared");
          } else {
            console.log("✅ [SessionManager] Thinking state was already false");
          }
          
          if (this.isToolExecuting) {
            console.log("✅ [SessionManager] Clearing tool execution state...");
            this.updateToolExecutingState(false);
            console.log("✅ [SessionManager] Tool execution state cleared");
          } else {
            console.log("✅ [SessionManager] Tool execution state was already false");
          }
          
          console.log("✅ [SessionManager] All states cleared - turn complete");
          console.log("✅ [SessionManager] ═══════════════════════════════════════");
          break;

        case RealtimeMessageType.RESPONSE_CANCELLED:
          // Response was cancelled - clear states
          this.isResponseInProgress = false;
          this.setAssistantAudioActive(false, "response cancelled");
          if (this.isAIThinking) {
            this.updateThinkingState(false);
            console.log("🚫 [SessionManager] Response cancelled - thinking cleared");
          }
          if (this.isToolExecuting) {
            this.updateToolExecutingState(false);
            console.log("🚫 [SessionManager] Response cancelled - tool execution cleared");
          }
          break;

        case RealtimeMessageType.AUDIO_DELTA:
          // Play audio chunk (skip if provider handles audio internally)
          if (this.provider && !this.provider.handlesAudioInternally()) {
            // Payload can be either base64 string (delta) or ArrayBuffer (audio)
            const audioData = message.payload.delta || message.payload.audio;
            await this.config.audioManager.playAudio(audioData);
          }
          
          // AI started speaking - speaking state will override thinking visually
          // But don't clear thinking state - it persists until response.done
          // The UI components prioritize speaking over thinking
          this.setAssistantAudioActive(true, "delta");
          console.log("🔊 [SessionManager] AI speaking (thinking persists until response.done)");
          break;

        case RealtimeMessageType.AUDIO_DONE:
          // Audio playback complete - speaking ends
          // If response is still in progress, thinking should resume (already active)
          this.setAssistantAudioActive(false, "done");
          console.log("✅ [SessionManager] Audio playback complete");
          if (this.isResponseInProgress && this.isAIThinking) {
            console.log("💭 [SessionManager] Thinking resumes (response still in progress)");
          }
          break;

        case RealtimeMessageType.AUDIO_INTERRUPTED:
          // User spoke over AI - stop audio playback immediately
          console.log("⚡ [SessionManager] ═══════════════════════════════════════");
          console.log("⚡ [SessionManager] AUDIO INTERRUPT DETECTED");
          console.log("⚡ [SessionManager] ═══════════════════════════════════════");
          console.log("  Event type:", messageType);
          console.log("  Timestamp:", new Date().toISOString());
          console.log("  Provider:", this.provider?.getProviderId());
          console.log("  Action: Stopping audio playback immediately");
          
          // Stop all audio playback
          this.config.audioManager.stopAllAudio();
          this.setAssistantAudioActive(false, "interrupted");
          
          // Clear thinking and tool execution states on interrupt
          if (this.isAIThinking) {
            this.updateThinkingState(false);
            console.log("⚡ [SessionManager] Thinking cleared (user interrupted)");
          }
          if (this.isToolExecuting) {
            this.updateToolExecutingState(false);
            console.log("⚡ [SessionManager] Tool execution cleared (user interrupted)");
          }
          
          // Update status
          this.config.onStatusUpdate?.("Listening...");
          console.log("  Status updated to: Listening...");
          
          console.log("✅ [SessionManager] Interrupt handled successfully");
          console.log("⚡ [SessionManager] ═══════════════════════════════════════");
          break;

        case RealtimeMessageType.SESSION_TIMEOUT:
          // Session ended due to timeout (idle or max duration)
          console.log("⏱️  [SessionManager] ═══════════════════════════════════════");
          console.log("⏱️  [SessionManager] SESSION TIMEOUT DETECTED");
          console.log("⏱️  [SessionManager] ═══════════════════════════════════════");
          console.log("  Event type:", messageType);
          console.log("  Timestamp:", new Date().toISOString());
          console.log("  Provider:", this.provider?.getProviderId());
          console.log("  Timeout message:", message.payload.message);
          console.log("  Timeout code:", message.payload.code);
          console.log("  Action: Graceful disconnect (not error)");
          
          // Update status with friendly message
          this.config.onStatusUpdate?.(message.payload.message || "Session ended");
          console.log("  Status updated to:", message.payload.message || "Session ended");
          
          // Cleanup will be handled by onClose callback
          this.clearIdleHibernateTimer();
          console.log("  Note: Cleanup will be handled by onClose callback");
          console.log("✅ [SessionManager] Timeout handled successfully");
          console.log("⏱️  [SessionManager] ═══════════════════════════════════════");
          break;

        case RealtimeMessageType.SESSION_HIBERNATE:
          // Session entered hibernation mode - STT stream closed
          this.isHibernated = true;
          this.clearIdleHibernateTimer();
          this.config.onHibernationChange?.(true);
          this.config.onStatusUpdate?.('Sleeping...');
          
          console.log('💤 [SessionManager] ═══════════════════════════════════════');
          console.log('💤 [SessionManager] SESSION HIBERNATED');
          console.log('💤 [SessionManager] ═══════════════════════════════════════');
          console.log('  Event type:', messageType);
          console.log('  Session ID:', message.payload?.sessionId);
          console.log('  Status: STT stream closed, waiting for wake signal');
          console.log('  Action: Audio will still be sent; server will wake automatically');
          console.log('✅ [SessionManager] Hibernation state activated');
          console.log('💤 [SessionManager] ═══════════════════════════════════════');
          break;

        case RealtimeMessageType.SESSION_RESUME:
          // Session resumed from hibernation - STT stream reinitialized
          this.isHibernated = false;
          this.config.onHibernationChange?.(false);
          this.config.onStatusUpdate?.('Connected - ready to listen');
          this.updateIdleHibernateTimer("session resumed");
          
          console.log('☀️ [SessionManager] ═══════════════════════════════════════');
          console.log('☀️ [SessionManager] SESSION RESUMED FROM HIBERNATION');
          console.log('☀️ [SessionManager] ═══════════════════════════════════════');
          console.log('  Event type:', messageType);
          console.log('  Session ID:', message.payload?.sessionId);
          console.log('  Status: STT stream reinitialized');
          console.log('  Action: Normal operation resumed');
          console.log('✅ [SessionManager] Hibernation state cleared');
          console.log('☀️ [SessionManager] ═══════════════════════════════════════');
          break;

        case RealtimeMessageType.TRANSCRIPT_DELTA:
          // Text delta from AI - don't clear thinking here
          // Thinking persists until response.done
          // Speaking state will override thinking visually when audio plays
          console.log("📝 [SessionManager] Transcript delta:", message.payload.transcript);
          console.log("📝 [SessionManager] Delta payload:", {
            transcript: message.payload.transcript,
            text: message.payload.text,
            role: message.payload.role,
            responseId: message.payload.responseId,
            itemId: message.payload.itemId,
          });
          // Emit transcript event for caption system
          const deltaText = message.payload.transcript || message.payload.text || '';
          if (deltaText) {
            this.config.onTranscriptEvent?.({
              type: 'delta',
              text: deltaText,
              role: message.payload.role || 'assistant',
              responseId: message.payload.responseId,
              itemId: message.payload.itemId,
            });
          }
          break;
          
        case RealtimeMessageType.TRANSCRIPT_DONE:
          console.log("📝 Transcript:", message.payload.transcript || message.payload.text);
          // Emit transcript event for caption system
          this.config.onTranscriptEvent?.({
            type: 'done',
            text: message.payload.transcript || message.payload.text || '',
            role: message.payload.role || 'assistant',
            responseId: message.payload.responseId,
            itemId: message.payload.itemId,
          });
          break;

        case RealtimeMessageType.TOOL_CALL:
          await this.handleProviderToolCall(message.payload, context);
          break;

        case RealtimeMessageType.TOOL_CALL_CANCELLED:
          console.log("❌ Tool calls cancelled");
          if (this.isAIThinking) {
            this.updateThinkingState(false);
          }
          break;

        case RealtimeMessageType.ERROR:
          console.error("❌ Provider error:", message.payload);
          // Clear thinking and tool execution states on error
          if (this.isAIThinking) {
            this.updateThinkingState(false);
            console.log("❌ [SessionManager] Thinking cleared (error occurred)");
          }
          if (this.isToolExecuting) {
            this.updateToolExecutingState(false);
            console.log("❌ [SessionManager] Tool execution cleared (error occurred)");
          }
          this.config.onError?.(message.payload.message);
          break;

        case RealtimeMessageType.AUDIO_BUFFER_SPEECH_STARTED:
          console.log("🗣️ User started speaking");
          break;

        case RealtimeMessageType.AUDIO_BUFFER_SPEECH_STOPPED:
          console.log("🤐 User stopped speaking");
          this.userStoppedSpeakingTime = Date.now();
          
          // Don't start thinking here - wait for turn_started (response.created)
          // This ensures thinking only starts when AI actually begins processing
          console.log("🤐 [SessionManager] User stopped speaking - waiting for turn_started to start thinking");
          break;

        default:
          // Unhandled message type - might be provider-specific
          if (messageType) {
            console.log("🔍 Unhandled message type:", messageType);
          }
          break;
      }
    } catch (error) {
      console.error("❌ Error handling provider message:", error);
    }
  }

  /**
   * Handle tool call from provider with retry logic and step limiting
   */
  private async handleProviderToolCall(
    payload: any,
    context: ToolContext
  ): Promise<void> {
    console.log("🔧 [SessionManager] Tool call received:");
    console.log("  Tool Name:", payload.toolName);
    console.log("  Tool Call ID:", payload.toolCallId);
    console.log("  Arguments:", payload.parameters || payload.args);
    console.log("  Total steps so far:", this.totalStepCount);

    // Check step limit BEFORE executing tool
    if (this.totalStepCount >= this.maxSteps) {
      if (!this.hasReachedStepLimit) {
        this.hasReachedStepLimit = true;
        console.warn(`⚠️ [SessionManager] Step limit reached (${this.maxSteps} steps)`);
        
        // Send notification to AI that step limit was reached
        const limitMessage = {
          error: `Maximum step limit reached (${this.maxSteps} steps). You have used all available tool execution steps for this conversation. Please inform the user that you've reached the maximum number of actions and ask how they would like to proceed. Do NOT attempt any more tool calls.`,
          stepLimitReached: true,
          totalSteps: this.totalStepCount,
          maxSteps: this.maxSteps,
        };
        
        if (this.provider) {
          this.provider.sendToolResponse(payload.toolCallId, payload.toolName, limitMessage);
        }
        
        // Clear thinking state
        this.updateThinkingState(false);
        
        return;
      } else {
        // Already notified about limit, reject any further tool calls
        console.warn(`⚠️ [SessionManager] Tool call rejected - step limit already reached`);
        
        if (this.provider) {
          this.provider.sendToolResponse(payload.toolCallId, payload.toolName, {
            error: "Step limit already reached. No further tool calls are allowed.",
            stepLimitReached: true,
          });
        }
        
        return;
      }
    }

    // Increment step counter
    this.totalStepCount++;
    console.log(`📊 [SessionManager] Step ${this.totalStepCount}/${this.maxSteps}`);

    // Set tool execution state (different shade of yellow indicator)
    this.updateToolExecutingState(true);
    console.log("🔧 [SessionManager] Tool execution started");

    // Set thinking state if not already active
    // If thinking wasn't initiated by speech, mark it as tool-initiated (will timeout)
    if (!this.isAIThinking) {
      this.updateThinkingState(true, false); // false = not initiated by speech
      console.log("🧠 [SessionManager] Thinking started (tool-initiated, will timeout after 30s)");
    }

    try {
      // Check if tool exists
      const toolDefinitions = this.config.toolManager.getToolDefinitions();
      console.log("📋 [SessionManager] Available tools:", Object.keys(toolDefinitions));
      
      if (!toolDefinitions[payload.toolName]) {
        console.error(`❌ [SessionManager] Tool '${payload.toolName}' not found in registered tools!`);
        console.error("  Available tools:", Object.keys(toolDefinitions));
        throw new Error(`Tool '${payload.toolName}' not found`);
      }
      
      console.log(`✅ [SessionManager] Tool '${payload.toolName}' found, executing...`);
      
      // Execute tool - support both 'parameters' and 'args' for compatibility
      const toolArgs = payload.parameters || payload.args;
      const result = await this.config.toolManager.executeTool(
        payload.toolName,
        toolArgs,
        context
      );

      console.log(`✅ [SessionManager] Tool completed: ${payload.toolName}`);
      console.log("  Result:", result);

      // Tool succeeded - reset failure count for this tool
      this.toolFailureCount.delete(payload.toolName);

      // Send response back
      if (this.provider) {
        console.log(`📤 [SessionManager] Sending tool response back to provider`);
        this.provider.sendToolResponse(payload.toolCallId, payload.toolName, result);
      } else {
        console.error("❌ [SessionManager] No provider available to send tool response!");
      }

      // Clear tool execution state (tool completed)
      // But keep thinking state active - AI may call more tools or start responding
      this.updateToolExecutingState(false);
      console.log("🔧 [SessionManager] Tool execution complete - tool icon cleared, thinking persists");
    } catch (error: any) {
      console.error(`❌ Tool failed: ${payload.toolName}`, error);

      // Track consecutive failures for this tool
      const failureCount = (this.toolFailureCount.get(payload.toolName) || 0) + 1;
      this.toolFailureCount.set(payload.toolName, failureCount);
      
      console.log(`📊 [SessionManager] Tool failure count for ${payload.toolName}: ${failureCount}/${this.maxToolFailures}`);

      // Check if tool has failed too many times
      const retriesLeft = this.maxToolFailures - failureCount;
      let errorResponse: any;
      
      if (failureCount >= this.maxToolFailures) {
        // Too many failures - give AI stern warning but still allow it to try a different approach
        console.warn(`⚠️ [SessionManager] Tool ${payload.toolName} has failed ${failureCount} times (limit: ${this.maxToolFailures})`);
        
        errorResponse = {
          success: false,
          error: error.message || "Tool execution failed",
          failureCount: failureCount,
          maxFailures: this.maxToolFailures,
          retriesLeft: 0,
          message: `Tool "${payload.toolName}" has failed ${failureCount} times with errors (0 retries remaining). This suggests the tool may not work as expected with the current parameters or approach. Please try a completely different approach, use a different tool if available, or inform the user that this action cannot be completed. Last error: ${error.message}`,
        };
        
        // Reset counter after warning (give AI a fresh start if it tries again)
        this.toolFailureCount.delete(payload.toolName);
      } else {
        // Soft failure - AI can see error and try again (possibly with corrected parameters)
        const retryWord = retriesLeft === 1 ? 'retry' : 'retries';
        errorResponse = {
          success: false,
          error: error.message || "Tool execution failed",
          failureCount: failureCount,
          maxFailures: this.maxToolFailures,
          retriesLeft: retriesLeft,
          message: `Tool execution failed (attempt ${failureCount}/${this.maxToolFailures}, ${retriesLeft} ${retryWord} remaining). Error: ${error.message}. You may analyze the error and try again with corrected parameters or a different approach.`,
        };
      }

      // Send error response back to AI (soft failure - AI can self-correct and retry)
      if (this.provider) {
        this.provider.sendToolResponse(payload.toolCallId, payload.toolName, errorResponse);
      }

      // Clear tool execution state (tool failed)
      // But keep thinking state active - AI may retry or call different tool
      this.updateToolExecutingState(false);
      console.log("🔧 [SessionManager] Tool execution failed - tool icon cleared, thinking persists");
    }
  }

  /**
   * Handle messages from Gemini Live session (LEGACY - kept for reference, not used)
   * @deprecated Use handleProviderMessage() instead
   */
  /**
   * Connect to Gemini Live session
   * 
   * @param toolContext - Tool execution context
   * @param restoreState - Optional state to restore (injects conversation history into system prompt)
   * @param initialContext - Optional initial context object to include in system prompt
   */
  async connect(toolContext: ToolContext, restoreState?: Partial<VoiceSessionState>, initialContext?: Record<string, unknown> | null): Promise<void> {
    try {
      this.clearPendingInitialGreeting();
      this.clearIdleHibernateTimer();
      this.isClientSpeechActive = false;
      this.isServerSpeechActive = false;
      this.isAssistantAudioActive = false;
      this.isHibernated = false;
      this.isInitializingSession = true;

      // Reset and start timing
      this.initTimings = { startTime: Date.now() };
      
      console.log("🚀 SessionManager: Connecting to Gemini Live...");
      this.config.onStatusUpdate?.("Connecting...");

      // Get current origin for domain validation
      const origin = typeof window !== 'undefined' 
        ? window.location.origin 
        : 'unknown';
      
      console.log("📍 Client origin:", origin);

      // Resolve instructions (prefer 'instructions' over legacy 'systemInstructionOverride')
      let instructions = this.config.instructions || this.config.systemInstructionOverride;
      
      // Inject conversation history if restoring state
      if (restoreState?.transcripts && restoreState.transcripts.length > 0) {
        const { formatHistoryForPrompt, truncateHistory } = await import("../utils/historyFormatter");
        
        // Truncate to fit token limits (default: 32000 tokens)
        const truncated = truncateHistory(restoreState.transcripts, 32000);
        
        // Format for system prompt
        const historyBlock = formatHistoryForPrompt(truncated);
        
        // Prepend to instructions
        instructions = `${historyBlock}\n\n${instructions || ''}`;
        
        console.log(`📥 [SessionManager] Restored ${truncated.length} conversation turn(s)`);
      }
      
      // Append context to instructions before sending to token endpoint
      // Priority: Use current context (from updateContext/useSyncContext) if available, otherwise use initialContext parameter
      // This ensures the context is included in the system instructions payload when generating the token
      // The initialContext parameter comes from VowelClient.this.context, which is set by updateContext()/useSyncContext
      // So if useSyncContext has already run, initialContext will contain the real context (stores initialized)
      // If not, it will be the initialContext from config (stores may not be initialized yet)
      const contextToUse = this.currentContext !== null && this.currentContext !== undefined
        ? this.currentContext  // Use current context if already set (from updateContext called while session was active)
        : (initialContext !== undefined && initialContext !== null ? initialContext : null); // Otherwise use initialContext (from VowelClient.this.context or config)
      
      if (contextToUse !== null && contextToUse !== undefined) {
        try {
          const contextString = JSON.stringify(contextToUse, null, 2);
          instructions += `\n\n<context>\n${contextString}\n</context>`;
          const contextSource = this.currentContext !== null && this.currentContext !== undefined
            ? 'current context (from updateContext/useSyncContext - session was active)'
            : (initialContext !== undefined && initialContext !== null 
                ? 'context from VowelClient (from updateContext/useSyncContext - stores initialized)' 
                : 'initial context (from config - stores may not be initialized)');
          console.log(`📝 [SessionManager] Context included in system instructions payload (${contextSource}):`, contextString.length, 'chars');
        } catch (error) {
          console.warn('⚠️ Failed to stringify context:', error);
          // Fallback: try toString if available
          const contextString = String(contextToUse);
          instructions += `\n\n<context>\n${contextString}\n</context>`;
        }
      } else {
        console.log('📝 [SessionManager] No context available to include in system instructions payload');
      }
      
      // Resolve turnDetection config with defaults
      const defaultTurnDetectionMode =
        this.config.voiceConfig?.provider === 'grok' ? 'server_vad' : 'client_vad';
      const turnDetectionMode =
        this.config.voiceConfig?.turnDetection?.mode ?? defaultTurnDetectionMode;
      const resolvedTurnDetection = {
        mode: turnDetectionMode,
        ...(turnDetectionMode === 'client_vad' && {
          clientVAD: this.config.voiceConfig?.turnDetection?.clientVAD ?? {
            adapter: 'silero-vad',
            autoCommit: true,
            autoCreateResponse: true,
          }
        }),
        ...(this.config.voiceConfig?.turnDetection?.serverVAD && {
          serverVAD: this.config.voiceConfig.turnDetection.serverVAD
        })
      };
      
      // Prepare client config to send to server (with resolved defaults)
      const clientConfig = {
        routes: this.config.routes,
        actions: this.config.toolManager.getToolDefinitions(),
        voiceConfig: {
          ...this.config.voiceConfig,
          turnDetection: resolvedTurnDetection,
        },
        systemInstructionOverride: instructions, // Server expects this property name (now includes initial context)
        initialGreetingPrompt: this.config.voiceConfig?.initialGreetingPrompt, // Pass initial greeting prompt to server
      };

      let tokenResponse: TokenResponse;

      // Check for direct token in voiceConfig (bypasses token endpoint)
      if (this.config.voiceConfig?.token) {
        console.log("🔑 Using direct token from voiceConfig (bypassing token endpoint)");
        const directToken = this.config.voiceConfig.token;
        
        // For direct tokens, we need to determine provider and model from config
        const provider = this.config.voiceConfig?.provider || 'vowel-prime';
        const model = this.config.voiceConfig?.model || this.getDefaultModelForProvider(provider);
        
        tokenResponse = {
          tokenName: directToken,
          model: model,
          provider: provider as ProviderType,
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          systemInstructions: instructions,
        };
      }
      // Use custom token provider if specified
      else if (this.config.tokenProvider) {
        console.log("🔧 Using custom token provider...");
        this.initTimings.tokenRequestStart = Date.now();
        tokenResponse = await this.config.tokenProvider(clientConfig);
        this.initTimings.tokenRequestEnd = Date.now();
      } else {
        // Get token from HTTP endpoint (custom or default)
        // Priority: tokenEndpoint > convexUrl + path > default VOWEL_TOKEN_ENDPOINT
        let tokenEndpoint: string;
        if (this.config.tokenEndpoint) {
          tokenEndpoint = this.config.tokenEndpoint;
        } else if (this.config.convexUrl) {
          // Construct endpoint from base Convex URL
          const baseUrl = this.config.convexUrl.replace(/\/$/, ''); // Remove trailing slash
          tokenEndpoint = `${baseUrl}/vowel/api/generateToken`;
        } else {
          tokenEndpoint = VOWEL_TOKEN_ENDPOINT;
        }
        
        console.log("📤 Requesting token from endpoint:", tokenEndpoint);
        console.log("  Origin:", origin);
        console.log("  Routes:", this.config.routes.length);
        console.log(
          "  Actions:",
          Object.keys(this.config.toolManager.getToolDefinitions()).length
        );
        console.log("  Voice config:", this.config.voiceConfig);
        console.log("  Turn detection (resolved):", resolvedTurnDetection);

        this.initTimings.tokenRequestStart = Date.now();
        tokenResponse = await this.fetchToken({
          appId: this.config.appId || '',
          origin,
          config: clientConfig,
        }, tokenEndpoint);
        this.initTimings.tokenRequestEnd = Date.now();
      }

      console.log("✅ Token ready:");
      console.log("  Model:", tokenResponse.model);
      console.log("  Provider:", tokenResponse.provider);
      
      // Check if server sent system instructions in the token response
      if (tokenResponse.systemInstructions) {
        console.log("  ✅ System instructions received from server:", tokenResponse.systemInstructions.length, "chars");
      } else {
        console.warn("  ⚠️ No system instructions in token response from server");
      }

      // Create provider using factory
      console.log(`🏭 Creating ${tokenResponse.provider} provider...`);
      
      // Convert tool definitions to include names
      const toolDefinitions = this.config.toolManager.getToolDefinitions();
      const toolsWithNames = Object.entries(toolDefinitions).map(([name, definition]) => ({
        name,
        ...definition,
      }));
      
      // Use system instructions from token response if available, otherwise fall back to config
      // The server builds the complete instructions (including app-specific context)
      const configInstructions = this.config.instructions || this.config.systemInstructionOverride;
      const systemInstructions = tokenResponse.systemInstructions || configInstructions;
      
      // Store base instructions (before context is added) for context management
      // If server returned system instructions, they may already include the initial context
      // If not, we'll use the instructions we built (which includes initial context)
      this.baseInstructions = systemInstructions || instructions || "";
      
      // Set current context if provided (for future updates via updateContext)
      // Note: Context is already included in instructions sent to token endpoint (either currentContext or initialContext),
      // so it should be in the system instructions payload. We still track it here
      // so that updateContext() can replace it with new values later.
      // Only set if we don't already have a current context (from updateContext/useSyncContext)
      if (this.currentContext === null && initialContext !== undefined) {
        this.currentContext = initialContext;
      }
      
      // Log system instructions being passed to provider
      console.log('📝 [SessionManager] System instructions for provider:');
      if (systemInstructions) {
        const source = tokenResponse.systemInstructions 
          ? 'token response (server-built, includes initial context)' 
          : (this.config.instructions ? 'config.instructions (includes initial context)' : 'config.systemInstructionOverride (legacy, includes initial context)');
        console.log(`  Source: ${source}`);
        console.log(`  Length: ${systemInstructions.length} characters`);
        console.log(`  Preview (first 300 chars): ${systemInstructions.substring(0, 300)}...`);
      } else {
        console.error('  ❌ NO SYSTEM INSTRUCTIONS AVAILABLE!');
      }
      
      // Build final instructions with context
      // If initial context was already included in the token response, buildInstructionsWithContext
      // will detect it and not duplicate it
      const finalInstructions = this.buildInstructionsWithContext();
      
      // Merge metadata with voiceConfig info for provider
      const providerMetadata = {
        ...tokenResponse.metadata,
        vowelPrimeConfig: this.config.voiceConfig?.vowelPrimeConfig,
        turnDetection: this.config.voiceConfig?.turnDetection, // Pass turnDetection config to provider
        audioConfig: this.config.voiceConfig?.audioConfig,
      };
      const providerLifecycleId = ++this.providerLifecycleId;

      this.provider = RealtimeProviderFactory.create(
        tokenResponse.provider,
        {
          token: tokenResponse.tokenName,
          model: tokenResponse.model,
          voice: this.config.voiceConfig?.voice,
          audioConfig: this.config.voiceConfig?.audioConfig,
          metadata: providerMetadata,
          systemInstructions: finalInstructions, // Use instructions with context appended
          tools: toolsWithNames,
        },
        {
          onOpen: async () => {
            if (this.isStaleProviderCallback(providerLifecycleId, "onOpen")) {
              return;
            }
            this.initTimings.connectionEnd = Date.now();
            console.log("✅ Provider session opened");
            this.isHibernated = false;
            this.config.onHibernationChange?.(false);
            this.config.onOpen?.();
            this.config.onStatusUpdate?.("Setting up microphone...");
          },
          onClose: (reason) => {
            if (this.isStaleProviderCallback(providerLifecycleId, "onClose")) {
              return;
            }
            console.log("🔌 Provider session closed:", reason);
            this.clearIdleHibernateTimer();
            this.setClientSpeechActive(false, "provider close");
            this.setServerSpeechActive(false, "provider close");
            this.setAssistantAudioActive(false, "provider close");

            if (this.suppressProviderClose) {
              console.log("ℹ️ [SessionManager] Suppressing provider close callback during managed disconnect");
              this.provider = null;
              return;
            }

            this.config.onClose?.(reason);
            this.provider = null;
          },
          onError: (error) => {
            if (this.isStaleProviderCallback(providerLifecycleId, "onError")) {
              return;
            }
            console.error("❌ Provider session error:", error);
            this.config.onError?.(error.message);
          },
          onMessage: async (message) => {
            if (this.isStaleProviderCallback(providerLifecycleId, "onMessage")) {
              return;
            }
            await this.handleProviderMessage(message, toolContext);
          },
          onConnectionStateChange: (state) => {
            if (this.isStaleProviderCallback(providerLifecycleId, "onConnectionStateChange")) {
              return;
            }
            console.log("🔄 Connection state:", state);
        },
        }
      );

      // Connect to provider
      console.log(`🔌 Connecting to ${tokenResponse.provider} with model: ${tokenResponse.model}`);
      this.initTimings.connectionStart = Date.now();
      await this.provider.connect();
      
      console.log("✅ Provider connected successfully");

      // Skip audio setup if provider handles audio internally (e.g., OpenAI SDK with WebRTC)
      if (!this.provider.handlesAudioInternally()) {
        try {
          this.initTimings.microphoneStart = Date.now();
          await this.config.audioManager.setupMicrophone(
            this.provider,
            this.config.onStatusUpdate
          );
          this.initTimings.microphoneEnd = Date.now();

          // Initialize VAD after microphone is set up
          const mediaStream = this.config.audioManager.getMediaStream();
          if (mediaStream) {
            this.initTimings.vadStart = Date.now();
            
            // Check turnDetection config to determine which VAD system to use
            const defaultTurnDetectionMode =
              this.config.voiceConfig?.provider === 'grok' ? 'server_vad' : 'client_vad';
            const turnDetectionMode =
              this.config.voiceConfig?.turnDetection?.mode ?? defaultTurnDetectionMode;
            
            if (turnDetectionMode === 'client_vad') {
              // Use EnhancedVADManager for client_vad mode
              console.log("🎤 Initializing EnhancedVADManager for client_vad mode...");
              // Use provided clientVAD config or default to silero-vad adapter
              const clientVADConfig = this.config.voiceConfig?.turnDetection?.clientVAD ?? {
                adapter: 'silero-vad',
                autoCommit: true,
                autoCreateResponse: true,
              };
              
              this.enhancedVADManager = new EnhancedVADManager({
                  mode: 'client_vad',
                  clientVAD: clientVADConfig,
                  mediaStream: mediaStream, // Pass MediaStream for MicVAD (Silero VAD) - required for V5 model
                  onSpeechStart: () => {
                    console.log("🗣️ [EnhancedVAD] User started speaking");
                    this.setClientSpeechActive(true, "enhanced vad start");
                    this.config.onUserSpeakingChange?.(true);
                  },
                  onSpeechEnd: () => {
                    console.log("🔇 [EnhancedVAD] User stopped speaking");
                    this.setClientSpeechActive(false, "enhanced vad end");
                    this.config.onUserSpeakingChange?.(false);
                    
                    // User stopped speaking - AI may start thinking
                    // If no response comes quickly, we'll enter thinking state
                    this.userStoppedSpeakingTime = Date.now();
                    setTimeout(() => {
                      // If user stopped speaking 500ms ago and AI hasn't responded yet
                      if (
                        this.userStoppedSpeakingTime > 0 &&
                        Date.now() - this.userStoppedSpeakingTime >= 500 &&
                        !this.isAIThinking &&
                        !this.config.audioManager.isStreaming()
                      ) {
                        // AI is likely thinking/processing
                        this.updateThinkingState(true);
                        console.log("🧠 AI is thinking (user stopped speaking)");
                      }
                    }, 500);
                  },
                  onVADReady: () => {
                    this.initTimings.vadEnd = Date.now();
                    console.log("✅ EnhancedVADManager ready");
                  },
                  onVADError: (error) => {
                    this.initTimings.vadEnd = Date.now();
                    console.warn("⚠️ EnhancedVADManager initialization failed, continuing without client-side VAD:", error);
                    // Session continues without VAD - graceful fallback
                  },
                });
                
                // Initialize EnhancedVADManager (doesn't need media stream - will receive frames via processFrame)
                await this.enhancedVADManager.initialize();
                
                // Pass EnhancedVADManager reference to AudioManager for frame processing
                this.config.audioManager.setEnhancedVADManager(this.enhancedVADManager);
                
                // CLIENT-SIDE INTERRUPT: Stop AI audio immediately when user speaks
                // Listen for speech start events to trigger client-side interruption
                this.enhancedVADManager.on('vad:speech:start', (data) => {
                  console.log("⚡ [SessionManager] Client VAD detected speech start - interrupting AI audio");
                  console.log("  Timestamp:", data.timestamp);
                  console.log("  Probability:", data.probability);
                  console.log("  Adapter ID:", data.adapterId);
                  this.setClientSpeechActive(true, "enhanced vad event start");
                  
                  // Immediately update user speaking state (button UI)
                  console.log("🔴 [SessionManager] Setting user speaking state to TRUE");
                  this.config.onUserSpeakingChange?.(true);
                  console.log("🔴 [SessionManager] onUserSpeakingChange(true) called");
                  
                  // Immediately stop all audio playback (client-side interrupt)
                  // This also sets the interrupt flag to discard incoming audio
                  this.config.audioManager.stopAllAudio();
                  
                  // Clear thinking and tool execution states on interrupt
                  if (this.isAIThinking) {
                    this.updateThinkingState(false);
                    console.log("⚡ [SessionManager] Thinking cleared (user interrupted via client VAD)");
                  }
                  if (this.isToolExecuting) {
                    this.updateToolExecutingState(false);
                    console.log("⚡ [SessionManager] Tool execution cleared (user interrupted via client VAD)");
                  }
                  
                  // Update status
                  this.config.onStatusUpdate?.("Listening...");
                  console.log("✅ [SessionManager] Client-side interrupt handled successfully");
                });
                
                // Listen for speech end to reset user speaking state
                this.enhancedVADManager.on('vad:speech:end', (data) => {
                  console.log("🔇 [SessionManager] Client VAD detected speech end");
                  console.log("  Timestamp:", data.timestamp);
                  console.log("  Duration:", data.duration);
                  
                  // Ignore very short speech segments (likely false positives or noise)
                  // Only reset button state if speech was actually detected for a meaningful duration
                  if (data.duration < 100) {
                    console.log(`⚠️ [SessionManager] Ignoring speech end event - duration too short (${data.duration}ms), likely false positive`);
                    return;
                  }
                  
                  // Reset user speaking state
                  this.setClientSpeechActive(false, "enhanced vad event end");
                  console.log("🟢 [SessionManager] Setting user speaking state to FALSE");
                  this.config.onUserSpeakingChange?.(false);
                  console.log("🟢 [SessionManager] onUserSpeakingChange(false) called");
                });
            } else {
              // Server-side VAD mode (server_vad, semantic_vad, disabled) - fallback for non-client_vad modes
              const vadType = this.config.voiceConfig?.vadType;
              
              // Check if we should enable simple VAD for UI-only updates in server_vad mode
              const shouldUseSimpleVADForUI = (turnDetectionMode === 'server_vad' || turnDetectionMode === 'semantic_vad') && ENABLE_SERVER_VAD_UI_UPDATES;
              
              if (shouldUseSimpleVADForUI) {
                // Initialize simple VAD for UI button state updates only (no interruptions)
                console.log(`🎤 Initializing Simple VAD for UI-only updates (server_vad mode)`);
                
                // Ensure Simple VAD adapter is registered
                registerSimpleVADAdapter();
                
                // Create EnhancedVADManager with simple-vad adapter for UI-only mode
                this.enhancedVADManager = new EnhancedVADManager({
                  mode: 'client_vad', // Use client_vad mode but only for UI updates
                  clientVAD: {
                    adapter: 'simple-vad',
                    autoCommit: false, // Don't auto-commit audio (server handles turn detection)
                    autoCreateResponse: false, // Don't create responses (server handles this)
                    config: {
                      energyThreshold: 0.15,
                      redemptionFrames: 8,
                      sampleRate: 16000,
                      frameDurationMs: 30,
                    }
                  },
                  mediaStream: mediaStream,
                  onVADReady: () => {
                    this.initTimings.vadEnd = Date.now();
                    console.log("✅ Simple VAD initialized for UI-only updates");
                  },
                  onVADError: (error) => {
                    this.initTimings.vadEnd = Date.now();
                    console.warn("⚠️ Simple VAD initialization failed, continuing without UI updates:", error);
                    // Session continues without UI VAD - graceful fallback
                  },
                });
                
                // Initialize EnhancedVADManager
                await this.enhancedVADManager.initialize();
                
                // Pass EnhancedVADManager reference to AudioManager for frame processing
                this.config.audioManager.setEnhancedVADManager(this.enhancedVADManager);
                
                // Set up event listeners for UI-only updates (NO interruptions)
                this.enhancedVADManager.on('vad:speech:start', (data) => {
                  console.log("🗣️ [SessionManager] Simple VAD detected speech start (UI-only, no interrupt)");
                  console.log("  Timestamp:", data.timestamp);
                  console.log("  Probability:", data.probability);
                  this.setClientSpeechActive(true, "simple vad start");
                  
                  // ONLY update UI state - do NOT interrupt audio or clear states
                  this.config.onUserSpeakingChange?.(true);
                });
                
                this.enhancedVADManager.on('vad:speech:end', (data) => {
                  console.log("🔇 [SessionManager] Simple VAD detected speech end (UI-only)");
                  console.log("  Timestamp:", data.timestamp);
                  console.log("  Duration:", data.duration);
                  
                  // Ignore very short speech segments (likely false positives)
                  if (data.duration < 100) {
                    console.log(`⚠️ [SessionManager] Ignoring speech end event - duration too short (${data.duration}ms)`);
                    return;
                  }
                  
                  // ONLY update UI state - do NOT trigger thinking state or other side effects
                  this.setClientSpeechActive(false, "simple vad end");
                  this.config.onUserSpeakingChange?.(false);
                });
              } else if (vadType && vadType !== "none") {
                // Client-side VAD explicitly requested - use legacy VADManager for backward compatibility
                console.log(`🎤 Initializing legacy VADManager with vadType: ${vadType}...`);
                this.vadManager = new VADManager({
                  vadType: vadType,
                  onSpeechStart: () => {
                    console.log("🗣️ Client VAD: User started speaking");
                    this.setClientSpeechActive(true, "legacy vad start");
                    this.config.onUserSpeakingChange?.(true);
                  },
                  onSpeechEnd: () => {
                    console.log("🔇 Client VAD: User stopped speaking");
                    this.setClientSpeechActive(false, "legacy vad end");
                    this.config.onUserSpeakingChange?.(false);
                    
                    // User stopped speaking - AI may start thinking
                    // If no response comes quickly, we'll enter thinking state
                    this.userStoppedSpeakingTime = Date.now();
                    setTimeout(() => {
                      // If user stopped speaking 500ms ago and AI hasn't responded yet
                      if (
                        this.userStoppedSpeakingTime > 0 &&
                        Date.now() - this.userStoppedSpeakingTime >= 500 &&
                        !this.isAIThinking &&
                        !this.config.audioManager.isStreaming()
                      ) {
                        // AI is likely thinking/processing
                        this.updateThinkingState(true);
                        console.log("🧠 AI is thinking (user stopped speaking)");
                      }
                    }, 500);
                  },
                  onVADReady: () => {
                    this.initTimings.vadEnd = Date.now();
                    console.log("✅ Voice Activity Detection ready");
                  },
                  onVADError: (error) => {
                    this.initTimings.vadEnd = Date.now();
                    console.warn("⚠️ VAD initialization failed, continuing without client-side VAD:", error);
                    // Session continues without VAD - graceful fallback
                  },
                });

                await this.vadManager.start(mediaStream);
              } else {
                // No client-side VAD - using server-side VAD only
                this.initTimings.vadEnd = Date.now();
                console.log(`🎤 Using server-side VAD only (turnDetectionMode: ${turnDetectionMode}, vadType: ${vadType ?? 'not set'})`);
              }
            }
        }
        } catch (error: any) {
          console.error("❌ Microphone error:", error);
          this.config.onError?.(`Microphone error: ${error.message}`);
          await this.disconnect();
          throw error;
        }
      } else {
        console.log("🎙️ Provider handles audio internally (WebRTC) - skipping AudioManager setup");
      }

      this.scheduleHostedInitialGreeting(tokenResponse.provider);
      this.isInitializingSession = false;
      this.updateIdleHibernateTimer("connect completed");
    } catch (error: any) {
      this.isInitializingSession = false;
      console.error("❌ Failed to connect session:", error);
      
      // Enhanced error message for domain authorization failures
      if (error.message && error.message.includes("Domain not authorized")) {
        const enhancedMessage = 
          "🔒 Domain Authorization Failed\n\n" +
          error.message + "\n\n" +
          "💡 This is a security feature that restricts which domains can use this voice agent.\n" +
          "If you are the app owner, add this domain in your application settings.";
        
        this.config.onError?.(enhancedMessage);
      } else {
        this.config.onError?.(`Connection failed: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from session and reset state
   */
  async disconnect(options: DisconnectOptions = {}): Promise<void> {
    const { closeReason, notifyClose = false, preserveHibernated = false } = options;

    console.log("🛑 SessionManager: Disconnecting...");
    this.clearPendingInitialGreeting();
    this.clearIdleHibernateTimer();
    this.suppressProviderClose = true;
    this.managedCloseReason = closeReason ?? "Session disconnected";
    this.isInitializingSession = false;
    this.providerLifecycleId += 1;

    // Stop VAD (both legacy and enhanced)
    if (this.vadManager) {
      await this.vadManager.stop();
      this.vadManager = null;
    }
    
    if (this.enhancedVADManager) {
      this.enhancedVADManager.dispose();
      this.enhancedVADManager = null;
    }
    
    // Clear EnhancedVADManager reference from AudioManager
    this.config.audioManager.setEnhancedVADManager(null);

    // Cleanup audio manager
    if (this.config.audioManager) {
      this.config.audioManager.cleanup();
      console.log("✅ Audio manager cleaned up");
    }

    // Reset state
    this.setClientSpeechActive(false, "disconnect");
    this.setServerSpeechActive(false, "disconnect");
    this.setAssistantAudioActive(false, "disconnect");
    this.updateThinkingState(false);
    this.updateToolExecutingState(false);
    this.isResponseInProgress = false;
    this.userStoppedSpeakingTime = 0;
    
    // Reset step limiting and failure tracking
    this.totalStepCount = 0;
    this.hasReachedStepLimit = false;
    this.toolFailureCount.clear();

    try {
      if (this.provider) {
        await this.provider.disconnect();
        this.provider = null;
        console.log("✅ Provider disconnected");
      }

      if (!preserveHibernated && this.isHibernated) {
        this.isHibernated = false;
        this.config.onHibernationChange?.(false);
      }

      if (notifyClose) {
        this.config.onClose?.(this.managedCloseReason);
      }
    } finally {
      this.provider = null;
      this.suppressProviderClose = false;
      this.managedCloseReason = null;
    }

    this.config.onStatusUpdate?.(preserveHibernated ? "Sleeping..." : "Disconnected");
  }

  /**
   * Pause VAD (for session pause)
   */
  pauseVAD(): void {
    if (this.vadManager) {
      this.vadManager.pause();
      console.log("⏸️ VAD paused (legacy)");
    }
    if (this.enhancedVADManager) {
      this.enhancedVADManager.pause();
      console.log("⏸️ VAD paused (enhanced)");
    }
  }

  /**
   * Resume VAD (for session resume)
   */
  resumeVAD(): void {
    if (this.vadManager) {
      this.vadManager.resume();
      console.log("▶️ VAD resumed (legacy)");
    }
    if (this.enhancedVADManager) {
      this.enhancedVADManager.resume();
      console.log("▶️ VAD resumed (enhanced)");
    }
  }
  
  /**
   * Get EnhancedVADManager instance (for AudioManager to pass frames)
   */
  getEnhancedVADManager(): EnhancedVADManager | null {
    return this.enhancedVADManager;
  }

  /**
   * Update configuration (for dynamic updates)
   */
  updateConfig(updates: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Send a text notification to the AI without user speech input
   * This allows programmatic triggering of AI responses for app events
   * 
   * @param eventDetails - Description of the event that occurred, or abstract JSON payload
   * @param context - Optional context object to provide additional information
   * 
   * @example
   * ```ts
   * // Notify AI about a timer expiry
   * await sessionManager.notifyEvent('Timer expired - 5 minutes are up!');
   * 
   * // Notify with additional context
   * await sessionManager.notifyEvent(
   *   'New message received', 
   *   { from: 'John', preview: 'Hello!' }
   * );
   * ```
   */
  async notifyEvent(eventDetails: any, context?: Record<string, any>): Promise<void> {
    if (!this.provider) {
      console.warn('⚠️ Cannot notify event: No active provider');
      throw new Error('No active voice session. Call connect() first.');
    }

    try {
      this.clearPendingInitialGreeting();
      console.log('📢 Notifying AI of event:', eventDetails);
      if (context) {
        console.log('   Context:', context);
      }

      // Build the notification prompt
      let prompt = `Notify the user: ${JSON.stringify(eventDetails)}`;
      
      // Add context if provided
      if (context && Object.keys(context).length > 0) {
        const contextStr = Object.entries(context)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join(', ');
        prompt += `\n\nAdditional context: ${contextStr}`;
      }

      // Send the text prompt to provider
      // This will trigger the AI to generate a spoken audio response
      if (this.provider.sendText) {
        await this.provider.sendText(prompt);
        this.refreshIdleHibernateTimer("notify event sent");
        console.log('✅ Event notification sent to AI');
      } else {
        console.warn('⚠️ Provider does not support text input');
      }
    } catch (error: any) {
      console.error('❌ Failed to notify event:', error);
      throw new Error(`Failed to send event notification: ${error.message}`);
    }
  }

  /**
   * Send raw text input to the AI
   * Lower-level method for custom text-based interactions
   * 
   * @param text - Text to send to the AI
   * 
   * @example
   * ```ts
   * await sessionManager.sendText('What products are on sale?');
   * ```
   */
  async sendText(text: string): Promise<void> {
    if (!this.provider) {
      console.warn('⚠️ Cannot send text: No active provider');
      throw new Error('No active voice session. Call connect() first.');
    }

    try {
      this.clearPendingInitialGreeting();
      console.log('📝 Sending text to AI:', text);
      if (this.provider.sendText) {
        await this.provider.sendText(text);
        this.refreshIdleHibernateTimer("text sent");
        console.log('✅ Text sent to AI');
      } else {
        console.warn('⚠️ Provider does not support text input');
        throw new Error('Provider does not support text input');
      }
    } catch (error: any) {
      console.error('❌ Failed to send text:', error);
      throw new Error(`Failed to send text: ${error.message}`);
    }
  }

  /**
   * Send an image to the AI for processing
   * Enables multimodal interactions where the AI can see and respond to images
   * 
   * @param imageUrl - URL or data URI of the image to send
   * 
   * @example
   * ```ts
   * // Send an image URL
   * await sessionManager.sendImage('https://example.com/product.jpg');
   * 
   * // Send a data URI
   * await sessionManager.sendImage('data:image/png;base64,iVBORw0KGgo...');
   * ```
   */
  async sendImage(imageUrl: string): Promise<void> {
    if (!this.provider) {
      console.warn('⚠️ Cannot send image: No active provider');
      throw new Error('No active voice session. Call connect() first.');
    }

    try {
      this.clearPendingInitialGreeting();
      console.log('🖼️ Sending image to AI:', imageUrl.substring(0, 100) + '...');
      if (this.provider.sendImage) {
        await this.provider.sendImage(imageUrl);
        this.refreshIdleHibernateTimer("image sent");
        console.log('✅ Image sent to AI');
      } else {
        console.warn('⚠️ Provider does not support image input');
        throw new Error('Provider does not support image input');
      }
    } catch (error: any) {
      console.error('❌ Failed to send image:', error);
      throw new Error(`Failed to send image: ${error.message}`);
    }
  }

  /**
   * Update dynamic context and send session.update if connected.
   * Context is stringified, wrapped in <context> tags and appended to system prompt.
   * 
   * @param context - Context object to append to system prompt. Use null to clear.
   */
  updateContext(context: Record<string, unknown> | null): void {
    const contextStr = context ? JSON.stringify(context) : 'null';
    const contextPreview = context ? JSON.stringify(context).substring(0, 100) : 'null';
    
    console.log('📝 [SessionManager] Context update received');
    console.log(`  Context: ${contextPreview}${context ? (contextStr.length > 100 ? '...' : '') : ''}`);
    console.log(`  Context size: ${contextStr.length} chars`);
    
    this.currentContext = context;
    
    if (!this.provider || !this.isActive()) {
      console.log('📝 [SessionManager] Context updated (will be applied on next session start)');
      return;
    }
    
    // Build updated instructions with context
    const updatedInstructions = this.buildInstructionsWithContext();
    const baseInstructionsLength = this.baseInstructions?.length || 0;
    const contextAdditionLength = updatedInstructions.length - baseInstructionsLength;
    
    console.log('🔧 [SessionManager] Building instructions with context');
    console.log(`  Base instructions length: ${baseInstructionsLength} chars`);
    console.log(`  Context addition length: ${contextAdditionLength} chars`);
    console.log(`  Total instructions length: ${updatedInstructions.length} chars`);
    
    // Send session.update via provider
    console.log('📤 [SessionManager] Pushing context update to server via session.update');
    this.sendSessionUpdate({ instructions: updatedInstructions });
    
    console.log('✅ [SessionManager] Context update pushed to server successfully');
  }

  /**
   * Build system instructions with context appended.
   * Context is stringified, wrapped in <context> tags and appended to base instructions.
   * If context is already present in base instructions (from initial context in token request),
   * it will be replaced with the current context.
   * 
   * @returns Complete system instructions with context
   */
  private buildInstructionsWithContext(): string {
    // Use base instructions if available, otherwise fall back to config
    let instructions = this.baseInstructions || this.config.instructions || this.config.systemInstructionOverride || "";
    
    // Remove any existing <context>...</context> block from instructions
    // This handles the case where initial context was already included in the token response
    const contextBlockRegex = /\n\n<context>\n[\s\S]*?\n<\/context>/;
    if (contextBlockRegex.test(instructions)) {
      instructions = instructions.replace(contextBlockRegex, '');
      console.log('📝 [SessionManager] Removed existing context block from base instructions (will replace with current context)');
    }
    
    // Append current context if present (stringify the object)
    if (this.currentContext !== null && this.currentContext !== undefined) {
      try {
        const contextString = JSON.stringify(this.currentContext, null, 2);
        instructions += `\n\n<context>\n${contextString}\n</context>`;
      } catch (error) {
        console.warn('⚠️ Failed to stringify context:', error);
        // Fallback: try toString if available
        const contextString = String(this.currentContext);
        instructions += `\n\n<context>\n${contextString}\n</context>`;
      }
    }
    
    return instructions;
  }

  /**
   * Send session.update event via provider to update session configuration.
   * 
   * @param updates - Session configuration updates (e.g., instructions)
   */
  private sendSessionUpdate(updates: { instructions?: string }): void {
    if (!this.provider) {
      console.warn('⚠️ [SessionManager] Cannot send session.update: No provider');
      return;
    }
    
    const providerId = this.provider.getProviderId();
    console.log(`📡 [SessionManager] Sending session.update via ${providerId} provider`);
    console.log(`  Instructions length: ${updates.instructions?.length || 0} chars`);
    
    // Check if provider supports session updates
    if (this.provider.sendSessionUpdate) {
      this.provider.sendSessionUpdate(updates);
      console.log(`✅ [SessionManager] session.update sent successfully via ${providerId}`);
    } else {
      console.warn(`⚠️ [SessionManager] Provider ${providerId} does not support session.update`);
    }
  }

}
