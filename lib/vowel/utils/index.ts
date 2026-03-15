/**
 * Utils - Utility functions
 */

// Audio utilities
export {
  encode,
  decode,
  createBlob,
  decodeAudioData,
  checkAudioSupport,
  getAudioConstraints,
} from "./audioUtils";

// CSS utility
export { cn, VOWEL_UI_SCOPE_CLASS } from "./utils";

// Device detection utilities
export {
  getDeviceType,
  hasTouchSupport,
  getOrientation,
  isStandalone,
  getOperatingSystem,
  getDeviceCapabilities,
  isMobile,
  isTablet,
  isDesktop,
  isMobileOrTablet,
  onDeviceChange,
  getSafeAreaInsets,
  prefersReducedMotion,
  prefersDarkMode,
} from "./device-detection";

// CDN loader utilities
export { loadVADWebFromCDN } from "./cdnLoader";

// Deprecation warning utilities
export { warnDeprecated, _resetDeprecationWarningsForTesting } from "./deprecation";
