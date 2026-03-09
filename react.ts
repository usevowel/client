/**
 * @vowel.to/client/react - React-specific exports for Vowel voice agent
 *
 * React components and hooks for the Vowel voice agent library.
 * This module provides React-specific functionality when React is available.
 */

// Import styles (will be auto-injected via JavaScript)
import './lib/vowel/styles/styles.css';

// React Components & Hooks
export {
  VowelProvider,
  useVowel,
  useSyncContext,
  VowelMicrophone,
  VowelAgent,
  FloatingMicButton,
  Modal,
  VowelSettingsModal,
} from "./lib/vowel/components";

export type {
  VowelProviderProps,
  VowelContextType,
  VowelMicrophoneProps,
  VowelAgentProps,
  VowelPosition,
  FloatingMicButtonProps,
  FloatingMicButtonState,
  ModalProps,
  VowelSettingsModalProps,
} from "./lib/vowel/components";

// Floating Cursor (React Native Components)
export {
  FloatingCursorProvider,
  FloatingCursorRenderer,
  useFloatingCursor,
  useFloatingCursorOptional,
} from "./lib/vowel/components";

export type {
  FloatingCursorContextType,
  FloatingCursorProviderProps,
  FloatingCursorRendererProps,
} from "./lib/vowel/components";

// Re-export core types that React components might need
export type {
  VowelRoute,
  VowelAction,
  VowelVoiceConfig,
  VowelActionParameter,
  RouterAdapter,
  ActionHandler,
} from "./lib/vowel/types";

// Re-export version from version module for consistency
export { VOWEL_VERSION as VERSION } from "./lib/vowel/version";