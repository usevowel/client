/**
 * @vowel.to/client - Multi-platform Voice Agent Library
 *
 * A framework-agnostic library for adding AI voice agents to web applications.
 * Powered by Google Gemini Live API.
 */

// Import styles (will be auto-injected via JavaScript, also available as separate CSS file)
import './lib/vowel/styles/styles.css';

// Core client library (framework-agnostic)
export { Vowel } from './lib/vowel/core/VowelClient.js';
export {
  createDirectAdapters,
  createControlledAdapters,
  createTanStackAdapters,
  createNextJSAdapters,
  createVueRouterAdapters,
  createReactRouterAdapters,
} from './lib/vowel/adapters/helpers.js';
export * from './lib/vowel/core/index.js';
export * from './lib/vowel/adapters/index.js';
export * from './lib/vowel/version.js';

// Re-export types for convenience
export type {
  VowelConfig,
  VowelAction,
  VowelRoute,
  VowelVoiceConfig,
  VowelActionParameter,
  ActionHandler,
  VowelTranscript,
  VowelLiveState,
  VowelEventNotificationOptions,
  VowelEventContext,
  VowelClientConfig,
  NavigationAdapter,
  AutomationAdapter,
  AutomationSearchOptions,
  AutomationSearchResult,
  AutomationSearchResults,
  AutomationActionResult,
  VowelToolResult,
  FloatingCursorAppearance,
  FloatingCursorAnimation,
  FloatingCursorBehavior,
  FloatingCursorConfig,
  FloatingCursorUpdate,
  VADType,
  VowelTurnDetectionPreset,
  TurnDetectionMode,
  TurnDetectionConfig,
  ClientVADConfig,
} from './lib/vowel/types/types.js';

export type {
  ProviderType,
  OpenAICompatibleProviderType,
} from './lib/vowel/types/providers.js';

export {
  SUPPORTED_REALTIME_PROVIDERS,
  OPENAI_COMPATIBLE_PROVIDERS,
} from './lib/vowel/types/providers.js';

export {
  VOWEL_PLATFORM_API_URL,
  VOWEL_TOKEN_ENDPOINT,
  DEFAULT_VOICE_CONFIG,
  AUDIO_CONFIG,
  AUDIO_CAPTURE_CONFIG,
} from './lib/vowel/types/constants.js';

// Re-export VoiceSessionState from managers
export type { VoiceSessionState } from './lib/vowel/managers/index.js';

// Re-export version from version module for consistency
export { VOWEL_VERSION as VERSION } from './lib/vowel/version.js';
