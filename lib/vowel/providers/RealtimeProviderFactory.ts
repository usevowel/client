/**
 * Realtime Provider Factory
 * 
 * Factory for creating realtime provider instances based on provider type
 * Supports Gemini, OpenAI, and Vowel Prime providers
 */

import {
  RealtimeProvider,
  type RealtimeProviderConfig,
  type RealtimeProviderCallbacks,
} from "./RealtimeProvider";
import { GeminiRealtimeProvider } from "./GeminiRealtimeProvider";
import { OpenAIRealtimeProvider } from "./OpenAIRealtimeProvider";
import { GrokRealtimeProvider } from "./GrokRealtimeProvider";
import { VowelCoreRealtimeProvider } from "./VowelCoreRealtimeProvider";
import { VowelPrimeRealtimeProvider } from "./VowelPrimeRealtimeProvider";
import {
  SUPPORTED_REALTIME_PROVIDERS,
  type ProviderType,
} from "../types/providers";

/**
 * Factory for creating realtime providers
 */
export class RealtimeProviderFactory {
  /**
   * Create a realtime provider instance
   * @param provider - Provider type ("gemini" | "openai" | "grok" | "vowel-core" | "vowel-prime")
   * @param config - Provider configuration
   * @param callbacks - Event callbacks
   * @returns Realtime provider instance
   * @throws Error if provider is not supported
   */
  static create(
    provider: ProviderType,
    config: RealtimeProviderConfig,
    callbacks: RealtimeProviderCallbacks
  ): RealtimeProvider {
    console.log(`🏭 [Factory] Creating ${provider} realtime provider`);

    switch (provider) {
      case "gemini":
        return new GeminiRealtimeProvider(config, callbacks);
      case "openai":
        return new OpenAIRealtimeProvider(config, callbacks, "openai");
      case "grok":
        return new GrokRealtimeProvider(config, callbacks);
      case "vowel-core":
        return new VowelCoreRealtimeProvider(config, callbacks);
      case "vowel-prime":
        // Dedicated provider for Vowel Prime (Vowel Engine)
        // Uses WebSocket transport with manual audio streaming
        return new VowelPrimeRealtimeProvider(config, callbacks);
      default:
        throw new Error(
          `Unsupported provider: ${provider}. Supported providers: ${this.getAvailableProviders().join(", ")}`
        );
    }
  }

  /**
   * Get list of available providers
   */
  static getAvailableProviders(): ProviderType[] {
    return [...SUPPORTED_REALTIME_PROVIDERS];
  }

  /**
   * Check if provider is supported
   */
  static isProviderSupported(provider: string): provider is ProviderType {
    return this.getAvailableProviders().includes(provider as ProviderType);
  }
}
