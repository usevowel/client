/**
 * Types - Type definitions and constants
 */

export type {
  VowelRoute,
  VowelAction,
  VowelActionParameter,
  VowelVoiceConfig,
  VowelPrimeConfig,
  VowelPrimeEnvironment,
  VowelConfig,
  VowelClientConfig,
  NavigationAdapter,
  AutomationAdapter,
  AutomationSearchOptions,
  AutomationSearchResult,
  AutomationSearchResults,
  AutomationActionResult,
  ActionHandler,
  VowelTranscript,
  VowelLiveState,
  VowelToolResult,
  VowelEventNotificationOptions,
  VowelEventContext,
  FloatingCursorAppearance,
  FloatingCursorAnimation,
  FloatingCursorBehavior,
  FloatingCursorConfig,
  FloatingCursorUpdate,
  VADType,
  TurnDetectionMode,
  TurnDetectionConfig,
  ClientVADConfig,
} from "./types";

export type {
  ProviderType,
  OpenAICompatibleProviderType,
} from "./providers";

export {
  SUPPORTED_REALTIME_PROVIDERS,
  OPENAI_COMPATIBLE_PROVIDERS,
} from "./providers";

export {
  VOWEL_PLATFORM_API_URL,
  VOWEL_TOKEN_ENDPOINT,
  DEFAULT_VOICE_CONFIG,
  AUDIO_CONFIG,
  AUDIO_CAPTURE_CONFIG,
} from "./constants";

// Re-export ToolResult from managers for convenience
export type { ToolResult } from "../managers";

// Export action notifier types
export type {
  ActionType,
  ActionNotification,
  ActionNotificationListener,
} from '../core/action-notifier';

// Export device detection types
export type {
  DeviceType,
  DeviceCapabilities,
} from '../utils/device-detection';

// Export border glow types
export type {
  BorderGlowConfig,
} from '../ui/border-glow';

// Export floating action pill types
export type {
  FloatingActionPillConfig,
  FloatingActionPillProps,
} from '../ui/FloatingActionPill';
