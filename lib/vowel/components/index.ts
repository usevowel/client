/**
 * @fileoverview Vowel Components - Exports for all UI components
 * 
 * This file exports all reusable UI components used by the Vowel client library.
 * Includes React components, web components, and their types.
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

// React Components
export {
  VowelProvider,
  useVowel,
  type VowelProviderProps,
  type VowelContextType,
} from './VowelProviderSimple';

// Hooks
export { useSyncContext } from '../hooks/useSyncContext';

export {
  VowelMicrophone,
  VowelAgent,
  VowelCaption,
  type VowelMicrophoneProps,
  type VowelCaptionProps,
  type VowelAgentProps,
  type VowelPosition,
  VoiceNagWrapper,
  type VoiceNagWrapperProps,
  TermsPrivacyModal,
  type TermsPrivacyModalProps,
  FloatingCursorComponent,
  type FloatingCursorComponentProps,
  ControlledBanner,
  type ControlledBannerProps,
  ControlledByVowelFrame,
  type ControlledByVowelFrameProps,
  FloatingMicButton,
  type FloatingMicButtonProps,
  type FloatingMicButtonState,
  Modal,
  type ModalProps,
  VowelSettingsModal,
  type VowelSettingsModalProps,
} from './components';

// Floating Cursor (React Native)
export {
  FloatingCursorProvider,
  useFloatingCursor,
  useFloatingCursorOptional,
  type FloatingCursorContextType,
  type FloatingCursorProviderProps,
} from './FloatingCursorProvider';

export {
  FloatingCursorRenderer,
  type FloatingCursorRendererProps,
} from './FloatingCursorRenderer';

// NOTE: Web Components are NOT exported here to prevent auto-registration
// in React builds. Import them explicitly from '@vowel.to/client/web-component' if needed.
