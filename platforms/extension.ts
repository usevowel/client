/**
 * Extension Platform Entry Point
 * 
 * Main entry point for the extension platform mode.
 * Provides initialization functions and exports for both background scripts
 * and content scripts.
 * 
 * @packageDocumentation
 * 
 * @example
 * Background script usage:
 * ```typescript
 * import { initializeExtensionVowel } from '@vowel.to/client/platforms/extension';
 * 
 * const controller = await initializeExtensionVowel({
 *   appId: 'your-app-id',
 *   apiKey: 'your-api-key',
 * });
 * ```
 * 
 * @example
 * Content script usage:
 * ```typescript
 * import { initializeContentScriptUI } from '@vowel.to/client/platforms/extension';
 * 
 * const ui = initializeContentScriptUI({
 *   buttonPosition: { x: 20, y: 20 },
 * });
 * ```
 */

// Export background script components
export { ExtensionVowelController } from '../lib/vowel/platforms/extension/ExtensionVowelController';
export { ExtensionMessageRouter } from '../lib/vowel/platforms/extension/ExtensionMessageRouter';
export { ExtensionStateSync } from '../lib/vowel/platforms/extension/ExtensionStateSync';

// Export content script components
export { ExtensionContentBridge } from '../lib/vowel/platforms/extension/content/ExtensionContentBridge';
export { ContentScriptUI } from '../lib/vowel/platforms/extension/content/ContentScriptUI';
export { ProxyFloatingButton } from '../lib/vowel/platforms/extension/content/components/ProxyFloatingButton';
export { ProxyFloatingCursor } from '../lib/vowel/platforms/extension/content/components/ProxyFloatingCursor';

// Export adapters
export { ExtensionNavigationAdapter } from '../lib/vowel/platforms/extension/adapters/ExtensionNavigationAdapter';
export { ExtensionAutomationAdapter } from '../lib/vowel/platforms/extension/adapters/ExtensionAutomationAdapter';

// Export preset and configuration
export { extensionPreset } from '../lib/vowel/presets/extension';
export { EXTENSION_PRESET } from '../lib/vowel/presets';
export type { ExtensionConfig } from '../lib/vowel/platforms/extension/ExtensionConfig';
export { defaultExtensionConfig } from '../lib/vowel/platforms/extension/ExtensionConfig';

// Export types
export type {
  ExtensionMessage,
  ContentToBackgroundMessage,
  BackgroundToContentMessage,
  StartSessionMessage,
  StopSessionMessage,
  GetStateMessage,
  UpdateConfigMessage,
  StateUpdateMessage,
  TranscriptUpdateMessage,
  ErrorMessage,
  MessageResponse,
} from '../lib/vowel/platforms/extension/messaging/ExtensionMessageTypes';

// Export protocol utilities
export {
  generateMessageId,
  createMessage,
  sendMessageWithResponse,
  sendMessageToTab,
  broadcastMessage,
  createSuccessResponse,
  createErrorResponse,
  isValidMessage,
  isExtensionContext,
  isContentScriptContext,
  isBackgroundScriptContext,
} from '../lib/vowel/platforms/extension/messaging/ExtensionMessageProtocol';

import { ExtensionVowelController } from '../lib/vowel/platforms/extension/ExtensionVowelController';
import { ContentScriptUI } from '../lib/vowel/platforms/extension/content/ContentScriptUI';
import { extensionPreset } from '../lib/vowel/presets/extension';
import type { ExtensionConfig } from '../lib/vowel/platforms/extension/ExtensionConfig';

/**
 * Initialize Vowel controller in extension background script
 * 
 * This function creates and initializes a Vowel controller instance
 * with extension-specific adapters and configuration.
 * 
 * @param config - Extension configuration
 * @returns Initialized Vowel controller
 * 
 * @example
 * ```typescript
 * // In extension background.ts
 * import { initializeExtensionVowel } from '@vowel.to/client/platforms/extension';
 * 
 * const controller = await initializeExtensionVowel({
 *   appId: 'your-app-id',
 *   apiKey: 'your-api-key',
 *   systemInstruction: 'Custom instructions...',
 * });
 * 
 * // Controller is now ready and listening for messages from content scripts
 * console.log('Vowel controller initialized');
 * ```
 */
export async function initializeExtensionVowel(
  config: ExtensionConfig
): Promise<ExtensionVowelController> {
  console.log('🎤 Initializing Vowel in extension background');

  const controller = new ExtensionVowelController({
    ...extensionPreset,
    ...config,
  });

  await controller.initialize();

  console.log('✅ Vowel extension controller ready');

  return controller;
}

/**
 * Initialize content script UI on web page
 * 
 * This function creates and mounts the proxy UI components
 * (floating button and cursor) on the current page.
 * 
 * @param config - Optional configuration for content script UI
 * @returns ContentScriptUI instance
 * 
 * @example
 * ```typescript
 * // In extension content script
 * import { initializeContentScriptUI } from '@vowel.to/client/platforms/extension';
 * 
 * const ui = initializeContentScriptUI({
 *   buttonPosition: { x: 20, y: 20 },
 *   showConnectionStatus: true,
 * });
 * 
 * // UI is now mounted on the page
 * // Users can click the button to start/stop voice sessions
 * ```
 */
export function initializeContentScriptUI(
  config?: Partial<ExtensionConfig['contentScriptUI']>
): ContentScriptUI {
  console.log('🎤 Initializing Vowel content script UI');

  const ui = new ContentScriptUI(config);

  console.log('✅ Vowel content script UI ready');

  return ui;
}

