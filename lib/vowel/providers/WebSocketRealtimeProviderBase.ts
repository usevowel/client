import { RealtimeAgent, RealtimeSession, tool, type RealtimeAgentConfiguration } from '@openai/agents-realtime';
import { z } from 'zod';
import {
  RealtimeProvider,
  type RealtimeProviderConfig,
  type RealtimeProviderCallbacks,
  type RealtimeMessage,
  type AudioFormat,
  RealtimeMessageType,
} from "./RealtimeProvider";

interface WebSocketRealtimeProviderBaseOptions {
  voiceMap?: Record<string, string>;
}

/**
 * Shared base for OpenAI-compatible WebSocket realtime providers.
 *
 * This covers the common pieces used by both `vowel-prime` and Grok:
 * - OpenAI Agents SDK tool definitions
 * - manual audio streaming over WebSocket transports
 * - queued text/image messages until the session is fully ready
 * - tool response resolution
 * - session.updateAgent() based instruction updates
 */
export abstract class WebSocketRealtimeProviderBase extends RealtimeProvider {
  protected agent: RealtimeAgent | null = null;
  protected session: RealtimeSession | null = null;
  protected isConnected = false;
  protected originalAgentConfig: RealtimeAgentConfiguration | null = null;
  protected pendingToolExecutions: Map<string, (result: any) => void> = new Map();
  protected messageQueue: Array<{ type: 'text' | 'image'; data: string }> = [];
  protected isFullyReady = false;
  protected sessionCreatedResolver: (() => void) | null = null;
  protected voiceMap: Record<string, string>;
  private pendingToolContinuationTimer: ReturnType<typeof setTimeout> | null = null;
  private hasLoggedAudio = false;

  constructor(
    config: RealtimeProviderConfig,
    callbacks: RealtimeProviderCallbacks,
    options: WebSocketRealtimeProviderBaseOptions = {}
  ) {
    super(config, callbacks);
    this.voiceMap = options.voiceMap ?? {};
  }

  getAudioFormat(): AudioFormat {
    const configuredInput = this.getConfiguredAudioFormat('input');
    return {
      mimeType: configuredInput.mimeType ?? "audio/pcm;rate=24000",
      sampleRate: configuredInput.sampleRate ?? 24000,
      channels: configuredInput.channels ?? 1,
      encoding: configuredInput.encoding ?? "pcm16",
    };
  }

  override getInputAudioFormat(): AudioFormat {
    return this.getAudioFormat();
  }

  override getOutputAudioFormat(): AudioFormat {
    const configuredOutput = this.getConfiguredAudioFormat('output');
    return {
      mimeType: configuredOutput.mimeType ?? "audio/pcm;rate=24000",
      sampleRate: configuredOutput.sampleRate ?? 24000,
      channels: configuredOutput.channels ?? 1,
      encoding: configuredOutput.encoding ?? "pcm16",
    };
  }

  handlesAudioInternally(): boolean {
    return false;
  }

  protected getLogLabel(): string {
    return this.getProviderId();
  }

  protected getDefaultTurnDetectionMode(): 'client_vad' | 'server_vad' | 'disabled' {
    return 'server_vad';
  }

  protected getResolvedTurnDetectionMode(): 'client_vad' | 'server_vad' | 'disabled' {
    const turnDetection = this.config.metadata?.turnDetection as any;
    return turnDetection?.mode ?? this.getDefaultTurnDetectionMode();
  }

  protected getConfiguredAudioFormat(direction: 'input' | 'output'): Partial<AudioFormat> {
    return this.config.audioConfig?.[direction] ?? this.config.metadata?.audioConfig?.[direction] ?? {};
  }

  protected mapVoiceName(voice: string): string {
    return this.voiceMap[voice] || voice;
  }

  protected createSDKTools(): any[] {
    const provider = this.getLogLabel();
    console.log(`🔄 [${provider}] Converting tools to OpenAI SDK format`);

    if (!this.config.tools || this.config.tools.length === 0) {
      console.log(`⚠️ [${provider}] No tools provided in config`);
      return [];
    }

    console.log(`[${provider}] Input tools: ${this.config.tools.length}`);
    console.log(`[${provider}] Tool names: ${this.config.tools.map((t: any) => t.name).join(', ')}`);

    return this.config.tools.map((toolDef: any, index: number) => {
      console.log(`[${provider}] Tool #${index + 1}: ${toolDef.name}`);

      const schemaObj: Record<string, any> = {};

      if (toolDef.parameters && typeof toolDef.parameters === 'object') {
        const isOpenAIFormat =
          toolDef.parameters.type === 'object' &&
          (toolDef.parameters.properties !== undefined ||
            Object.keys(toolDef.parameters).some((k: string) =>
              ['properties', 'required', 'additionalProperties', '$schema'].includes(k)
            ));

        if (isOpenAIFormat) {
          const properties = toolDef.parameters.properties || {};
          const required = toolDef.parameters.required || [];

          Object.entries(properties).forEach(([paramName, paramDef]: [string, any]) => {
            const isRequired = required.includes(paramName);
            let zodType: any;

            switch (paramDef.type) {
              case 'string':
                zodType = z.string();
                break;
              case 'number':
              case 'integer':
                zodType = z.number();
                break;
              case 'boolean':
                zodType = z.boolean();
                break;
              case 'array':
                zodType = z.array(z.any());
                break;
              case 'object':
                zodType = z.object({}).passthrough();
                break;
              default:
                zodType = z.any();
            }

            if (paramDef.description) {
              zodType = zodType.describe(paramDef.description);
            }

            if (!isRequired) {
              zodType = zodType.optional().nullable();
            }

            schemaObj[paramName] = zodType;
          });
        } else {
          Object.entries(toolDef.parameters).forEach(([paramName, paramDef]: [string, any]) => {
            let zodType: any;

            switch (paramDef.type) {
              case 'string':
                zodType = z.string();
                break;
              case 'number':
                zodType = z.number();
                break;
              case 'boolean':
                zodType = z.boolean();
                break;
              case 'array':
                zodType = z.array(z.any());
                break;
              case 'object':
                zodType = z.object({}).passthrough();
                break;
              default:
                zodType = z.any();
            }

            if (paramDef.description) {
              zodType = zodType.describe(paramDef.description);
            }

            if (paramDef.optional) {
              zodType = zodType.optional().nullable();
            }

            schemaObj[paramName] = zodType;
          });
        }
      }

      const schema =
        Object.keys(schemaObj).length > 0
          ? z.object(schemaObj).passthrough()
          : z.object({}).passthrough();

      return tool({
        name: toolDef.name,
        description: toolDef.description || "",
        parameters: schema,
        execute: async (args: any, _runContext?: any, details?: any) => {
          const toolCallId =
            details?.toolCall?.callId ??
            details?.toolCall?.call_id ??
            `tool_${Date.now()}_${Math.random()}`;
          console.log(`⚡ [${provider}] Tool execute: ${toolDef.name}`, args);
          console.log(`⚡ [${provider}] Tool call id: ${toolCallId}`);

          return new Promise((resolve) => {
            this.pendingToolExecutions.set(toolCallId, resolve);
            this.callbacks.onMessage?.({
              type: RealtimeMessageType.TOOL_CALL,
              payload: {
                toolCallId,
                toolName: toolDef.name,
                parameters: args,
              },
            });
          });
        },
      });
    });
  }

  async disconnect(): Promise<void> {
    const provider = this.getLogLabel();
    console.log(`🔌 [${provider}] Disconnecting...`);

    try {
      if (this.session) {
        this.session.close();
        console.log(`✅ [${provider}] Session closed`);
      }
    } catch (error) {
      console.error(`❌ [${provider}] Error closing session:`, error);
    } finally {
      this.clearPendingToolContinuationTimer();
      this.session = null;
      this.agent = null;
      this.pendingToolExecutions.clear();
      this.messageQueue = [];
      this.isConnected = false;
      this.isFullyReady = false;
      this.updateConnectionState("disconnected");
    }
  }

  sendAudio(audioData: string, _format?: AudioFormat): void {
    const provider = this.getLogLabel();
    if (!this.session || !this.isConnected) {
      console.warn(`⚠️ [${provider}] Cannot send audio: not connected`);
      return;
    }

    if (!this.isFullyReady) {
      return;
    }

    try {
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      if (!this.hasLoggedAudio) {
        console.log(`[${provider}] First chunk sample (16-bit PCM):`, new Int16Array(arrayBuffer.slice(0, 10)));
        this.hasLoggedAudio = true;
      }

      this.session.sendAudio(arrayBuffer);
    } catch (error) {
      console.error(`❌ [${provider}] Error sending audio:`, error);
    }
  }

  commitAudio(concatenatedAudioBuffer: ArrayBuffer): void {
    const provider = this.getLogLabel();
    if (this.getResolvedTurnDetectionMode() !== 'client_vad') {
      return;
    }

    if (!this.session || !this.isConnected) {
      console.warn(`⚠️ [${provider}] Cannot commit audio: not connected`);
      return;
    }

    if (!concatenatedAudioBuffer || concatenatedAudioBuffer.byteLength === 0) {
      console.warn(`⚠️ [${provider}] Cannot commit: empty audio buffer`);
      return;
    }

    try {
      const transport = (this.session as any).transport;
      if (!transport || !transport.sendAudio) {
        console.warn(`⚠️ [${provider}] Transport layer not available for audio commit`);
        return;
      }

      const chunkSize = 8192;
      const totalBytes = concatenatedAudioBuffer.byteLength;
      const numChunks = Math.ceil(totalBytes / chunkSize);

      console.log(`🎤 [${provider}] Committing audio: ${totalBytes} bytes in ${numChunks} chunks`);

      let i = 0;
      for (; i < totalBytes - chunkSize; i += chunkSize) {
        const chunk = concatenatedAudioBuffer.slice(i, i + chunkSize);
        transport.sendAudio(chunk, { commit: false });
      }

      const finalChunk = concatenatedAudioBuffer.slice(i);
      transport.sendAudio(finalChunk, { commit: true });
      console.log(`✅ [${provider}] Audio committed via transport layer`);
    } catch (error) {
      console.error(`❌ [${provider}] Error committing audio:`, error);
    }
  }

  sendText(text: string): void {
    const provider = this.getLogLabel();
    if (!this.session || !this.isConnected) {
      console.warn(`⚠️ [${provider}] Cannot send text: not connected`);
      return;
    }

    if (!this.isFullyReady) {
      console.log(`📋 [${provider}] Connection not fully ready, queueing text message`);
      this.messageQueue.push({ type: 'text', data: text });
      return;
    }

    try {
      console.log(`📤 [${provider}] Sending text message: "${text}"`);
      this.session.sendMessage(text);
    } catch (error) {
      console.error(`❌ [${provider}] Error sending text:`, error);
    }
  }

  sendImage(imageUrl: string): void {
    const provider = this.getLogLabel();
    if (!this.session || !this.isConnected) {
      console.warn(`⚠️ [${provider}] Cannot send image: not connected`);
      return;
    }

    if (!this.isFullyReady) {
      console.log(`📋 [${provider}] Connection not fully ready, queueing image`);
      this.messageQueue.push({ type: 'image', data: imageUrl });
      return;
    }

    try {
      console.log(`📤 [${provider}] Sending image`);
      this.session.addImage(imageUrl);
    } catch (error) {
      console.error(`❌ [${provider}] Error sending image:`, error);
    }
  }

  override interrupt(): void {
    const provider = this.getLogLabel();
    if (!this.session || !this.isConnected) {
      return;
    }

    try {
      this.session.interrupt();
      console.log(`⚡ [${provider}] Requested session interrupt`);
    } catch (error) {
      console.error(`❌ [${provider}] Error interrupting response:`, error);
    }
  }

  sendToolResponse(toolCallId: string, toolName: string, result: any): void {
    const provider = this.getLogLabel();
    console.log(`📤 [${provider}] Tool response for ${toolName}`, { toolCallId, result });

    const resolver = this.pendingToolExecutions.get(toolCallId);
    if (resolver) {
      resolver(result);
      this.pendingToolExecutions.delete(toolCallId);
      console.log(`✅ [${provider}] Tool response resolved`);
    } else {
      console.warn(`⚠️ [${provider}] No pending tool execution found for ${toolCallId}`);
    }
  }

  private clearPendingToolContinuationTimer(): void {
    if (this.pendingToolContinuationTimer) {
      clearTimeout(this.pendingToolContinuationTimer);
      this.pendingToolContinuationTimer = null;
    }
  }

  protected normalizeMessage(_rawMessage: any): RealtimeMessage | null {
    return null;
  }

  sendSessionUpdate(updates: { instructions?: string }): void {
    const provider = this.getLogLabel();
    if (!this.session || !this.isConnected) {
      console.warn(`⚠️ [${provider}] Cannot update agent: session not connected`);
      return;
    }

    if (!this.originalAgentConfig) {
      console.warn(`⚠️ [${provider}] Cannot update agent: original agent config not available`);
      return;
    }

    if (!updates.instructions) {
      console.warn(`⚠️ [${provider}] Cannot update agent: no instructions provided`);
      return;
    }

    this.updateAgentAsync(updates.instructions).catch((error) => {
      console.error(`❌ [${provider}] Error updating agent:`, error);
    });
  }

  protected async updateAgentAsync(newInstructions: string): Promise<void> {
    const provider = this.getLogLabel();
    if (!this.session || !this.originalAgentConfig) {
      return;
    }

    console.log(`📤 [${provider}] Updating agent with new instructions via session.updateAgent()`);

    const newAgentConfig: RealtimeAgentConfiguration = {
      name: this.originalAgentConfig.name,
      instructions: newInstructions,
      tools: this.originalAgentConfig.tools,
    };

    const newAgent = new RealtimeAgent(newAgentConfig);
    await this.session.updateAgent(newAgent);
    this.agent = newAgent;
    this.originalAgentConfig.instructions = newInstructions;

    console.log(`✅ [${provider}] Agent updated successfully`);
  }

  /**
   * Set up common SDK event listeners for all WebSocket providers.
   * This consolidates event handling that was previously duplicated across
   * OpenAI, VowelPrime, and Grok providers.
   * 
   * Providers should call this method during their connect() after session is created.
   */
  protected setupSDKSessionEventListeners(): void {
    const provider = this.getLogLabel();
    
    if (!this.session) {
      console.warn(`⚠️ [${provider}] Cannot setup SDK listeners: no session`);
      return;
    }

    const session = this.session;
    const transport = (session as any).transport;

    // IMPORTANT: Do not listen to the SDK's function_call event here.
    // For these WebSocket providers, the SDK already invokes each tool's execute()
    // callback, and createSDKTools() bridges that callback into our TOOL_CALL flow.
    // Emitting TOOL_CALL again from function_call would execute every tool twice and
    // leave one of the duplicate paths unresolved.

    // Audio events - SDK handles these consistently
    session.on('audio', (event: any) => {
      if (event.data && event.data.byteLength > 0) {
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.AUDIO_DELTA,
          payload: {
            audio: event.data,
            responseId: event.responseId,
          },
          rawMessage: event,
        });
      }
    });

    session.on('audio_stopped', (event: any) => {
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.AUDIO_DONE,
        payload: {
          responseId: event?.responseId,
        },
        rawMessage: event,
      });
    });

    session.on('audio_interrupted', () => {
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.AUDIO_INTERRUPTED,
        payload: {},
      });
    });

    // Response lifecycle events - transport-level
    // SDK uses 'turn_started' and 'turn_done' instead of 'response.created' and 'response.done'
    session.on('transport_event', (event: any) => {
      const isCancelledResponse =
        event.type === 'response.cancelled' ||
        (event.type === 'response.done' && event.response?.status === 'cancelled');

      if (!isCancelledResponse) {
        return;
      }

      const responseId = event.response?.id;
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.RESPONSE_CANCELLED,
        payload: {
          responseId,
          response: event.response,
        },
        rawMessage: event,
      });
    });

    transport?.on('response.cancelled', (event: any) => {
      const responseId = event?.response?.id;
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.RESPONSE_CANCELLED,
        payload: {
          responseId,
          response: event?.response,
        },
        rawMessage: event,
      });
    });

    transport?.on('turn_started', (event: any) => {
      this.clearPendingToolContinuationTimer();
      const responseId = event?.providerData?.response?.id;
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.RESPONSE_CREATED,
        payload: { 
          responseId,
          response: event?.providerData?.response,
        },
        rawMessage: event,
      });
      
      // Reset transcript accumulation for new response
      if (responseId) {
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.TRANSCRIPT_DELTA,
          payload: { 
            transcript: '',
            role: 'assistant',
            responseId,
            itemId: event?.providerData?.response?.output?.[0]?.id,
          },
          rawMessage: { ...event, _reset: true },
        });
      }
    });

    transport?.on('turn_done', (event: any) => {
      const responseId = event?.response?.id;

      console.log(`✅ [${provider}] Turn done: ${responseId}`);
      
      // Extract final AI speech transcript from response output items
      if (event?.response?.output && Array.isArray(event.response.output)) {
        for (const outputItem of event.response.output) {
          if (outputItem.content && Array.isArray(outputItem.content)) {
            for (const contentPart of outputItem.content) {
              // Look for audio content parts with transcript (TTS output)
              if (contentPart.type === 'audio' && contentPart.transcript) {
                this.callbacks.onMessage?.({
                  type: RealtimeMessageType.TRANSCRIPT_DONE,
                  payload: { 
                    transcript: contentPart.transcript,
                    role: 'assistant',
                    responseId,
                    itemId: outputItem.id,
                  },
                  rawMessage: event,
                });
              }
            }
          }
        }
      }
      
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.RESPONSE_DONE,
        payload: { 
          responseId,
          response: event?.response,
          usage: event?.response?.usage,
        },
        rawMessage: event,
      });
    });

    // AI speech transcription (streaming)
    transport?.on('audio_transcript_delta', (event: any) => {
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

    console.log(`✅ [${provider}] SDK session event listeners setup complete`);
  }
}
