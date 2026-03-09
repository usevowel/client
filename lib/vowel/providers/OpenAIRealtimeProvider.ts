import { RealtimeAgent, RealtimeSession, tool } from '@openai/agents-realtime';
import { z } from 'zod';
import {
  RealtimeProvider,
  type RealtimeProviderConfig,
  type RealtimeProviderCallbacks,
  type RealtimeMessage,
  type AudioFormat,
  RealtimeMessageType,
} from "./RealtimeProvider";
import type { OpenAICompatibleProviderType, ProviderType } from "../types/providers";

const OPENAI_COMPATIBLE_PROVIDER_DEFAULTS: Record<OpenAICompatibleProviderType, { defaultVoice: string; defaultRealtimeUrl?: string }> = {
  openai: {
    defaultVoice: "alloy",
  },
  grok: {
    defaultVoice: "Rex",
    defaultRealtimeUrl: "wss://api.x.ai/v1/realtime",
  },
};

function resolveRealtimeUrl(
  providerType: OpenAICompatibleProviderType,
  metadata?: Record<string, any>
): string | undefined {
  const runtimeUrl = metadata?.baseUrl ?? metadata?.wsUrl ?? metadata?.url;
  if (runtimeUrl) {
    return runtimeUrl;
  }

  return OPENAI_COMPATIBLE_PROVIDER_DEFAULTS[providerType].defaultRealtimeUrl;
}

/**
 * Provider-specific configuration
 * Defines base URLs and voice mappings for OpenAI
 * Currently unused but kept for potential future use
 */
// interface ClientProviderConfig {
//   baseUrl: string | null; // null = use SDK default
//   voiceMap: Record<string, string>;
// }

// const CLIENT_PROVIDER_CONFIG: ClientProviderConfig = {
//   baseUrl: null, // Use SDK default
//   voiceMap: {}, // No mapping needed - use OpenAI voice names directly
// };

/**
 * OpenAI Realtime API Provider
 * Uses the official @openai/agents-realtime SDK
 * Handles WebRTC transport, authentication, and audio via the SDK
 * 
 * Note: The SDK automatically handles audio capture and streaming via WebRTC,
 * so sendAudio() is a no-op for this provider.
 */
export class OpenAIRealtimeProvider extends RealtimeProvider {
  private agent: RealtimeAgent | null = null;
  private session: RealtimeSession | null = null;
  private isConnected: boolean = false;
  
  /**
   * Store original agent config to recreate agents with updated instructions
   * This preserves tools, name, and other settings when updating context
   */
  private originalAgentConfig: {
    name: string;
    tools: any[];
    instructions: string;
  } | null = null;
  
  /**
   * Map to store pending tool execution promises
   * OpenAI SDK calls execute() directly, so we use this to bridge
   * with our async callback system
   */
  private pendingToolExecutions: Map<string, (result: any) => void> = new Map();

  /** Provider type for logging and getProviderId (openai or grok) */
  private providerType: OpenAICompatibleProviderType;

  /**
   * Constructor
   * @param config - Provider configuration
   * @param callbacks - Event callbacks
   * @param providerType - Provider type ("openai" | "grok") for OpenAI-compatible APIs
   */
  constructor(
    config: RealtimeProviderConfig,
    callbacks: RealtimeProviderCallbacks,
    providerType: OpenAICompatibleProviderType = "openai"
  ) {
    super(config, callbacks);
    this.providerType = providerType;
  }

  /**
   * Get audio format for OpenAI (24kHz PCM16)
   * NOTE: OpenAI SDK handles audio end-to-end via WebRTC, so AudioManager is not used
   */
  getAudioFormat(): AudioFormat {
    return {
      mimeType: "audio/pcm;rate=24000",
      sampleRate: 24000,
      channels: 1,
      encoding: "pcm16",
    };
  }

  /**
   * Check if this provider handles audio internally
   * OpenAI SDK uses WebRTC and manages audio end-to-end
   */
  handlesAudioInternally(): boolean {
    return true;
  }

  async connect(): Promise<void> {
    try {
      console.log(`🔌 [${this.providerType}] Connecting to Realtime API...`);
      this.updateConnectionState("connecting");

      // Use voice directly (no mapping needed for OpenAI/Grok)
      const voiceToUse =
        this.config.voice || OPENAI_COMPATIBLE_PROVIDER_DEFAULTS[this.providerType].defaultVoice;

      console.log(`🔌 [${this.providerType}] Creating RealtimeAgent`);
      console.log("  Model:", this.config.model);
      console.log("  Voice:", voiceToUse);
      console.log("  System Instructions length:", this.config.systemInstructions?.length || 0, "chars");

      // Create SDK tools array
      const sdkTools = this.createSDKTools();
      console.log('🔧 [openai] Tools created, count:', sdkTools.length);

      // Create the RealtimeAgent with tools (SDK retrieves tools from agent)
      const agentConfig = {
        name: "Vowel Agent",
        instructions: this.config.systemInstructions || "You are a helpful voice assistant.",
        tools: sdkTools, // Tools go in agent constructor
      };
      
      // Store original config for future agent updates
      this.originalAgentConfig = {
        name: agentConfig.name,
        tools: sdkTools,
        instructions: agentConfig.instructions,
      };
      
      console.log('🤖 [openai] RealtimeAgent config:');
      console.log("  Name:", agentConfig.name);
      console.log("  Instructions preview:", agentConfig.instructions.substring(0, 100) + "...");
      console.log("  Tools count:", agentConfig.tools.length);
      
      this.agent = new RealtimeAgent(agentConfig);
      console.log('✅ [openai] RealtimeAgent created');

      // Create the session with model and audio config
      // Uses default WebRTC transport
      const sessionConfig: any = {
        model: this.config.model,
        config: {
          audio: {
            input: {
              transcription: {
                model: "whisper-1",
              },
              turnDetection: {
                type: 'server_vad',
                threshold: 0.5,
                silenceDurationMs: 500,
                prefixPaddingMs: 300,
                interruptResponse: true,  // Enable interrupt handling
              },
            },
            output: {
              voice: voiceToUse,
            },
          },
        },
      };
      
      console.log('🔌 [openai] Creating RealtimeSession with config:');
      console.log("  Model:", sessionConfig.model);
      console.log("  Transport: WebRTC (default)");
      console.log("  Audio config:", JSON.stringify(sessionConfig.config));
      
      this.session = new RealtimeSession(this.agent, sessionConfig);
      console.log('✅ [openai] RealtimeSession created');

      // Set up event listeners BEFORE connecting
      this.setupEventListeners();

      // Connect using the ephemeral token
      const connectConfig: { apiKey: string; url?: string } = {
        apiKey: this.config.token,
      };

      const realtimeUrl = resolveRealtimeUrl(this.providerType, this.config.metadata);
      if (realtimeUrl) {
        connectConfig.url = realtimeUrl;
        if (this.config.metadata?.baseUrl || this.config.metadata?.wsUrl || this.config.metadata?.url) {
          console.log(`🔌 [${this.providerType}] Using metadata WebSocket URL: ${connectConfig.url}`);
        } else if (this.providerType === "grok") {
          console.warn(
            "⚠️ [grok] Token metadata did not include a realtime URL. Falling back to the default xAI realtime endpoint."
          );
        }
      }

      console.log(`🔌 [${this.providerType}] Connecting session with ephemeral token...`);
      await this.session.connect(connectConfig);

      this.isConnected = true;
      this.updateConnectionState("connected");
      this.callbacks.onOpen?.();

      console.log(`✅ [${this.providerType}] Session connected successfully`);
    } catch (error: any) {
      console.error(`❌ [${this.providerType}] Failed to connect:`, error);
      this.updateConnectionState("error");
      this.callbacks.onError?.(error);
      throw error;
    }
  }

  /**
   * Set up event listeners for the OpenAI Realtime Session
   */
  private setupEventListeners(): void {
    if (!this.session) return;

    // Note: Using 'as any' for session.on() due to incomplete TypeScript definitions
    // in @openai/agents-realtime SDK. The SDK does support these events at runtime.
    const session = this.session as any;

    // Session events
    session.on('connected', () => {
      console.log("✅ [OpenAI] Session 'connected' event received");
      console.log("  Current isConnected state:", this.isConnected);
      const message: RealtimeMessage = {
        type: RealtimeMessageType.SESSION_CREATED,
        payload: { session: 'connected' },
      };
      this.callbacks.onMessage?.(message);
    });

    session.on('disconnected', () => {
      console.log("🔌 [OpenAI] Session 'disconnected' event received");
      console.log("  Was expected?:", !this.isConnected);
      console.trace("Disconnect event stack trace:");
      this.isConnected = false;
      this.updateConnectionState("disconnected");
      this.callbacks.onClose?.("Session disconnected");
    });

    // Transport events - SDK wraps some events in transport_event
    session.on('transport_event', (event: any) => {
      // User speech transcription - SDK wraps conversation.item.input_audio_transcription.completed
      if (event.type === 'conversation.item.input_audio_transcription.completed') {
        const transcript = event.transcript;
        if (transcript) {
          console.log("📝 [OpenAI] User transcribed (from transport_event):", transcript);
          const message: RealtimeMessage = {
            type: RealtimeMessageType.TRANSCRIPT_DONE,
            payload: {
              transcript: transcript,
              role: 'user',
              itemId: event.item_id,
            },
            rawMessage: event,
          };
          this.callbacks.onMessage?.(message);
        }
      }
    });

    // Audio interrupt event (emitted by SDK when user speaks over AI)
    session.on('audio_interrupted', () => {
      console.log('⚡ [openai] ═══════════════════════════════════════');
      console.log('⚡ [openai] SDK INTERRUPT EVENT RECEIVED');
      console.log('⚡ [openai] ═══════════════════════════════════════');
      console.log('  Event: audio_interrupted');
      console.log('  Source: OpenAI Agents SDK');
      console.log('  Provider: OpenAI Realtime API (WebRTC)');
      console.log('  Timestamp:', new Date().toISOString());
      console.log('  Action: Forwarding to SessionManager');
      
      const message: RealtimeMessage = {
        type: RealtimeMessageType.AUDIO_INTERRUPTED,
        payload: {},
      };
      this.callbacks.onMessage?.(message);
      
      console.log('✅ [openai] Interrupt event forwarded to SessionManager');
      console.log('⚡ [openai] ═══════════════════════════════════════');
    });

    // Audio events - AI speaking
    session.on('response.audio.delta', (event: any) => {
      // OpenAI SDK auto-plays audio, but we still want to notify
      const message: RealtimeMessage = {
        type: RealtimeMessageType.AUDIO_DELTA,
        payload: {
          delta: event.delta, // Base64 audio data
        },
      };
      this.callbacks.onMessage?.(message);
    });

    session.on('response.audio.done', () => {
      const message: RealtimeMessage = {
        type: RealtimeMessageType.AUDIO_DONE,
        payload: {},
      };
      this.callbacks.onMessage?.(message);
    });

    // Response lifecycle events
    // OpenAI Agents.js SDK uses 'turn_started' and 'turn_done' instead of 'response.created' and 'response.done'
    session.on('turn_started', (event: any) => {
      console.log('[openai] 🤖 Turn started (response.created):', event?.providerData?.response?.id);
      const message: RealtimeMessage = {
        type: RealtimeMessageType.RESPONSE_CREATED,
        payload: { 
          responseId: event?.providerData?.response?.id,
          response: event?.providerData?.response,
        },
        rawMessage: event,
      };
      this.callbacks.onMessage?.(message);
    });

    session.on('turn_done', (event: any) => {
      console.log('[openai] ✅ Turn done (response.done):', event?.response?.id);
      
      // Extract final AI speech transcript from response output items
      if (event?.response?.output && Array.isArray(event.response.output)) {
        for (const outputItem of event.response.output) {
          if (outputItem.content && Array.isArray(outputItem.content)) {
            for (const contentPart of outputItem.content) {
              // Look for audio content parts with transcript (TTS output)
              if (contentPart.type === 'audio' && contentPart.transcript) {
                console.log("📝 [OpenAI] AI transcript done (from turn_done):", contentPart.transcript);
                const message: RealtimeMessage = {
                  type: RealtimeMessageType.TRANSCRIPT_DONE,
                  payload: {
                    transcript: contentPart.transcript,
                    role: 'assistant',
                    responseId: event?.response?.id,
                    itemId: outputItem.id,
                  },
                  rawMessage: event,
                };
                this.callbacks.onMessage?.(message);
              }
            }
          }
        }
      }
      
      const message: RealtimeMessage = {
        type: RealtimeMessageType.RESPONSE_DONE,
        payload: { 
          responseId: event?.response?.id,
          response: event?.response,
          usage: event?.response?.usage,
        },
        rawMessage: event,
      };
      this.callbacks.onMessage?.(message);
    });

    // Note: response.cancelled is handled via interrupt() method, not a direct event
    // The SDK handles cancellation internally when interrupt() is called or when user speaks over AI

    // User speech transcription - listen directly
    // The SDK may emit this directly or wrap it in transport_event
    session.on('conversation.item.input_audio_transcription.completed', (event: any) => {
      const transcript = event.transcript;
      if (transcript) {
        console.log("📝 [OpenAI] User transcribed:", transcript);
        const message: RealtimeMessage = {
          type: RealtimeMessageType.TRANSCRIPT_DONE,
          payload: {
            transcript: transcript,
            role: 'user',
            itemId: event.item_id,
          },
          rawMessage: event,
        };
        this.callbacks.onMessage?.(message);
      }
    });

    // AI speech transcription (streaming) - emitted as AI speaks
    // CRITICAL: According to OpenAI Agents.js SDK, audio_transcript_delta events are emitted
    // on the transport layer, not directly on the session. We must listen on session.transport.
    // See: https://github.com/openai/openai-agents-js - RealtimeSession processes transport events internally
    const transport = (session as any).transport;
    if (transport) {
      // Listen for AI transcript deltas on transport
      transport.on('audio_transcript_delta', (event: any) => {
        console.log("📝 [OpenAI] AI transcript delta (from transport):", event.delta);
        const message: RealtimeMessage = {
          type: RealtimeMessageType.TRANSCRIPT_DELTA,
          payload: {
            transcript: event.delta,
            role: 'assistant',
            responseId: event.responseId,
            itemId: event.itemId,
          },
          rawMessage: event,
        };
        this.callbacks.onMessage?.(message);
      });
    } else {
      console.warn("⚠️ [OpenAI] Session transport not available, cannot listen for transcript events");
    }


    // Function/tool calls
    session.on('response.function_call_arguments.done', (event: any) => {
      console.log("🔧 [OpenAI] Function call received:");
      console.log("  Tool Name:", event.name);
      console.log("  Call ID:", event.call_id);
      console.log("  Arguments:", event.arguments);
      console.log("  Full Event:", event);
      
      let parsedArgs;
      try {
        parsedArgs = JSON.parse(event.arguments);
        console.log("  Parsed Args:", parsedArgs);
      } catch (error) {
        console.error("❌ [OpenAI] Failed to parse tool arguments:", error);
        parsedArgs = {};
      }
      
      const message: RealtimeMessage = {
        type: RealtimeMessageType.TOOL_CALL,
        payload: {
          toolCallId: event.call_id,
          toolName: event.name,
          args: parsedArgs,
        },
      };
      
      console.log("📤 [OpenAI] Sending tool call message to SessionManager:", message);
      this.callbacks.onMessage?.(message);
    });

    // Error events with enhanced session timeout handling
    session.on('error', (event: any) => {
      console.error("❌ [OpenAI] Session error event received:");
      console.error("  Error:", event);
      console.error("  Error details:", JSON.stringify(event, null, 2));
      console.trace("Error event stack trace:");
      
      // Check if this is a session timeout (graceful disconnect, not an error)
      // Note: The error structure may be nested: event.error.error.type === 'session_timeout'
      const isSessionTimeout = 
        event.error?.error?.type === 'session_timeout' || 
        event.error?.type === 'session_timeout' || 
        event.type === 'session_timeout';
      
      if (isSessionTimeout) {
        const message = 
          event.error?.error?.message || 
          event.error?.message || 
          event.message || 
          'Session ended';
        
        console.log('[openai] ⏱️  Session timeout (graceful disconnect):', message);
        
        // Notify via message callback (not error callback)
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.SESSION_TIMEOUT,
          payload: { 
            message,
            code: event.error?.error?.code || event.error?.code || event.code,
          },
          rawMessage: event,
        });
        
        // Update connection state
        this.isConnected = false;
        this.updateConnectionState("disconnected");
        
        // Notify close callback
        this.callbacks.onClose?.(message);
      } else {
        // Regular error - handle as error
        const message: RealtimeMessage = {
          type: RealtimeMessageType.ERROR,
          payload: {
            message: event.error?.message || event.message || "Unknown error",
            code: event.error?.code || event.code || null,
          },
        };
        this.callbacks.onMessage?.(message);
        this.callbacks.onError?.(new Error(event.error?.message || "Session error"));
      }
    });
  }

  /**
   * Normalize provider-specific message to common format
   * NOTE: For OpenAI, event normalization is handled by setupEventListeners()
   * The SDK provides pre-normalized events via session.on() callbacks
   * This method is required by the abstract base class but not actively used
   * for OpenAI's event-driven pattern
   */
  protected normalizeMessage(_rawMessage: any): RealtimeMessage | null {
    // OpenAI SDK events are already normalized in setupEventListeners()
    // This method exists to satisfy the abstract base class requirement
    // but is not used in the OpenAI provider's event-driven architecture
    return null;
  }

  /**
   * Create SDK Tool instances from Vowel tool definitions
   * Uses the OpenAI SDK's tool() factory to create proper Tool objects
   * 
   * IMPORTANT: OpenAI SDK calls execute() directly and expects the return value
   * to be the tool result. This is different from Gemini's event-based pattern.
   * We trigger our callback system AND return the result for OpenAI's pattern.
   */
  private createSDKTools(): any[] {
    console.log("🔧 [OpenAI] createSDKTools called");
    console.log("  Config has tools?:", !!this.config.tools);
    console.log("  Tools array length:", this.config.tools?.length || 0);
    
    if (!this.config.tools || this.config.tools.length === 0) {
      console.warn("⚠️ [OpenAI] No tools provided in config!");
      return [];
    }

    console.log("🔧 [OpenAI] Creating tools from Vowel definitions:");
    this.config.tools.forEach((vowelTool: any, index: number) => {
      console.log(`  Tool ${index + 1}/${this.config.tools!.length}:`);
      console.log(`    Name: ${vowelTool.name}`);
      console.log(`    Description: ${vowelTool.description}`);
      console.log(`    Parameters:`, Object.keys(vowelTool.parameters || {}));
    });

    const sdkTools = this.config.tools.map((vowelTool: any) => {
      // Convert VowelAction parameters to Zod schema
      const zodSchema = this.convertVowelActionToZod(vowelTool);
      
      console.log(`  ✅ Created Zod schema for ${vowelTool.name}`);

      const sdkTool = tool({
        name: vowelTool.name,
        description: vowelTool.description,
        parameters: zodSchema,
        execute: async (input: any) => {
          // OpenAI SDK Pattern: The SDK calls execute() directly and uses the return value
          // as the tool response. We need to actually execute the tool here.
          
          console.log(`🔧 [OpenAI] Tool ${vowelTool.name} execute() called with:`, input);
          
          // Emit tool call message to trigger our callback system
          // This ensures state updates (AI thinking, etc.) work correctly
          const toolCallMessage: RealtimeMessage = {
            type: RealtimeMessageType.TOOL_CALL,
            payload: {
              toolCallId: `openai-${Date.now()}-${vowelTool.name}`,
              toolName: vowelTool.name,
              args: input,
            },
          };
          
          console.log("📤 [OpenAI] Emitting tool call to callback system:", toolCallMessage);
          
          // Trigger the callback to update UI state (thinking indicator, etc.)
          this.callbacks.onMessage?.(toolCallMessage);
          
          // For OpenAI, we need to execute the tool directly and return the result
          // because the SDK expects the execute() function to return the actual response
          try {
            // Execute via callback system to get the actual result
            // We create a promise that will be resolved when the tool completes
            const result = await new Promise((resolve) => {
              // Store resolver to complete after tool execution
              this.pendingToolExecutions.set(toolCallMessage.payload.toolCallId, resolve);
              
              // Emit the tool call - SessionManager will handle it
              // and eventually call sendToolResponse() which will resolve our promise
            });
            
            console.log(`✅ [OpenAI] Tool ${vowelTool.name} completed with result:`, result);
            
            // OpenAI SDK expects a string or simple object
            // Extract the actual data from our ToolResult format
            let responseData: any = result;
            if (result && typeof result === 'object' && 'data' in result) {
              responseData = result.data;
            }
            
            // Convert to JSON string
            let jsonResponse = JSON.stringify(responseData);
            
            // IMPORTANT: WebRTC data channels have strict size limits (typically 16KB-256KB per message)
            // This truncation is ONLY for OpenAI's WebRTC transport - it's a WebRTC technical limitation
            // Other providers (Gemini, Vowel Prime) use WebSocket and have NO size limits
            // Large web pages typically generate 300-400KB snapshots, which exceed WebRTC channel limits
            // 
            // NOTE: This is NOT an LLM context limit - the LLM supports very long context
            // This is purely a WebRTC data channel size limitation that OpenAI's SDK uses
            const MAX_RESPONSE_SIZE = 200 * 1024; // 200KB - hard WebRTC channel limit
            if (jsonResponse.length > MAX_RESPONSE_SIZE) {
              console.warn(`⚠️ [OpenAI WebRTC] Response too large (${(jsonResponse.length / 1024).toFixed(2)}KB) - WebRTC channel limit exceeded`);
              console.warn(`   NOTE: This is a WebRTC limitation, NOT an LLM context limit`);
              console.warn(`   TIP: Use 'vowel-prime' or 'gemini' provider (WebSocket) for unlimited snapshot sizes`);
              
              // For snapshots, truncate intelligently
              if (vowelTool.name === 'get_page_snapshot' && responseData.snapshot) {
                const snapshot = responseData.snapshot;
                const lines = snapshot.split('\n');
                const header = lines[0];
                
                // Keep header + as many elements as will fit
                let truncatedLines = [header];
                let currentSize = header.length;
                
                for (let i = 1; i < lines.length; i++) {
                  const line = lines[i];
                  if (currentSize + line.length + 1 > MAX_RESPONSE_SIZE / 2) {
                    truncatedLines.push(`\n... [TRUNCATED: WebRTC channel limit - ${lines.length - i} elements omitted]`);
                    truncatedLines.push(`\nNOTE: Switch to 'vowel-prime' or 'gemini' provider for full snapshots`);
                    break;
                  }
                  truncatedLines.push(line);
                  currentSize += line.length + 1;
                }
                
                jsonResponse = JSON.stringify({
                  ...responseData,
                  snapshot: truncatedLines.join('\n'),
                  _truncated: true,
                  _reason: 'webrtc_channel_limit',
                  _originalSize: jsonResponse.length,
                  _truncatedSize: jsonResponse.length,
                  _elementCount: lines.length - 1,
                  _includedElements: truncatedLines.length - 1,
                });
                
                console.log(`📊 [OpenAI WebRTC] Snapshot truncated: ${truncatedLines.length - 1}/${lines.length - 1} elements`);
                console.log(`   Included: ${(jsonResponse.length / 1024).toFixed(2)}KB of ${(responseData.snapshot.length / 1024).toFixed(2)}KB total`);
              } else {
                // Generic truncation for non-snapshot responses
                jsonResponse = jsonResponse.substring(0, MAX_RESPONSE_SIZE - 200) + 
                  `...[TRUNCATED: WebRTC channel limit (${(jsonResponse.length / 1024).toFixed(2)}KB). Use vowel-prime or gemini provider for unlimited sizes.]`;
              }
            }
            
            return jsonResponse;
          } catch (error: any) {
            console.error(`❌ [OpenAI] Tool ${vowelTool.name} failed:`, error);
            return JSON.stringify({ error: error.message || 'Tool execution failed' });
          }
        },
      });
      
      return sdkTool;
    });
    
    console.log(`✅ [OpenAI] Created ${sdkTools.length} SDK tool instances`);
    return sdkTools;
  }

  /**
   * Convert VowelAction parameter definitions to Zod schema
   * Maps Vowel's parameter types to equivalent Zod validators
   */
  private convertVowelActionToZod(vowelTool: any): z.ZodType<any> {
    if (!vowelTool.parameters || Object.keys(vowelTool.parameters).length === 0) {
      // No parameters - accept empty object but allow passthrough for resilience
      // This prevents "additionalProperties not allowed" errors
      return z.object({}).passthrough();
    }

    const schemaFields: Record<string, z.ZodType<any>> = {};
    
    // CRITICAL: Detect if parameters are in OpenAI/JSON Schema format vs Vowel format
    // OpenAI format has `type: 'object'` and `properties: {...}` at the top level
    // Vowel format has parameter names as keys with nested {type, description, optional}
    const isOpenAIFormat = vowelTool.parameters.type === 'object' && 
                            (vowelTool.parameters.properties !== undefined || 
                             Object.keys(vowelTool.parameters).some((k: string) => ['properties', 'required', 'additionalProperties', '$schema'].includes(k)));
    
    if (isOpenAIFormat) {
      console.log(`  ⚠️ [OpenAI] Tool "${vowelTool.name}" has JSON Schema format - extracting from .properties`);
      
      const properties = vowelTool.parameters.properties || {};
      const required = vowelTool.parameters.required || [];
      
      for (const [paramName, paramDef] of Object.entries(properties)) {
        const param = paramDef as any;
        const isRequired = required.includes(paramName);
        let fieldSchema: z.ZodType<any>;

        // Map JSON Schema types to Zod types
        switch (param.type) {
          case "string":
            fieldSchema = param.enum 
              ? z.enum(param.enum as [string, ...string[]])
              : z.string();
            break;
          case "number":
          case "integer":
            fieldSchema = z.number();
            break;
          case "boolean":
            fieldSchema = z.boolean();
            break;
          case "array":
            fieldSchema = z.array(z.any());
            break;
          case "object":
            fieldSchema = z.object({}).passthrough();
            break;
          default:
            fieldSchema = z.any();
        }

        // Add description if available
        if (param.description) {
          fieldSchema = fieldSchema.describe(param.description);
        }

        // Make optional if not in required array
        if (!isRequired) {
          fieldSchema = fieldSchema.optional().nullable();
        }

        schemaFields[paramName] = fieldSchema;
      }
    } else {
      // Original Vowel format handling
      for (const [paramName, paramDef] of Object.entries(vowelTool.parameters)) {
        const param = paramDef as any;
        let fieldSchema: z.ZodType<any>;

        // Map Vowel parameter types to Zod types
        switch (param.type) {
          case "string":
            fieldSchema = param.enum 
              ? z.enum(param.enum as [string, ...string[]])
              : z.string();
            break;
          case "number":
            fieldSchema = z.number();
            break;
          case "boolean":
            fieldSchema = z.boolean();
            break;
          case "array":
            fieldSchema = z.array(z.any());
            break;
          case "object":
            fieldSchema = z.object({}).passthrough();
            break;
          default:
            fieldSchema = z.any();
        }

        // Add description if available
        if (param.description) {
          fieldSchema = fieldSchema.describe(param.description);
        }

        // Make optional if specified
        // OpenAI requires optional fields to also be nullable
        if (param.optional) {
          fieldSchema = fieldSchema.optional().nullable();
        }

        schemaFields[paramName] = fieldSchema;
      }
    }

    // Use passthrough to allow additional properties for resilience
    return z.object(schemaFields).passthrough();
  }

  async disconnect(): Promise<void> {
    try {
      console.log("🔌 [OpenAI] Disconnecting...");
      
      if (this.session) {
        // The official OpenAI Realtime SDK uses session.close() method
        console.log("✅ [OpenAI] Calling session.close()");
        this.session.close();
        this.session = null;
      }
      
      this.agent = null;
      this.isConnected = false;
      
      // Clean up any pending tool executions
      if (this.pendingToolExecutions.size > 0) {
        console.log(`⚠️ [OpenAI] Clearing ${this.pendingToolExecutions.size} pending tool executions`);
        this.pendingToolExecutions.clear();
      }
      
      this.updateConnectionState("disconnected");
      console.log("✅ [OpenAI] Disconnected");
    } catch (error) {
      console.error("❌ [OpenAI] Error disconnecting:", error);
      // Force cleanup even on error
      this.session = null;
      this.agent = null;
      this.pendingToolExecutions.clear();
      this.isConnected = false;
      this.updateConnectionState("disconnected");
    }
  }

  sendAudio(_audioData: string, _format?: AudioFormat): void {
    // NOTE: OpenAI SDK handles audio input automatically via WebRTC/getUserMedia()
    // The SDK captures mic input and streams it to OpenAI internally
    // 
    // This method exists to satisfy the RealtimeProvider interface but is a no-op
    // for OpenAI because their SDK manages the audio pipeline end-to-end
  }

  /**
   * Send text input to OpenAI
   * 
   * Uses RealtimeSession.sendMessage() to send text content to the AI.
   * This is useful for notifyEvent() calls or programmatic text input.
   */
  sendText(text: string): void {
    if (!this.session || !this.isConnected) {
      console.warn("⚠️ [OpenAI] Cannot send text: not connected");
      return;
    }

    try {
      console.log(`📤 [OpenAI] Sending text message: "${text}"`);
      this.session.sendMessage(text);
    } catch (error) {
      console.error("❌ [OpenAI] Error sending text:", error);
    }
  }

  /**
   * Send image input to OpenAI
   * 
   * Uses RealtimeSession.addImage() to send image content to the AI.
   * Supports both URLs and data URIs.
   * 
   * @param imageUrl - URL or data URI of the image (e.g., "https://..." or "data:image/png;base64,...")
   */
  sendImage(imageUrl: string): void {
    if (!this.session || !this.isConnected) {
      console.warn("⚠️ [OpenAI] Cannot send image: not connected");
      return;
    }

    try {
      console.log(`📤 [OpenAI] Sending image: ${imageUrl.substring(0, 100)}...`);
      this.session.addImage(imageUrl);
    } catch (error) {
      console.error("❌ [OpenAI] Error sending image:", error);
    }
  }

  interrupt(): void {
    if (!this.session || !this.isConnected) {
      return;
    }

    try {
      // Note: TypeScript definitions incomplete for send(), but method exists at runtime
      const session = this.session as any;
      
      // Cancel the current response
      session.send('response.cancel', {});
    } catch (error) {
      console.error("❌ [OpenAI] Error interrupting:", error);
    }
  }

  sendToolResponse(toolCallId: string, toolName: string, response: any): void {
    console.log(`📥 [OpenAI] sendToolResponse called:`);
    console.log("  Call ID:", toolCallId);
    console.log("  Tool Name:", toolName);
    console.log("  Response:", response);

    // Check if there's a pending promise for this tool execution
    const resolver = this.pendingToolExecutions.get(toolCallId);
    
    if (resolver) {
      console.log("✅ [OpenAI] Resolving pending tool execution promise");
      
      // Resolve the promise with the result
      // This will return the result from the execute() function
      resolver(response);
      
      // Clean up the pending execution
      this.pendingToolExecutions.delete(toolCallId);
      
      console.log("✅ [OpenAI] Tool response delivered to execute() function");
      console.log("  The SDK will automatically send the result to OpenAI API");
    } else {
      console.warn("⚠️ [OpenAI] No pending execution found for tool call:", toolCallId);
      console.warn("  Available pending executions:", Array.from(this.pendingToolExecutions.keys()));
      
      // This might be a legacy call or error - log it but don't fail
      console.warn("  Note: OpenAI SDK handles responses via execute() return value");
    }
  }

  updateConfig(config: Partial<RealtimeProviderConfig>): void {
    // Update internal config
    this.config = { ...this.config, ...config };

    // If already connected, update the session
    if (this.session && this.isConnected) {
      try {
        // Note: TypeScript definitions incomplete for send(), but method exists at runtime
        const session = this.session as any;
        
        session.send('session.update', {
          session: {
            voice: config.voice,
            instructions: config.systemInstructions,
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        });
      } catch (error) {
        console.error("❌ [OpenAI] Error updating config:", error);
      }
    }
  }

  /**
   * Update session agent with new instructions using session.updateAgent()
   * This is the recommended pattern for OpenAI Agents SDK - creates a new agent
   * with updated instructions and updates the session.
   * 
   * Note: updateAgent() is async, so we handle it with fire-and-forget pattern
   * to maintain compatibility with the base class signature.
   * 
   * @param updates - Session configuration updates (e.g., instructions)
   */
  sendSessionUpdate(updates: { instructions?: string }): void {
    if (!this.session || !this.isConnected) {
      console.warn('⚠️ [openai] Cannot update agent: Session not connected');
      return;
    }
    
    if (!this.originalAgentConfig) {
      console.warn('⚠️ [openai] Cannot update agent: Original agent config not available');
      return;
    }
    
    if (!updates.instructions) {
      console.warn('⚠️ [openai] Cannot update agent: No instructions provided');
      return;
    }
    
    // Handle async updateAgent() call
    // Fire-and-forget pattern to maintain void return signature
    this.updateAgentAsync(updates.instructions).catch((error) => {
      console.error('❌ [openai] Error updating agent (async):', error);
      // Don't throw - this is fire-and-forget, errors are logged
    });
  }
  
  /**
   * Internal async method to update the agent
   * Separated to handle the async updateAgent() call properly
   */
  private async updateAgentAsync(newInstructions: string): Promise<void> {
    if (!this.session || !this.originalAgentConfig) {
      return;
    }
    
    console.log('📤 [openai] Updating agent with new instructions via session.updateAgent()');
    console.log(`  Instructions length: ${newInstructions.length} chars`);
    
    const preview = newInstructions.substring(0, 200);
    console.log(`  Instructions preview (first 200 chars): ${preview}${newInstructions.length > 200 ? '...' : ''}`);
    
    // Create a new RealtimeAgent with updated instructions
    // Preserve original name and tools, only update instructions
    const newAgentConfig = {
      name: this.originalAgentConfig.name,
      instructions: newInstructions,
      tools: this.originalAgentConfig.tools, // Preserve tools
    };
    
    console.log('🤖 [openai] Creating new RealtimeAgent with updated instructions');
    console.log(`  Name: ${newAgentConfig.name}`);
    console.log(`  Tools count: ${newAgentConfig.tools.length}`);
    
    const newAgent = new RealtimeAgent(newAgentConfig);
    
    // Update the session with the new agent (async)
    // This automatically triggers session.update on the transport layer
    console.log('🔄 [openai] Calling session.updateAgent() to update session');
    await this.session.updateAgent(newAgent);
    
    // Update our stored agent reference
    this.agent = newAgent;
    
    // Update stored instructions in original config for future updates
    this.originalAgentConfig.instructions = newInstructions;
    
    console.log('✅ [openai] Agent updated successfully via session.updateAgent()');
    console.log(`  New instructions length: ${newInstructions.length} chars`);
  }

  getProviderId(): ProviderType {
    return this.providerType;
  }

  isSessionActive(): boolean {
    return this.isConnected;
  }
}







