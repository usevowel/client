/**
 * @fileoverview Vowel Presets - Pre-configured setups for different platforms
 * 
 * Presets provide quick configuration for common platforms like Shopify, WordPress, etc.
 * Each preset includes navigation adapter, automation adapter, floating cursor config,
 * and platform-specific settings.
 * 
 * @module @vowel.to/client/presets
 * @author vowel.to
 * @license Proprietary
 */

import type { NavigationAdapter, AutomationAdapter, FloatingCursorConfig } from '../types';

/**
 * Preset configuration for a platform
 */
export interface VowelPresetConfig {
  /** Preset name */
  name: string;
  /** Preset description */
  description: string;
  /** Navigation adapter factory */
  createNavigationAdapter: (options?: any) => NavigationAdapter | Promise<NavigationAdapter>;
  /** Automation adapter factory */
  createAutomationAdapter: (options?: any) => AutomationAdapter | Promise<AutomationAdapter>;
  /** Floating cursor configuration */
  floatingCursor?: FloatingCursorConfig;
  /** Additional configuration */
  additionalConfig?: Record<string, any>;
}

/**
 * Available preset names for public use
 */
export type PresetName = 'vanilla' | 'controlled' | 'extension';

/**
 * Internal preset names (including platform-specific presets)
 * ⚠️ INTERNAL USE ONLY
 */
export type InternalPresetName = PresetName | 'shopify';

/**
 * Shopify preset configuration
 *
 * ⚠️ INTERNAL USE ONLY - This preset is exclusively for the Vowel platform's
 * Shopify app extension and should never be exposed to or used by end users.
 * Regular users should use the "controlled" preset for Shopify stores.
 */
export const SHOPIFY_PRESET: VowelPresetConfig = {
  name: 'shopify',
  description: 'Optimized for Shopify storefronts with cross-tab navigation and automation',
  
  createNavigationAdapter: async (options?: { storeUrl?: string; channelName?: string }) => {
    const { ShopifyNavigationAdapter } = await import('../platforms/shopify/adapters');
    return new ShopifyNavigationAdapter(options || {});
  },
  
  createAutomationAdapter: async (options?: { channelName?: string }) => {
    const { ShopifyAutomationAdapter } = await import('../platforms/shopify/adapters');
    return new ShopifyAutomationAdapter(options || {});
  },
  
  floatingCursor: {
    enabled: true,
    appearance: {
      cursorColor: '#000000',        // Black cursor
      cursorSize: 24,                // Slightly smaller
      badgeBackground: '#000000',    // Black pill background
      badgeTextColor: '#ffffff',     // White text
      badgeFontSize: 13,             // Smaller text
      badgePadding: '6px 12px',      // Pill padding
      badgeBorderRadius: '12px',     // Fully rounded pill
      cursorShadow: '0 2px 8px rgba(0,0,0,0.15)',
      badgeShadow: '0 2px 8px rgba(0,0,0,0.2)',
    },
    animation: {
      enableTyping: true,
      typingSpeed: 50,
      enableBounce: true,
    },
    behavior: {
      autoHideDelay: 0,          // NEVER auto-hide (always visible)
      showDuringSearch: true,
      hideOnNavigation: false,   // Stay visible during navigation
    },
  },
  
  additionalConfig: {
    features: ['navigation', 'automation', 'addToCart', 'search'],
  },
};

/**
 * Vanilla preset configuration (SPA navigation)
 */
export const VANILLA_PRESET: VowelPresetConfig = {
  name: 'vanilla',
  description: 'Basic setup for any website with SPA-style navigation using history.push',

  createNavigationAdapter: async () => {
    const { DirectNavigationAdapter } = await import('../adapters/navigation/direct-navigation-adapter');
    return new DirectNavigationAdapter({
      navigate: (path: string) => {
        // Use history.push for SPA navigation
        if (typeof window !== 'undefined' && window.history && window.history.pushState) {
          window.history.pushState(null, '', path);
          // Dispatch a popstate event to notify listeners (like routers)
          window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
        } else {
          // Fallback to location.href if history API not available
          window.location.href = path;
        }
      },
      getCurrentPath: () => window.location.pathname,
    });
  },
  
  createAutomationAdapter: async () => {
    const { DirectAutomationAdapter } = await import('../adapters/automation/direct-automation-adapter');
    return new DirectAutomationAdapter();
  },
  
  floatingCursor: {
    enabled: false, // Disabled by default for vanilla
  },
  
  additionalConfig: {},
};

/**
 * Extension preset configuration
 */
export const EXTENSION_PRESET: VowelPresetConfig = {
  name: 'extension',
  description: 'Optimized for browser extensions with background script and proxy UI',
  
  createNavigationAdapter: async () => {
    const { ExtensionNavigationAdapter } = await import('../platforms/extension/adapters/ExtensionNavigationAdapter');
    return new ExtensionNavigationAdapter();
  },
  
  createAutomationAdapter: async () => {
    const { ExtensionAutomationAdapter } = await import('../platforms/extension/adapters/ExtensionAutomationAdapter');
    return new ExtensionAutomationAdapter();
  },
  
  floatingCursor: {
    enabled: false, // Handled by proxy UI in content script
  },
  
  additionalConfig: {
    stateSync: {
      broadcastToAllTabs: true,
      persistSession: true,
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  },
};

/**
 * Controlled preset configuration (cross-tab navigation)
 */
export const CONTROLLED_PRESET: VowelPresetConfig = {
  name: 'controlled',
  description: 'Cross-tab navigation for any website that refreshes on navigate',

  createNavigationAdapter: async (options?: { storeUrl?: string; channelName?: string }) => {
    const { ControlledNavigationRouter } = await import('../platforms/generic/router');
    const router = new ControlledNavigationRouter({
      channelName: options?.channelName || 'vowel-controlled-navigation',
      config: {
        features: ['navigation', 'search'],
        version: '1.0.0'
      }
    });

    // Wrap RouterAdapter to NavigationAdapter interface
    return {
      navigate: (path: string) => router.navigate(path),
      getCurrentPath: () => router.getCurrentPath(),
      getRoutes: async () => router.getRoutes(),
      getContext: () => router.getContext()
    };
  },

  createAutomationAdapter: async (options?: { channelName?: string }) => {
    const { ControlledAutomationAdapter } = await import('../adapters/automation/controlled-automation-adapter');
    return new ControlledAutomationAdapter(options?.channelName || 'vowel-controlled-navigation');
  },

  floatingCursor: {
    enabled: true,
    appearance: {
      cursorColor: '#007acc',        // Blue cursor for controlled tab
      cursorSize: 24,
      badgeBackground: '#007acc',    // Blue pill background
      badgeTextColor: '#ffffff',     // White text
      badgeFontSize: 13,
      badgePadding: '6px 12px',
      badgeBorderRadius: '12px',
      cursorShadow: '0 2px 8px rgba(0,122,204,0.15)',
      badgeShadow: '0 2px 8px rgba(0,122,204,0.2)',
    },
    animation: {
      enableTyping: true,
      typingSpeed: 50,
      enableBounce: true,
    },
    behavior: {
      autoHideDelay: 0,          // NEVER auto-hide (always visible)
      showDuringSearch: true,
      hideOnNavigation: false,   // Stay visible during navigation
    },
  },

  additionalConfig: {
    features: ['navigation', 'search', 'dom-interaction'],
    requiresControlledTab: true,
    channelName: 'vowel-controlled-navigation'
  },
};

/**
 * Preset registry - includes both public and internal presets
 * ⚠️ The 'shopify' preset is INTERNAL USE ONLY and should never be exposed to end users
 */
export const PRESETS: Record<InternalPresetName, VowelPresetConfig> = {
  shopify: SHOPIFY_PRESET, // ⚠️ INTERNAL USE ONLY - Vowel platform Shopify app extension
  vanilla: VANILLA_PRESET,
  extension: EXTENSION_PRESET,
  controlled: CONTROLLED_PRESET,
};

/**
 * Get a preset by name
 *
 * @param name - Preset name (use InternalPresetName for platform-specific presets)
 * @returns Preset configuration
 * @throws Error if preset not found
 */
export function getPreset(name: InternalPresetName): VowelPresetConfig {
  const preset = PRESETS[name];
  
  if (!preset) {
    throw new Error(`Unknown preset: ${name}. Available presets: ${Object.keys(PRESETS).join(', ')}`);
  }
  
  return preset;
}

/**
 * Initialize adapters from a preset
 * 
 * @param presetName - Name of the preset to use
 * @param options - Platform-specific options
 * @returns Initialized navigation and automation adapters
 * 
 * @example
 * ```ts
 * import { initializeFromPreset } from '@vowel.to/client/presets';
 *
 * const { navigationAdapter, automationAdapter, floatingCursor } =
 *   await initializeFromPreset('controlled', {
 *     storeUrl: 'https://mystore.com'
 *   });
 * ```
 */
export async function initializeFromPreset(
  presetName: InternalPresetName,
  options?: any
): Promise<{
  navigationAdapter: NavigationAdapter;
  automationAdapter: AutomationAdapter;
  floatingCursor?: FloatingCursorConfig;
  additionalConfig: Record<string, any>;
}> {
  const preset = getPreset(presetName);
  
  console.log(`🎯 [Presets] Initializing from preset: ${preset.name}`);
  console.log(`   📝 ${preset.description}`);
  
  const navigationAdapter = await preset.createNavigationAdapter(options);
  const automationAdapter = await preset.createAutomationAdapter(options);
  
  console.log(`✅ [Presets] Initialized ${preset.name} preset`);
  
  return {
    navigationAdapter,
    automationAdapter,
    floatingCursor: preset.floatingCursor,
    additionalConfig: preset.additionalConfig || {},
  };
}

