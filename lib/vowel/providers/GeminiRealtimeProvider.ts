/**
 * Gemini Live Realtime Provider
 * 
 * Wraps Gemini Live API in common RealtimeProvider interface
 */

// @ts-ignore - external dependency
import { GoogleGenAI, type Session, Modality } from "@google/genai";
import {
  RealtimeProvider,
  RealtimeMessageType,
  type RealtimeProviderConfig,
  type RealtimeProviderCallbacks,
  type RealtimeMessage,
  type AudioFormat,
  type ProviderType,
} from "./RealtimeProvider";

/**
 * Gemini Live realtime provider implementation
 */
export class GeminiRealtimeProvider extends RealtimeProvider {
  private client: GoogleGenAI | null = null;
  private session: Session | null = null;

  constructor(config: RealtimeProviderConfig, callbacks: RealtimeProviderCallbacks) {
    super(config, callbacks);
  }

  getProviderId(): ProviderType {
    return "gemini";
  }

  getAudioFormat(): AudioFormat {
    return {
      mimeType: "audio/pcm;rate=16000",
      sampleRate: 16000,
      channels: 1,
      encoding: "pcm16",
    };
  }

  async connect(): Promise<void> {
    try {
      console.log("🔌 [Gemini] Connecting to Gemini Live...");
      this.updateConnectionState("connecting");

      // Initialize Google GenAI client with ephemeral token
      this.client = new GoogleGenAI({
        apiKey: this.config.token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      // Build session config
      const sessionConfig: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: this.config.voice || "Puck",
            },
          },
        },
      };

      console.log("🔌 [Gemini] Creating live session");
      console.log("  Model:", this.config.model);
      console.log("  Voice:", this.config.voice || "Puck");

      // Connect to Live API
      this.session = await this.client.live.connect({
        model: this.config.model,
        config: sessionConfig,
        callbacks: {
          onopen: () => {
            console.log("✅ [Gemini] Live session opened");
            this.updateConnectionState("connected");
            this.callbacks.onOpen?.();
          },
          onclose: (e: CloseEvent) => {
            console.log("🔌 [Gemini] Live session closed:", e.reason);
            this.updateConnectionState("disconnected");
            this.callbacks.onClose?.(e.reason || "Unknown");
          },
          onerror: (e: ErrorEvent) => {
            console.error("❌ [Gemini] Live session error:", e.message);
            this.updateConnectionState("error");
            this.callbacks.onError?.(new Error(e.message));
          },
          onmessage: (message: any) => {
            console.log("📨 [Gemini] Raw message received:", JSON.stringify(message, null, 2));
            const normalized = this.normalizeMessage(message);
            if (normalized) {
              console.log("📨 [Gemini] Normalized message:", JSON.stringify(normalized, null, 2));
              this.callbacks.onMessage?.(normalized);
            }
          },
        },
      });

      console.log("✅ [Gemini] Connected successfully");
    } catch (error: any) {
      console.error("❌ [Gemini] Failed to connect:", error);
      this.updateConnectionState("error");
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    console.log("🔌 [Gemini] Disconnecting...");
    if (this.session) {
      // Gemini SDK handles cleanup automatically
      this.session = null;
      this.updateConnectionState("disconnected");
    }
  }

  sendAudio(audioData: string, format: AudioFormat): void {
    if (!this.session) {
      throw new Error("[Gemini] Session not connected");
    }

    this.session.sendRealtimeInput({
      media: {
        data: audioData,
        mimeType: format.mimeType,
      },
    });
  }

  sendText(text: string): void {
    if (!this.session) {
      throw new Error("[Gemini] Session not connected");
    }

    this.session.sendRealtimeInput({
      text,
    });
  }

  /**
   * Send image input to Gemini
   * 
   * Note: Gemini Multimodal Live API may not support image input in realtime mode.
   * This is a placeholder for future support.
   */
  sendImage(imageUrl: string): void {
    console.warn(
      "⚠️ [Gemini] Image input not yet supported in realtime mode. " +
      `Attempted to send: ${imageUrl.substring(0, 100)}...`
    );
  }

  sendToolResponse(toolCallId: string, toolName: string, result: any): void {
    if (!this.session) {
      throw new Error("[Gemini] Session not connected");
    }

    console.log("📤 [Gemini] Sending tool response:");
    console.log("  Tool Call ID:", toolCallId);
    console.log("  Tool Name:", toolName);
    console.log("  Original result:", JSON.stringify(result, null, 2));

    try {
      // Send the full ToolResult object as it was before refactoring
      // The old code sent: { id, name, response: <ToolResult> }
      this.session.sendToolResponse({
        functionResponses: [
          {
            id: toolCallId,
            name: toolName,  // CRITICAL: The name field was missing in our refactored code!
            response: result,  // Send the full ToolResult object as-is
          },
        ],
      });
      console.log("✅ [Gemini] Tool response sent successfully");
    } catch (error: any) {
      console.error("❌ [Gemini] Failed to send tool response:", error);
      throw error;
    }
  }

  /**
   * Normalize Gemini message to common format
   */
  protected normalizeMessage(rawMessage: any): RealtimeMessage | null {
    // Map Gemini message types to normalized types
    
    // Handle server content (audio/text from AI)
    if (rawMessage.serverContent?.modelTurn?.parts) {
      const parts = rawMessage.serverContent.modelTurn.parts;

      // Handle audio delta
      if (parts[0]?.inlineData) {
        return {
          type: RealtimeMessageType.AUDIO_DELTA,
          payload: {
            delta: parts[0].inlineData.data,
            mimeType: parts[0].inlineData.mimeType,
          },
          rawMessage,
        };
      }

      // Handle text/transcript
      if (parts[0]?.text) {
        return {
          type: RealtimeMessageType.TRANSCRIPT_DELTA,
          payload: {
            text: parts[0].text,
          },
          rawMessage,
        };
      }
    }

    // Handle tool calls
    if (rawMessage.toolCall) {
      const functionCall = rawMessage.toolCall.functionCalls[0];
      console.log("🔧 [Gemini] Tool call detected:");
      console.log("  ID:", functionCall.id);
      console.log("  Name:", functionCall.name);
      console.log("  Args:", JSON.stringify(functionCall.args, null, 2));
      return {
        type: RealtimeMessageType.TOOL_CALL,
        payload: {
          toolCallId: functionCall.id,
          toolName: functionCall.name,
          args: functionCall.args,
        },
        rawMessage,
      };
    }

    // Handle tool call cancellation
    if (rawMessage.toolCallCancellation) {
      return {
        type: RealtimeMessageType.TOOL_CALL_CANCELLED,
        payload: {
          toolCallIds: rawMessage.toolCallCancellation.ids,
        },
        rawMessage,
      };
    }

    // Log unhandled message types for debugging
    if (rawMessage.setupComplete) {
      console.log("✅ [Gemini] Setup complete");
    } else if (!rawMessage.serverContent) {
      console.log("🔍 [Gemini] Unhandled message type:", Object.keys(rawMessage));
    }

    // Return null for unrecognized message types
    return null;
  }
}

