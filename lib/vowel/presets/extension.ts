/**
 * Extension Platform Preset
 * 
 * Preset configuration for the extension platform mode.
 * 
 * @packageDocumentation
 */

import { ExtensionNavigationAdapter } from '../platforms/extension/adapters/ExtensionNavigationAdapter';
import { ExtensionAutomationAdapter } from '../platforms/extension/adapters/ExtensionAutomationAdapter';
import type { ExtensionConfig } from '../platforms/extension/ExtensionConfig';
import { defaultExtensionConfig } from '../platforms/extension/ExtensionConfig';

/**
 * Preset configuration for extension platform
 * 
 * This preset configures Vowel to run in an extension background script,
 * with lightweight proxy UI injected into content scripts.
 * 
 * Features:
 * - Bypasses CSP restrictions
 * - Persists across page navigations
 * - Lightweight proxy UI on pages
 * - Background script handles all voice processing
 * 
 * @example
 * ```typescript
 * import { extensionPreset } from '@vowel.to/client/presets/extension';
 * 
 * const config = {
 *   ...extensionPreset,
 *   appId: 'your-app-id',
 * };
 * ```
 */
export const extensionPreset: Partial<ExtensionConfig> = {
  ...defaultExtensionConfig,
  
  // Use extension-specific adapters
  navigationAdapter: new ExtensionNavigationAdapter(),
  automationAdapter: new ExtensionAutomationAdapter(),
  
  // Extension-specific settings
  stateSync: {
    broadcastToAllTabs: true,
    persistSession: true,
  },
  
  // Audio configuration optimized for extension
  // @ts-ignore - audio is not defined in the type ExtensionConfig
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  
  // Use ML-based VAD for better quality
  vad: {
    type: 'silero',
    threshold: 0.5,
  },
};

