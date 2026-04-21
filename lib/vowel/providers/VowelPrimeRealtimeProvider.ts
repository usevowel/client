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
 * Enable detailed WebSocket message logging (incoming/outgoing)
 * Set to false to disable the send/onmessage interceptors for debugging
 */
const ENABLE_WS_MESSAGE_LOGGING = false;

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
  private pendingConnectError: Error | null = null;

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

    // Use base class's consolidated SDK event listeners
    // This handles: function_call, audio, audio_stopped, audio_interrupted, turn_started, turn_done, audio_transcript_delta
    this.setupSDKSessionEventListeners();

    // Get session and transport references
    // SDK 0.8+ has strict typing - transport-level events must be listened on transport, not session
    const session = this.session as RealtimeSession<{}>;
    const transport = session.transport;
    
    if (!transport) {
      console.warn("⚠️ [vowel-prime] Session transport not available");
    }

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

      if (event.type === 'input_audio_buffer.speech_started') {
        console.log('[vowel-prime] 🎤 Speech started (from transport_event)');
        console.log('  Note: If AI is speaking, this may trigger an interrupt');
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.AUDIO_BUFFER_SPEECH_STARTED,
          payload: {},
          rawMessage: event,
        });
      }

      if (event.type === 'input_audio_buffer.speech_stopped') {
        console.log('[vowel-prime] 🔇 Speech stopped (from transport_event)');
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.AUDIO_BUFFER_SPEECH_STOPPED,
          payload: {},
          rawMessage: event,
        });
      }
      

    });

    // Transport-level events: session.updated
    transport?.on('session.updated', (event: any) => {
      console.log('[vowel-prime] 🔄 session.updated:', event);
    });

    // Connection close event - transport-level
    // Note: OpenAI Agents SDK doesn't provide close code/reason in the close event
    // We rely on error events for timeout/error information before close
    transport?.on('close', (event?: any) => {
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

    // Disconnected event (SDK emits this after WebSocket close) - transport-level
    transport?.on('disconnected', (event?: any) => {
      const disconnectReason = event?.reason || event?.message || 'Connection disconnected';
      
      console.log('[vowel-prime] 🔌 Connection disconnected (SDK event)', {
        reason: disconnectReason,
        event,
      });
      
      this.isConnected = false;
      this.updateConnectionState("disconnected");
      this.callbacks.onClose?.(disconnectReason);
    });

    // Response cancelled - transport-level event
    transport?.on('response.cancelled', (event: any) => {
      console.log('[vowel-prime] 🚫 Response cancelled:', event?.response?.id);
    });

    // Core tool/audio/turn/transcript listeners now come from setupSDKSessionEventListeners().
    // Leave only provider-specific transport_event handling here.

    // NOTE: We intentionally do NOT listen to transport layer for response.text.delta events.
    // The audio_transcript_delta (from transport above) is the authoritative source for captions
    // because it reflects what's actually spoken after TTS processing/filtering.
    // Listening to both would cause duplicate captions.
    // Debug logging for these events is handled via transport_event above.

    // Error events with enhanced session timeout handling - session-level event
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
        this.pendingConnectError = errorObj;

        if (this.sessionCreatedResolver) {
          this.sessionCreatedResolver();
          this.sessionCreatedResolver = null;
        }
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
      this.pendingConnectError = null;
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
      if (ENABLE_WS_MESSAGE_LOGGING) {
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
              if (
                msg.type &&
                msg.type !== 'response.output_audio.delta' &&
                msg.type !== 'response.output_audio_transcript.delta'
              ) {
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

      if (this.pendingConnectError) {
        throw this.pendingConnectError;
      }

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
      if (this.pendingConnectError) {
        throw this.pendingConnectError;
      }
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

      if (this.pendingConnectError) {
        throw this.pendingConnectError;
      }
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
      this.pendingConnectError = null;
      console.error('❌ [vowel-prime] Connection failed:', error);
      this.updateConnectionState("error");
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

}
