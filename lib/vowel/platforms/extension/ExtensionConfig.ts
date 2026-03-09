/**
 * Extension Platform Configuration
 * 
 * Configuration types specific to the extension platform mode.
 * 
 * @packageDocumentation
 */

import type { VowelClientConfig } from '../../types';

/**
 * Configuration specific to extension platform
 */
export interface ExtensionConfig extends VowelClientConfig {
  /**
   * State synchronization options
   */
  stateSync?: {
    /**
     * Whether to broadcast state updates to all tabs
     * @default true
     */
    broadcastToAllTabs?: boolean;

    /**
     * Whether to persist session across page navigations
     * @default true
     */
    persistSession?: boolean;

    /**
     * Tab IDs to exclude from broadcasts
     */
    excludeTabs?: number[];
  };

  /**
   * Content script UI options
   */
  contentScriptUI?: {
    /**
     * Whether to automatically mount UI on page load
     * @default true
     */
    autoMount?: boolean;

    /**
     * Button position on page
     */
    buttonPosition?: { x: number; y: number };

    /**
     * Whether to show connection status
     * @default true
     */
    showConnectionStatus?: boolean;

    /**
     * Whether to show floating cursor with transcripts
     * @default true
     */
    showFloatingCursor?: boolean;
  };

  /**
   * Extension-specific permissions required
   */
  permissions?: {
    /**
     * Required for microphone access
     * @default true
     */
    microphone?: boolean;

    /**
     * Required for active tab automation
     * @default true
     */
    activeTab?: boolean;

    /**
     * Required for all tabs automation
     * @default false
     */
    allTabs?: boolean;
  };
}

/**
 * Default extension configuration
 */
export const defaultExtensionConfig: Partial<ExtensionConfig> = {
  stateSync: {
    broadcastToAllTabs: true,
    persistSession: true,
    excludeTabs: [],
  },
  contentScriptUI: {
    autoMount: true,
    buttonPosition: { x: 20, y: 20 },
    showConnectionStatus: true,
    showFloatingCursor: true,
  },
  permissions: {
    microphone: true,
    activeTab: true,
    allTabs: false,
  },
};

