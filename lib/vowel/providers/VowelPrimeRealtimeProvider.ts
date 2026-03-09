import { RealtimeAgent, RealtimeSession } from '@openai/agents-realtime';
import {
  type RealtimeProviderConfig,
  type RealtimeProviderCallbacks,
  type ProviderType,
  RealtimeMessageType,
} from "./RealtimeProvider";
import { WebSocketRealtimeProviderBase } from "./WebSocketRealtimeProviderBase";
import { getVowelPrimeUrl } from "../utils/vowel-prime-urls";
import type { VowelPrimeEnvironment } from "../types";

/**
 * Get Cloudflare Access headers for vowel-prime provider
 * prime.vowel.to may be protected by Cloudflare Access in development
 * 
 * Note: For WebSocket connections, these will be appended as query parameters
 * since browsers don't support custom headers in WebSocket handshake
 */
function getCloudflareAccessParams(): Record<string, string> {
  const clientId = import.meta.env.VITE_VOWEL_PRIME_CF_ACCESS_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_VOWEL_PRIME_CF_ACCESS_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    // Return empty if not configured - will fail if Cloudflare Access is enabled
    return {};
  }
  
  return {
    "cf_access_client_id": clientId,
    "cf_access_client_secret": clientSecret,
  };
}

/**
 * Vowel Prime Realtime Provider
 * 
 * Implements OpenAI Realtime API protocol over WebSocket (not WebRTC)
 * Connects to Vowel Engine (our internal voice API server)
 * 
 * Key Differences from OpenAI:
 * - Uses WebSocket transport (OpenAI uses WebRTC by default)
 * - Requires manual audio streaming via sendAudio()
 * - Uses server-side VAD (voice activity detection)
 * - Custom base URL (prime.vowel.to)
 * - Different voice names (Ashley instead of alloy, etc.)
 */
export class VowelPrimeRealtimeProvider extends WebSocketRealtimeProviderBase {
  private baseUrl: string = "wss://prime.vowel.to/v1/realtime";

  constructor(config: RealtimeProviderConfig, callbacks: RealtimeProviderCallbacks) {
    super(config, callbacks, {
      voiceMap: {
        alloy: 'Ashley',
        echo: 'Ashley',
        shimmer: 'Ashley',
        ash: 'Ashley',
        ballad: 'Ashley',
        coral: 'Ashley',
        sage: 'Ashley',
        verse: 'Ashley',
      },
    });
    
    console.log(`%c🎯 VOWEL PRIME PROVIDER INIT`, 'background: #FF1493; color: #FFF; font-weight: bold; padding: 4px 8px; border-radius: 3px;');
    console.log(`  Model: %c${config.model || '(none)'}`, 'color: #FF1493; font-weight: bold;');
    console.log(`  Voice: %c${config.voice || '(none)'}`, 'color: #FFD700;');
    console.log(`  System Instructions: %c${config.systemInstructions?.length || 0} chars`, 'color: #00D9FF;');
    console.log(`  Tools: %c${config.tools ? `${config.tools.length} tools` : '(none)'}`, 'color: #00FF88; font-weight: bold;');
    
    if (config.tools && config.tools.length > 0) {
      console.log(`%c  📋 Tools in config:`, 'color: #FFD700; font-weight: bold;');
      config.tools.forEach((tool: any, idx: number) => {
        console.log(`    %c${idx + 1}. ${tool.name}%c - ${tool.parameters ? Object.keys(tool.parameters).length + ' params' : 'no params'}`, 
          'color: #FF1493; font-weight: bold;',
          'color: #AAA;'
        );
      });
    }
    
    // Override base URL if provided in metadata
    if (config.metadata?.baseUrl) {
      this.baseUrl = config.metadata.baseUrl;
      console.log(`  Base URL (metadata): %c${this.baseUrl}`, 'color: #00D9FF;');
    } else if (config.metadata?.vowelPrimeConfig?.environment) {
      // Use environment from metadata to determine URL
      const environment = config.metadata.vowelPrimeConfig.environment as VowelPrimeEnvironment;
      this.baseUrl = getVowelPrimeUrl(environment);
      console.log(`  Base URL (env: ${environment}): %c${this.baseUrl}`, 'color: #00D9FF;');
    }
    console.log('');
  }

  /**
   * Get provider identifier
   */
  getProviderId(): ProviderType {
    return "vowel-prime";
  }

  /**
   * Set up event listeners for the RealtimeSession
   */
  private setupEventListeners(): void {
    if (!this.session) {
      console.warn("⚠️ [vowel-prime] Cannot setup listeners: no session");
      return;
    }

    console.log('[vowel-prime] Setting up event listeners...');

    // Cast session to any for event listener types (SDK has incomplete TypeScript definitions)
    const session = this.session as any;

    // CRITICAL: session.created is a transport layer event, not a direct RealtimeSession event
    // We must listen to 'transport_event' and check event.type === 'session.created'
    // See: https://github.com/openai/openai-agents-js SDK documentation
    session.on('transport_event', (event: any) => {
      console.log('[vowel-prime] 🔍 Transport event received:', event.type, event);
      
      if (event.type === 'session.created') {
        console.log('[vowel-prime] 🎉 session.created received:', event);
        // Resolve the promise if we're waiting for it
        if (this.sessionCreatedResolver) {
          this.sessionCreatedResolver();
          this.sessionCreatedResolver = null;
        }
      }
      
      // Handle hibernation events
      if (event.type === 'session.hibernate') {
        console.log('[vowel-prime] 💤 session.hibernate received:', event);
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.SESSION_HIBERNATE,
          payload: {
            sessionId: event.session?.id,
            hibernated: true,
          },
          rawMessage: event,
        });
      }
      
      if (event.type === 'session.resumed') {
        console.log('[vowel-prime] ☀️ session.resumed received:', event);
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.SESSION_RESUME,
          payload: {
            sessionId: event.session?.id,
            hibernated: false,
          },
          rawMessage: event,
        });
      }
      
      // User speech transcription - SDK wraps this in transport_event
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        const transcript = event.transcript;
        if (transcript) {
          console.log('[vowel-prime] 📝 User transcript (from transport_event):', transcript);
          this.callbacks.onMessage?.({
            type: RealtimeMessageType.TRANSCRIPT_DONE,
            payload: { 
              transcript: transcript,
              role: 'user',
              itemId: event.item_id,
            },
            rawMessage: event,
          });
        }
      }
      
      // AI speech transcription (streaming) - LLM text deltas via transport_event
      // NOTE: We use audio_transcript_delta (from SDK session.on) for captions instead
      // because it matches what's actually spoken after TTS filtering.
      // DO NOT emit TRANSCRIPT_DELTA here - it causes duplicates with audio_transcript_delta.
      if (event.type === 'response.text.delta' || event.type === 'response.output_text.delta') {
        const delta = event.delta;
        if (delta) {
          console.log('[vowel-prime] 📝 AI text delta (from transport_event) - ignored for captions:', delta);
          // Intentionally not emitting TRANSCRIPT_DELTA here
        }
      }
      
      // AI speech transcription (complete) - LLM text done via transport_event
      if (event.type === 'response.text.done' || event.type === 'response.output_text.done') {
        const text = event.text;
        if (text) {
          console.log('[vowel-prime] 📝 AI text done (from transport_event):', text);
          this.callbacks.onMessage?.({
            type: RealtimeMessageType.TRANSCRIPT_DONE,
            payload: { 
              transcript: text,
              role: 'assistant',
              responseId: event.response_id || event.responseId,
              itemId: event.item_id || event.itemId,
            },
            rawMessage: event,
          });
        }
      }
      
      // Fallback: Listen for response.done directly from transport if turn_done doesn't fire
      if (event.type === 'response.done') {
        console.log('[vowel-prime] ⚠️ response.done received via transport_event (fallback):', event);
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.RESPONSE_DONE,
          payload: { 
            responseId: event?.response?.id,
            response: event?.response,
            usage: event?.response?.usage,
          },
          rawMessage: event,
        });
      }
      
      // Fallback: Listen for response.created directly from transport
      if (event.type === 'response.created') {
        console.log('[vowel-prime] ⚠️ response.created received via transport_event (fallback):', event);
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.RESPONSE_CREATED,
          payload: { 
            responseId: event?.response?.id,
            response: event?.response,
          },
          rawMessage: event,
        });
      }
    });

    session.on('session.updated', (event: any) => {
      console.log('[vowel-prime] 🔄 session.updated:', event);
    });

    // Connection close event
    // Note: OpenAI Agents SDK doesn't provide close code/reason in the close event
    // We rely on error events for timeout/error information before close
    session.on('close', (event?: any) => {
      const closeCode = event?.code;
      const closeReason = event?.reason || event?.message || 'Session closed';
      
      console.log('[vowel-prime] 🔌 Session closed', {
        code: closeCode,
        reason: closeReason,
        event,
      });
      
      this.isConnected = false;
      this.updateConnectionState("disconnected");
      
      // Build detailed close reason
      let detailedReason = closeReason;
      if (closeCode) {
        detailedReason = `[Code ${closeCode}] ${closeReason}`;
      }
      
      this.callbacks.onClose?.(detailedReason);
    });

    // Disconnected event (SDK emits this after WebSocket close)
    session.on('disconnected', (event?: any) => {
      const disconnectReason = event?.reason || event?.message || 'Connection disconnected';
      
      console.log('[vowel-prime] 🔌 Connection disconnected (SDK event)', {
        reason: disconnectReason,
        event,
      });
      
      this.isConnected = false;
      this.updateConnectionState("disconnected");
      this.callbacks.onClose?.(disconnectReason);
    });

    // Response lifecycle events
    // OpenAI Agents.js SDK uses 'turn_started' and 'turn_done' instead of 'response.created' and 'response.done'
    session.on('turn_started', (event: any) => {
      const responseId = event?.providerData?.response?.id;
      console.log('[vowel-prime] 🤖 Turn started (response.created):', responseId);
      console.log('[vowel-prime] 🤖 Turn started full event:', JSON.stringify(event, null, 2));
      
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.RESPONSE_CREATED,
        payload: { 
          responseId: responseId,
          response: event?.providerData?.response,
        },
        rawMessage: event,
      });
      
      // Reset caption accumulation state for new response
      // Send empty delta with responseId to signal reset
      if (responseId) {
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.TRANSCRIPT_DELTA,
          payload: { 
            transcript: '', // Empty to signal reset
            role: 'assistant',
            responseId: responseId,
            itemId: event?.providerData?.response?.output?.[0]?.id,
          },
          rawMessage: { ...event, _reset: true },
        });
      }
    });

    session.on('turn_done', (event: any) => {
      console.log('[vowel-prime] ✅ Turn done (response.done):', event?.response?.id);
      console.log('[vowel-prime] ✅ Turn done full event:', JSON.stringify(event, null, 2));
      
      // Extract final AI speech transcript from response output items
      // The response.output array contains items with content parts
      if (event?.response?.output && Array.isArray(event.response.output)) {
        for (const outputItem of event.response.output) {
          if (outputItem.content && Array.isArray(outputItem.content)) {
            for (const contentPart of outputItem.content) {
              // Look for audio content parts with transcript (TTS output)
              if (contentPart.type === 'audio' && contentPart.transcript) {
                console.log('[vowel-prime] 📝 AI transcript done (from turn_done):', contentPart.transcript);
                this.callbacks.onMessage?.({
                  type: RealtimeMessageType.TRANSCRIPT_DONE,
                  payload: { 
                    transcript: contentPart.transcript,
                    role: 'assistant',
                    responseId: event?.response?.id,
                    itemId: outputItem.id,
                  },
                  rawMessage: event,
                });
              }
            }
          }
        }
      }
      
      console.log('[vowel-prime] ✅ Forwarding RESPONSE_DONE message to SessionManager');
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.RESPONSE_DONE,
        payload: { 
          responseId: event?.response?.id,
          response: event?.response,
          usage: event?.response?.usage,
        },
        rawMessage: event,
      });
      console.log('[vowel-prime] ✅ RESPONSE_DONE message forwarded');
    });
    
    // Debug: Log all events to see what's available
    const sessionAny = session as any;
    const originalEmit = sessionAny.emit;
    if (originalEmit) {
      sessionAny.emit = function(...args: any[]) {
        const eventName = args[0];
        if (eventName === 'turn_done' || eventName === 'turn_started' || eventName === 'transport_event') {
          console.log(`[vowel-prime] 🔍 SDK emitting event: ${eventName}`, args.slice(1));
        }
        return originalEmit.apply(this, args);
      };
    }

    session.on('response.cancelled', (event: any) => {
      console.log('[vowel-prime] 🚫 Response cancelled:', event?.response?.id);
    });

    // Audio events - Speech detection (VAD)
    session.on('input_audio_buffer.speech_started', () => {
      console.log('[vowel-prime] 🎤 Speech started (server VAD detected)');
      console.log('  Note: If AI is speaking, this may trigger an interrupt');
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.AUDIO_BUFFER_SPEECH_STARTED,
        payload: {},
      });
    });

    session.on('input_audio_buffer.speech_stopped', () => {
      console.log('[vowel-prime] 🔇 Speech stopped');
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.AUDIO_BUFFER_SPEECH_STOPPED,
        payload: {},
      });
    });

    // Audio interrupt event (emitted by SDK when user speaks over AI)
    // CRITICAL: This is the event to listen for interrupts, NOT input_audio_buffer.speech_started
    session.on('audio_interrupted', () => {
      console.log('⚡ [vowel-prime] ═══════════════════════════════════════');
      console.log('⚡ [vowel-prime] SDK INTERRUPT EVENT RECEIVED');
      console.log('⚡ [vowel-prime] ═══════════════════════════════════════');
      console.log('  Event: audio_interrupted');
      console.log('  Source: OpenAI Agents SDK');
      console.log('  Provider: Vowel Prime (WebSocket)');
      console.log('  Timestamp:', new Date().toISOString());
      console.log('  Action: Forwarding to SessionManager');
      
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.AUDIO_INTERRUPTED,
        payload: {},
      });
      
      console.log('✅ [vowel-prime] Interrupt event forwarded to SessionManager');
      console.log('⚡ [vowel-prime] ═══════════════════════════════════════');
    });

    // Audio output events
    // The SDK processes response.audio.delta and emits high-level 'audio' event
    session.on('audio', (event: any) => {
      // event.data is already decoded to ArrayBuffer by the SDK
      if (event.data && event.data.byteLength > 0) {
        console.log(`[vowel-prime] 🔊 Audio chunk received: ${event.data.byteLength} bytes`);
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.AUDIO_DELTA,
          payload: { audio: event.data },
          rawMessage: event,
        });
      }
    });

    session.on('response.audio.done', () => {
      console.log('[vowel-prime] 🔊 Audio response complete');
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.AUDIO_DONE,
        payload: {},
      });
    });

    // User speech transcription - also listen directly (in case SDK emits it directly)
    // Primary handler is in transport_event listener above
    session.on('conversation.item.input_audio_transcription.completed', (event: any) => {
      const transcript = event.transcript;
      if (transcript) {
        console.log('[vowel-prime] 📝 User transcript (direct):', transcript);
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.TRANSCRIPT_DONE,
          payload: { 
            transcript: transcript,
            role: 'user',
            itemId: event.item_id,
          },
          rawMessage: event,
        });
      }
    });

    // AI speech transcription (streaming) - TTS transcript deltas
    // CRITICAL: According to OpenAI Agents.js SDK, audio_transcript_delta events are emitted
    // on the transport layer, not directly on the session. We must listen on session.transport.
    // See: https://github.com/openai/openai-agents-js - RealtimeSession processes transport events internally
    const transport = (session as any).transport;
    if (transport) {
      // Listen for AI transcript deltas on transport
      transport.on('audio_transcript_delta', (event: any) => {
        console.log('[vowel-prime] 📝 AI transcript delta (audio_transcript_delta from transport):', event.delta);
        console.log('[vowel-prime] 📝 Event details:', { 
          delta: event.delta, 
          responseId: event.responseId, 
          itemId: event.itemId 
        });
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.TRANSCRIPT_DELTA,
          payload: { 
            transcript: event.delta,
            role: 'assistant',
            responseId: event.responseId,
            itemId: event.itemId,
          },
          rawMessage: event,
        });
      });
    } else {
      console.warn('[vowel-prime] ⚠️ Session transport not available, cannot listen for transcript events');
    }

    // NOTE: We intentionally do NOT listen to transport layer for response.text.delta events.
    // The audio_transcript_delta (from transport above) is the authoritative source for captions
    // because it reflects what's actually spoken after TTS processing/filtering.
    // Listening to both would cause duplicate captions.

    // Debug logging for LLM text streaming (not used for captions)
    session.on('response.text.delta', (event: any) => {
      if (event.delta) {
        // This is LLM text generation, not TTS transcription - for debug only
        console.log('[vowel-prime] 📝 LLM text delta (debug):', event.delta);
      }
    });

    // Debug logging for complete LLM text (not used for captions)
    session.on('response.text.done', (event: any) => {
      console.log('[vowel-prime] 📝 LLM text done (debug):', event.text);
    });

    // Error events with enhanced session timeout handling
    session.on('error', (error: any) => {
      console.error('[vowel-prime] ❌ Session error:', error);
      console.error('[vowel-prime] ❌ Error details:', JSON.stringify(error, null, 2));
      
      // Check if this is a session timeout (graceful disconnect, not an error)
      // Note: The error structure is nested: error.error.error.type === 'session_timeout'
      const isSessionTimeout = 
        error.error?.error?.type === 'session_timeout' || 
        error.error?.type === 'session_timeout' || 
        error.type === 'session_timeout';
      
      if (isSessionTimeout) {
        const message = 
          error.error?.error?.message || 
          error.error?.message || 
          error.message || 
          'Session ended';
        
        console.log('[vowel-prime] ⏱️  Session timeout (graceful disconnect):', message);
        
        // Notify via message callback (not error callback)
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.SESSION_TIMEOUT,
          payload: { 
            message,
            code: error.error?.error?.code || error.error?.code || error.code,
          },
          rawMessage: error,
        });
        
        // Update connection state
        this.isConnected = false;
        this.updateConnectionState("disconnected");
        
        // Notify close callback
        this.callbacks.onClose?.(message);
      } else {
        // Regular error - handle as error
        // Preserve the full error structure for debugging
        this.updateConnectionState("error");
        
        // Create an error object that preserves the original error structure
        const errorObj = new Error(error.error?.error?.message || error.error?.message || error.message || 'Session error');
        // Attach the full error details to the error object
        (errorObj as any).rawError = error;
        this.callbacks.onError?.(errorObj);
      }
    });

    console.log('[vowel-prime] ✅ Event listeners configured (with interrupt and timeout support)');
  }

  /**
   * Connect to Vowel Prime
   */
  async connect(): Promise<void> {
    try {
      console.log('🔌 [vowel-prime] Connecting to Vowel Prime...');
      this.updateConnectionState("connecting");

      // Map voice name
      const voiceToUse = this.mapVoiceName(this.config.voice || "alloy");

      console.log('🔌 [vowel-prime] Creating RealtimeAgent');
      console.log('  Model:', this.config.model);
      console.log('  Voice:', voiceToUse, this.voiceMap[this.config.voice || "alloy"] ? `(mapped from ${this.config.voice || "alloy"})` : "");
      console.log('  System Instructions length:', this.config.systemInstructions?.length || 0, 'chars');
      
      // Log the actual system instructions being passed to the agent
      if (this.config.systemInstructions) {
        console.log('📝 [vowel-prime] System Instructions (first 500 chars):');
        console.log(this.config.systemInstructions.substring(0, 500));
        if (this.config.systemInstructions.length > 500) {
          console.log(`... (${this.config.systemInstructions.length - 500} more chars)`);
        }
      } else {
        console.warn('⚠️ [vowel-prime] No system instructions provided in config!');
      }

      // Create SDK tools array
      const sdkTools = this.createSDKTools();

      // Create the RealtimeAgent with tools
      const agentConfig = {
        name: "Vowel Agent",
        instructions: this.config.systemInstructions || "", // Empty string if no instructions provided
        tools: sdkTools,
      };
      
      // Store original config for future agent updates
      this.originalAgentConfig = {
        name: agentConfig.name,
        tools: sdkTools,
        instructions: agentConfig.instructions,
      };
      
      console.log(`%c🤖 CREATING REALTIME AGENT`, 'background: #00D9FF; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 3px;');
      console.log(`  Agent: %c${agentConfig.name}`, 'color: #00D9FF; font-weight: bold;');
      console.log(`  Instructions: %c${agentConfig.instructions.length} chars`, 'color: #88FF88;');
      console.log(`  Tools: %c${agentConfig.tools.length}`, 'color: #FFD700; font-weight: bold;');
      
      // Log the exact instructions being passed to RealtimeAgent constructor
      console.log(`%c📝 EXACT INSTRUCTIONS BEING PASSED TO AGENT:`, 'background: #FF1493; color: #FFF; font-weight: bold; padding: 4px 8px; border-radius: 3px;');
      if (agentConfig.instructions) {
        console.log(`  Length: ${agentConfig.instructions.length} characters`);
        console.log(`  Content (first 500 chars):\n${agentConfig.instructions.substring(0, 500)}`);
        if (agentConfig.instructions.length > 500) {
          console.log(`  ... (${agentConfig.instructions.length - 500} more characters)`);
        }
      } else {
        console.error(`  ❌ INSTRUCTIONS ARE EMPTY OR UNDEFINED!`);
      }
      
      if (agentConfig.tools.length > 0) {
        agentConfig.tools.forEach((tool: any, idx: number) => {
          const hasName = 'name' in tool;
          const hasDesc = 'description' in tool;
          const hasParams = 'parameters' in tool;
          const hasExec = 'execute' in tool;
          const allPresent = hasName && hasDesc && hasParams && hasExec;
          
          console.log(`    %c${idx + 1}.%c name:${hasName ? '✓' : '✗'} desc:${hasDesc ? '✓' : '✗'} params:${hasParams ? '✓' : '✗'} exec:${hasExec ? '✓' : '✗'}`, 
            'color: #FFD700;',
            allPresent ? 'color: #00FF88;' : 'color: #FF6B6B;'
          );
        });
      }
      
      this.agent = new RealtimeAgent(agentConfig);
      console.log(`%c✅ RealtimeAgent created\n`, 'color: #00FF88; font-weight: bold;');

      // Create the session with WebSocket transport
      // Respect turnDetection config from metadata (passed from SessionManager)
      const turnDetection = this.config.metadata?.turnDetection as any;
      const turnDetectionMode = turnDetection?.mode ?? 'client_vad';
      const inputAudioFormat = this.getInputAudioFormat();
      const outputAudioFormat = this.getOutputAudioFormat();
      
      // Build turnDetection config based on mode
      let turnDetectionConfig: any;
      if (turnDetectionMode === 'client_vad') {
        // Client-side VAD mode - disable server VAD
        console.log("🎤 [vowel-prime] Using client_vad mode - disabling server-side VAD");
        turnDetectionConfig = {
          type: 'disabled', // Disable server VAD when using client VAD
        };
      } else if (turnDetectionMode === 'disabled') {
        // Disabled mode - no VAD
        turnDetectionConfig = {
          type: 'disabled',
        };
      } else {
        // Server VAD mode (default) - use server-side VAD
        const serverVADConfig = turnDetection?.serverVAD;
        turnDetectionConfig = {
          type: 'server_vad',
          threshold: serverVADConfig?.threshold ?? 0.5,
          silenceDurationMs: serverVADConfig?.silenceDurationMs ?? 550,
          prefixPaddingMs: serverVADConfig?.prefixPaddingMs ?? 0,
          interruptResponse: serverVADConfig?.interruptResponse ?? true,
        };
      }
      
      const sessionConfig: any = {
        transport: 'websocket',  // ✅ Force WebSocket (Vowel Engine doesn't support WebRTC)
        model: this.config.model,
        config: {
          audio: {
            input: {
              format: { type: 'audio/pcm', rate: inputAudioFormat.sampleRate },  // ✅ Explicit audio format
              turnDetection: turnDetectionConfig,
            },
            output: {
              format: { type: 'audio/pcm', rate: outputAudioFormat.sampleRate },
              voice: voiceToUse,
            },
          },
        },
      };
      
      console.log(`🔌 [vowel-prime] Creating RealtimeSession with config:`);
      console.log("  Model:", sessionConfig.model);
      console.log("  Transport:", sessionConfig.transport);
      console.log("  Audio format:", sessionConfig.config.audio.input.format);
      console.log("  VAD:", sessionConfig.config.audio.input.turnDetection);
      console.log("  Full config:", JSON.stringify(sessionConfig, null, 2));
      
      this.session = new RealtimeSession(this.agent, sessionConfig);
      console.log(`✅ [vowel-prime] RealtimeSession created`);

      // Set up event listeners BEFORE connecting
      this.setupEventListeners();

      // Log all WebSocket messages for debugging (like the demo does)
      const originalSend = (this.session as any).transport?.send;
      if (originalSend) {
        (this.session as any).transport.send = function(data: any) {
          const msg = typeof data === 'string' ? JSON.parse(data) : data;
          // Only log non-audio messages to avoid spam
          if (msg.type !== 'input_audio_buffer.append') {
            console.log('[vowel-prime] [WS →]', msg.type || msg);
          }
          return originalSend.call(this, data);
        };
        console.log('[vowel-prime] 🔍 WebSocket outgoing message logging enabled');
      }
      
      // ALSO log incoming WebSocket messages to see what the server sends
      const transport = (this.session as any).transport;
      if (transport && transport.ws) {
        const originalOnMessage = transport.ws.onmessage;
        transport.ws.onmessage = function(event: MessageEvent) {
          try {
            const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            // Only log non-audio messages to avoid spam
            if (msg.type && msg.type !== 'response.audio.delta' && msg.type !== 'response.audio_transcript.delta') {
              console.log('[vowel-prime] [WS ←]', msg.type, msg);
            }
          } catch (e) {
            console.log('[vowel-prime] [WS ←] (parse error)', event.data);
          }
          if (originalOnMessage) {
            return originalOnMessage.call(this, event);
          }
        };
        console.log('[vowel-prime] 🔍 WebSocket incoming message logging enabled');
      }

      // Build connection URL with Cloudflare Access params if configured
      let url = this.baseUrl;
      const cfParams = getCloudflareAccessParams();
      if (cfParams.cf_access_client_id) {
        const urlObj = new URL(url);
        Object.entries(cfParams).forEach(([key, value]) => {
          urlObj.searchParams.set(key, value);
        });
        url = urlObj.toString();
        console.log(`🔐 [vowel-prime] Using Cloudflare Access service token`);
      }

      // Connect using the ephemeral token
      // IMPORTANT: The OpenAI Agents SDK requires an apiKey parameter
      // The SDK will automatically send this via Authorization header or WebSocket subprotocol
      // Our Vowel Engine server extracts the token from these standard methods (not query params)
      const connectConfig = { 
        url: url,
        apiKey: this.config.token, // SDK will send this via Authorization header or subprotocol
      };
      
      console.log(`🔌 [vowel-prime] Connecting session...`);
      console.log("  URL:", this.baseUrl);
      console.log("  Token prefix:", this.config.token.substring(0, 10) + "...");
      console.log("  SDK will send token via Authorization header or WebSocket subprotocol");
      
      await this.session.connect(connectConfig);

      this.isConnected = true;
      this.updateConnectionState("connected");
      console.log('✅ [vowel-prime] Connected successfully!');

      // NOTE: According to OpenAI Agents SDK documentation, the SDK should automatically
      // send the agent's instructions to the server when session.connect() is called.
      // The SDK calls getSystemPrompt() on the agent and includes it in the initial
      // session.update event. We should NOT manually send another session.update here.
      console.log('✅ [vowel-prime] SDK should have sent instructions automatically during connect()');

      // Wait for session.created event to ensure server is fully ready
      // This is especially important when using AssemblyAI STT which needs its socket connected
      // The listener was already set up in setupEventListeners() before connect() was called
      console.log('⏳ [vowel-prime] Waiting for session.created event...');
      await new Promise<void>((resolve) => {
        this.sessionCreatedResolver = resolve;
        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.sessionCreatedResolver) {
            console.warn('⚠️ [vowel-prime] Timeout waiting for session.created, proceeding anyway');
            this.sessionCreatedResolver = null;
            resolve();
          }
        }, 10000);
      });
      console.log('✅ [vowel-prime] Session fully ready (server confirmed ready, STT connected)');

      // Notify callbacks that connection is established
      // Critical: SessionManager waits for onOpen() before setting up microphone
      // We need to call this BEFORE marking as fully ready so microphone is ready
      // before any queued messages (like initial greeting) are processed
      console.log('🔔 [vowel-prime] Calling onOpen callback...');
      await this.callbacks.onOpen?.();
      console.log('✅ [vowel-prime] onOpen callback completed (microphone should be ready)');
      
      // NOW mark as fully ready (after microphone is set up)
      // This ensures initial greeting happens AFTER microphone is ready to capture response
      this.isFullyReady = true;
      console.log('✅ [vowel-prime] Marked as fully ready - queued messages will now be processed');
      
      // Process any queued messages (including initial greeting)
      if (this.messageQueue.length > 0) {
        console.log(`📤 [vowel-prime] Processing ${this.messageQueue.length} queued message(s)...`);
        for (const msg of this.messageQueue) {
          if (msg.type === 'text') {
            this.sendText(msg.data);
          } else if (msg.type === 'image') {
            this.sendImage(msg.data);
          }
        }
        this.messageQueue = [];
      }

    } catch (error) {
      console.error('❌ [vowel-prime] Connection failed:', error);
      this.updateConnectionState("error");
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

}
