import { RealtimeAgent, RealtimeSession } from '@openai/agents-realtime';
import {
  type RealtimeProviderConfig,
  type RealtimeProviderCallbacks,
  type ProviderType,
  type AudioFormat,
  RealtimeMessageType,
} from "./RealtimeProvider";
import { GrokRealtimeWebSocketTransport } from "./GrokRealtimeWebSocketTransport";
import { WebSocketRealtimeProviderBase } from "./WebSocketRealtimeProviderBase";

/**
 * Grok realtime provider
 *
 * Implements xAI's Voice Agent API over WebSocket with manual audio streaming.
 * Browser auth differs from OpenAI-compatible providers, so we supply a custom
 * WebSocket creator for the SDK transport.
 */
export class GrokRealtimeProvider extends WebSocketRealtimeProviderBase {
  private baseUrl = "wss://api.x.ai/v1/realtime";
  private hasSessionUpdatedAck = false;
  private sessionUpdatedResolver: (() => void) | null = null;

  constructor(config: RealtimeProviderConfig, callbacks: RealtimeProviderCallbacks) {
    super(config, callbacks);

    this.baseUrl =
      config.metadata?.baseUrl ??
      config.metadata?.wsUrl ??
      config.metadata?.url ??
      this.baseUrl;

    console.log('🎯 GROK PROVIDER INIT');
    console.log('  Model:', config.model || '(none)');
    console.log('  Voice:', config.voice || '(none)');
    console.log('  Base URL:', this.baseUrl);
    console.log('  System Instructions:', `${config.systemInstructions?.length || 0} chars`);
    console.log('  Tools:', config.tools ? `${config.tools.length} tools` : '(none)');
  }

  getProviderId(): ProviderType {
    return "grok";
  }

  override getOutputAudioFormat(): AudioFormat {
    const configuredOutput = this.config.audioConfig?.output ?? this.config.metadata?.audioConfig?.output ?? {};
    return {
      mimeType: configuredOutput.mimeType ?? "audio/pcm;rate=48000",
      sampleRate: configuredOutput.sampleRate ?? 48000,
      channels: configuredOutput.channels ?? 1,
      encoding: configuredOutput.encoding ?? "pcm16",
    };
  }

  protected getDefaultTurnDetectionMode(): 'client_vad' | 'server_vad' | 'disabled' {
    return 'server_vad';
  }

  private setupEventListeners(): void {
    if (!this.session) {
      console.warn("⚠️ [grok] Cannot setup listeners: no session");
      return;
    }

    const session = this.session as any;

    session.on('transport_event', (event: any) => {
      console.log('[grok] transport_event:', event.type);

      if (event.type === 'session.created') {
        console.log('[grok] session.created received');
        if (this.sessionCreatedResolver) {
          this.sessionCreatedResolver();
          this.sessionCreatedResolver = null;
        }

        this.callbacks.onMessage?.({
          type: RealtimeMessageType.SESSION_CREATED,
          payload: { session: event.session },
          rawMessage: event,
        });
      }

      if (event.type === 'session.updated') {
        this.hasSessionUpdatedAck = true;
        if (this.sessionUpdatedResolver) {
          this.sessionUpdatedResolver();
          this.sessionUpdatedResolver = null;
        }

        this.callbacks.onMessage?.({
          type: RealtimeMessageType.SESSION_UPDATED,
          payload: { session: event.session },
          rawMessage: event,
        });
      }

      if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript) {
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.TRANSCRIPT_DONE,
          payload: {
            transcript: event.transcript,
            role: 'user',
            itemId: event.item_id,
          },
          rawMessage: event,
        });
      }

      if (event.type === 'response.text.done' && event.text) {
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.TRANSCRIPT_DONE,
          payload: {
            transcript: event.text,
            role: 'assistant',
            responseId: event.response_id || event.responseId,
            itemId: event.item_id || event.itemId,
          },
          rawMessage: event,
        });
      }

      if (event.type === 'response.created') {
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.RESPONSE_CREATED,
          payload: {
            responseId: event?.response?.id,
            response: event?.response,
          },
          rawMessage: event,
        });
      }

      if (event.type === 'response.done') {
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
      if (event.type === 'response.cancelled') {
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.RESPONSE_CANCELLED,
          payload: {
            responseId: event?.response?.id ?? event?.response_id,
            response: event?.response,
          },
          rawMessage: event,
        });
      }
    });

    session.on('close', (event?: any) => {
      const reason = event?.reason || event?.message || 'Session closed';
      this.isConnected = false;
      this.updateConnectionState("disconnected");
      this.callbacks.onClose?.(reason);
    });

    session.on('disconnected', (event?: any) => {
      const reason = event?.reason || event?.message || 'Connection disconnected';
      this.isConnected = false;
      this.updateConnectionState("disconnected");
      this.callbacks.onClose?.(reason);
    });

    session.on('turn_started', (event: any) => {
      const responseId = event?.providerData?.response?.id;
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.RESPONSE_CREATED,
        payload: {
          responseId,
          response: event?.providerData?.response,
        },
        rawMessage: event,
      });

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

    session.on('turn_done', (event: any) => {
      if (event?.response?.output && Array.isArray(event.response.output)) {
        for (const outputItem of event.response.output) {
          if (!outputItem.content || !Array.isArray(outputItem.content)) {
            continue;
          }

          for (const contentPart of outputItem.content) {
            if (contentPart.type === 'audio' && contentPart.transcript) {
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

      this.callbacks.onMessage?.({
        type: RealtimeMessageType.RESPONSE_DONE,
        payload: {
          responseId: event?.response?.id,
          response: event?.response,
          usage: event?.response?.usage,
        },
        rawMessage: event,
      });
    });

    session.on('input_audio_buffer.speech_started', () => {
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.AUDIO_BUFFER_SPEECH_STARTED,
        payload: {},
      });
    });

    session.on('input_audio_buffer.speech_stopped', () => {
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.AUDIO_BUFFER_SPEECH_STOPPED,
        payload: {},
      });
    });

    session.on('audio_interrupted', () => {
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.AUDIO_INTERRUPTED,
        payload: {},
      });
    });

    session.on('audio', (event: any) => {
      if (event.data && event.data.byteLength > 0) {
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.AUDIO_DELTA,
          payload: { audio: event.data },
          rawMessage: event,
        });
      }
    });

    session.on('audio_stopped', () => {
      this.callbacks.onMessage?.({
        type: RealtimeMessageType.AUDIO_DONE,
        payload: {},
      });
    });

    session.on('conversation.item.input_audio_transcription.completed', (event: any) => {
      if (event.transcript) {
        this.callbacks.onMessage?.({
          type: RealtimeMessageType.TRANSCRIPT_DONE,
          payload: {
            transcript: event.transcript,
            role: 'user',
            itemId: event.item_id,
          },
          rawMessage: event,
        });
      }
    });

    const transport = (session as any).transport;
    if (transport) {
      transport.on('audio_transcript_delta', (event: any) => {
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
    }

    session.on('error', (error: any) => {
      console.error('[grok] Session error:', error);

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

        this.callbacks.onMessage?.({
          type: RealtimeMessageType.SESSION_TIMEOUT,
          payload: {
            message,
            code: error.error?.error?.code || error.error?.code || error.code,
          },
          rawMessage: error,
        });

        this.isConnected = false;
        this.updateConnectionState("disconnected");
        this.callbacks.onClose?.(message);
        return;
      }

      this.updateConnectionState("error");
      const errorObj = new Error(
        error.error?.error?.message || error.error?.message || error.message || 'Session error'
      );
      (errorObj as any).rawError = error;
      this.callbacks.onError?.(errorObj);
    });
  }

  async connect(): Promise<void> {
    try {
      console.log('🔌 [grok] Connecting to Grok realtime...');
      this.updateConnectionState("connecting");

      const voiceToUse = this.mapVoiceName(this.config.voice || "Rex");
      const sdkTools = this.createSDKTools();
      const agentConfig = {
        name: "Vowel Agent",
        instructions: this.config.systemInstructions || "",
        tools: sdkTools,
      };

      this.originalAgentConfig = {
        name: agentConfig.name,
        tools: sdkTools,
        instructions: agentConfig.instructions,
      };

      this.agent = new RealtimeAgent(agentConfig);

      const turnDetection = this.config.metadata?.turnDetection as any;
      const turnDetectionMode = this.getResolvedTurnDetectionMode();
      const inputAudioFormat = this.getInputAudioFormat();
      const outputAudioFormat = this.getOutputAudioFormat();
      let turnDetectionConfig: any;

      if (turnDetectionMode === 'client_vad') {
        turnDetectionConfig = { type: 'disabled' };
      } else if (turnDetectionMode === 'disabled') {
        turnDetectionConfig = { type: 'disabled' };
      } else {
        const serverVADConfig = turnDetection?.serverVAD;
        turnDetectionConfig = {
          type: 'server_vad',
          threshold: serverVADConfig?.threshold ?? 0.5,
          silenceDurationMs: serverVADConfig?.silenceDurationMs ?? 500,
          prefixPaddingMs: serverVADConfig?.prefixPaddingMs ?? 300,
          interruptResponse: serverVADConfig?.interruptResponse ?? true,
        };
      }

      const transport = new GrokRealtimeWebSocketTransport({
        url: this.baseUrl,
        useInsecureApiKey: true,
        createWebSocket: async ({ url, apiKey }) => {
          const protocols = ['realtime', `xai-client-secret.${apiKey}`];
          return new WebSocket(url, protocols) as any;
        },
      });

      const sessionConfig: any = {
        transport,
        model: this.config.model,
        config: {
          audio: {
            input: {
              format: { type: 'audio/pcm', rate: inputAudioFormat.sampleRate },
              turnDetection: turnDetectionConfig,
            },
            output: {
              format: { type: 'audio/pcm', rate: outputAudioFormat.sampleRate },
              voice: voiceToUse,
            },
          },
        },
      };

      this.session = new RealtimeSession(this.agent, sessionConfig);
      this.setupEventListeners();

      this.hasSessionUpdatedAck = false;
      const sessionUpdatedPromise = new Promise<void>((resolve) => {
        this.sessionUpdatedResolver = resolve;
      });

      await this.session.connect({
        url: this.baseUrl,
        apiKey: this.config.token,
      });

      this.isConnected = true;
      this.updateConnectionState("connected");

      if (!this.hasSessionUpdatedAck) {
        console.log('[grok] Waiting for session.updated...');
        await new Promise<void>((resolve) => {
          const timeoutId = setTimeout(() => {
            if (this.sessionUpdatedResolver) {
              console.warn('[grok] Timeout waiting for session.updated, proceeding anyway');
              this.sessionUpdatedResolver = null;
            }
            resolve();
          }, 2000);

          sessionUpdatedPromise.then(() => {
            clearTimeout(timeoutId);
            resolve();
          });
        });
      }

      await this.callbacks.onOpen?.();
      this.isFullyReady = true;

      if (this.messageQueue.length > 0) {
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
      console.error('❌ [grok] Connection failed:', error);
      this.updateConnectionState("error");
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }
}
