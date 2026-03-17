/**
 * Vowel - Multi-tenant voice agent library
 * 
 * @packageDocumentation
 */

// Styles (import this in your main CSS file)
// import '@vowel/styles.css';

// Core Client
export { Vowel } from "./core";

// React Components & Hooks
export {
  VowelProvider,
  useVowel,
  useSyncContext,
  VowelMicrophone,
  VowelAgent,
} from "./components";
export type {
  VowelProviderProps,
  VowelContextType,
  VowelMicrophoneProps,
  VowelAgentProps,
  VowelPosition,
} from "./components";

// Adapters (Navigation & Automation)
export * from "./adapters";

// Types & Constants
export type {
  VowelRoute,
  VowelAction,
  VowelActionParameter,
  VowelVoiceConfig,
  VowelTurnDetectionPreset,
  VowelToolResult,
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
} from "./types";

export {
  DEFAULT_VOICE_CONFIG,
  AUDIO_CONFIG,
  AUDIO_CAPTURE_CONFIG,
} from "./types";

// VAD Module (for custom VAD implementations)
export * from "./vad";

// Utilities (optional exports for advanced usage)
export {
  encode,
  decode,
  createBlob,
  decodeAudioData,
  checkAudioSupport,
  getAudioConstraints,
  cn,
} from "./utils";
