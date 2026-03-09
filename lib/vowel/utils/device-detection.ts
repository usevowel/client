/**
 * @fileoverview Device Detection - Utilities for detecting device capabilities
 * 
 * Provides utilities for detecting device type, screen size, touch support,
 * and other device-specific features to enable adaptive UI.
 * 
 * @module @vowel.to/client/utils
 * @author vowel.to
 * @license Proprietary
 */

/**
 * Device type classification
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/**
 * Device capabilities
 */
export interface DeviceCapabilities {
  /** Device type (mobile, tablet, desktop) */
  type: DeviceType;
  
  /** Whether the device has touch support */
  hasTouch: boolean;
  
  /** Screen width in pixels */
  screenWidth: number;
  
  /** Screen height in pixels */
  screenHeight: number;
  
  /** Device pixel ratio */
  pixelRatio: number;
  
  /** Whether the device is in portrait orientation */
  isPortrait: boolean;
  
  /** Whether the device is in landscape orientation */
  isLandscape: boolean;
  
  /** Whether the browser is in standalone/PWA mode */
  isStandalone: boolean;
  
  /** User agent string */
  userAgent: string;
  
  /** Whether running on iOS */
  isIOS: boolean;
  
  /** Whether running on Android */
  isAndroid: boolean;
  
  /** Whether running on macOS */
  isMacOS: boolean;
  
  /** Whether running on Windows */
  isWindows: boolean;
}

/**
 * Detect device type based on screen width and user agent
 */
export function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const width = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();

  // Check user agent for explicit mobile/tablet indicators
  const isMobileUA = /mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  const isTabletUA = /tablet|ipad|playbook|silk|kindle/i.test(userAgent);

  // Use breakpoints (following common standards)
  if (width < 768) {
    return 'mobile';
  } else if (width >= 768 && width < 1024) {
    return isTabletUA || isMobileUA ? 'tablet' : 'desktop';
  } else {
    return isTabletUA ? 'tablet' : 'desktop';
  }
}

/**
 * Detect if device has touch support
 */
export function hasTouchSupport(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Detect device orientation
 */
export function getOrientation(): 'portrait' | 'landscape' {
  if (typeof window === 'undefined') {
    return 'landscape';
  }

  return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
}

/**
 * Detect if running in standalone/PWA mode
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    ('standalone' in window.navigator && (window.navigator as any).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/**
 * Detect operating system
 */
export function getOperatingSystem(): string {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  } else if (/android/.test(userAgent)) {
    return 'android';
  } else if (/mac os x/.test(userAgent)) {
    return 'macos';
  } else if (/windows/.test(userAgent)) {
    return 'windows';
  } else if (/linux/.test(userAgent)) {
    return 'linux';
  }

  return 'unknown';
}

/**
 * Get comprehensive device capabilities
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  if (typeof window === 'undefined') {
    return {
      type: 'desktop',
      hasTouch: false,
      screenWidth: 1920,
      screenHeight: 1080,
      pixelRatio: 1,
      isPortrait: false,
      isLandscape: true,
      isStandalone: false,
      userAgent: '',
      isIOS: false,
      isAndroid: false,
      isMacOS: false,
      isWindows: false,
    };
  }

  const orientation = getOrientation();
  const os = getOperatingSystem();

  return {
    type: getDeviceType(),
    hasTouch: hasTouchSupport(),
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio || 1,
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    isStandalone: isStandalone(),
    userAgent: navigator.userAgent,
    isIOS: os === 'ios',
    isAndroid: os === 'android',
    isMacOS: os === 'macos',
    isWindows: os === 'windows',
  };
}

/**
 * Check if device is mobile (phone)
 */
export function isMobile(): boolean {
  return getDeviceType() === 'mobile';
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
  return getDeviceType() === 'tablet';
}

/**
 * Check if device is desktop
 */
export function isDesktop(): boolean {
  return getDeviceType() === 'desktop';
}

/**
 * Check if device is mobile or tablet (any touch device)
 */
export function isMobileOrTablet(): boolean {
  const type = getDeviceType();
  return type === 'mobile' || type === 'tablet';
}

/**
 * Listen for device capability changes (orientation, resize)
 */
export function onDeviceChange(callback: (capabilities: DeviceCapabilities) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = () => {
    callback(getDeviceCapabilities());
  };

  window.addEventListener('resize', handler);
  window.addEventListener('orientationchange', handler);

  // Call immediately
  handler();

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handler);
    window.removeEventListener('orientationchange', handler);
  };
}

/**
 * Get safe area insets (for devices with notches, etc.)
 */
export function getSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  if (typeof window === 'undefined' || typeof getComputedStyle === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);

  return {
    top: parseInt(style.getPropertyValue('--sat') || style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || style.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || style.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
  };
}

/**
 * Check if device prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if device prefers dark mode
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}




