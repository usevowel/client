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
  VowelCaption,
  FloatingMicButton,
  Modal,
  VowelSettingsModal,
} from "./lib/vowel/components/index.js";

export type {
  VowelProviderProps,
  VowelContextType,
  VowelMicrophoneProps,
  VowelAgentProps,
  VowelCaptionProps,
  VowelPosition,
  FloatingMicButtonProps,
  FloatingMicButtonState,
  ModalProps,
  VowelSettingsModalProps,
} from "./lib/vowel/components/index.js";

// Floating Cursor (React Native Components)
export {
  FloatingCursorProvider,
  FloatingCursorRenderer,
  useFloatingCursor,
  useFloatingCursorOptional,
} from "./lib/vowel/components/index.js";

export type {
  FloatingCursorContextType,
  FloatingCursorProviderProps,
  FloatingCursorRendererProps,
} from "./lib/vowel/components/index.js";

// Re-export core types that React components might need
export type {
  VowelRoute,
  VowelAction,
  VowelVoiceConfig,
  VowelActionParameter,
  ActionHandler,
} from "./lib/vowel/types/index.js";

// Re-export version from version module for consistency
export { VOWEL_VERSION as VERSION } from "./lib/vowel/version.js";
