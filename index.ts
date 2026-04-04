/**
 * @vowel.to/client - Multi-platform Voice Agent Library
 *
 * A framework-agnostic library for adding AI voice agents to web applications.
 * Powered by Google Gemini Live API.
 */

// Import styles (will be auto-injected via JavaScript, also available as separate CSS file)
import './lib/vowel/styles/styles.css';

// Core client library (framework-agnostic)
export * from './lib/vowel/core';
export * from './lib/vowel/adapters';
export * from './lib/vowel/types';
export * from './lib/vowel/version';

// React components and hooks (available when React is present)
export * from './lib/vowel/components';
export * from './lib/vowel/hooks';

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
} from './lib/vowel/types';

// Re-export VoiceSessionState from managers
export type { VoiceSessionState } from './lib/vowel/managers';

// Re-export version from version module for consistency
export { VOWEL_VERSION as VERSION } from './lib/vowel/version';
