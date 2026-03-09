/**
 * Vowel UI Components
 * Pre-built components for voice interaction
 */

// Re-export all components and types from their separate files
export { VowelMicrophone, type VowelMicrophoneProps } from "./VowelMicrophone";
export { VowelAgent, type VowelAgentProps } from "./VowelAgent";
export { VowelCaption, type VowelCaptionProps } from "./VowelCaption";
export { type VowelPosition, positionClasses } from "./types";

// Voice Nag and Terms/Privacy components
export { VoiceNagWrapper, type VoiceNagWrapperProps } from "./VoiceNagWrapper";
export { TermsPrivacyModal, type TermsPrivacyModalProps } from "./TermsPrivacyModal";

// React components for controlled tab UI
export { FloatingCursorComponent, type FloatingCursorComponentProps } from "./FloatingCursorComponent";
export { ControlledBanner, type ControlledBannerProps, type VoiceSessionState } from "./ControlledBanner"; // Top banner with mesh gradient
export { ControlledBannerLegacy, type ControlledBannerLegacyProps } from "./ControlledBannerLegacy"; // Original top banner with CSS gradient
export { ControlledByVowelFrame, type ControlledByVowelFrameProps } from "./ControlledByVowelFrame"; // Full page border frame
export { FloatingMicButton, type FloatingMicButtonProps, type FloatingMicButtonState } from "./FloatingMicButton";
export { Modal, type ModalProps } from "./Modal";
export { VowelSettingsModal, type VowelSettingsModalProps } from "./VowelSettingsModal";
