/**
 * @vowel.to/client/standalone-js - Plain JavaScript Standalone Build
 *
 * Framework-agnostic standalone bundle for plain JavaScript integration.
 * This bundle excludes React components and is designed for CDN usage.
 */

// Core client library (framework-agnostic)
export * from './lib/vowel/core';
export * from './lib/vowel/adapters';
export * from './lib/vowel/types';
export * from './lib/vowel/version';

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
} from './lib/vowel/types';

// Re-export version from version module for consistency
export { VOWEL_VERSION as VERSION } from './lib/vowel/version';
