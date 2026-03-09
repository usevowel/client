/**
 * Extension Navigation Adapter
 * 
 * Implements NavigationAdapter for extension platform.
 * Handles navigation in extension context by querying and controlling browser tabs.
 * 
 * @packageDocumentation
 */

import type { NavigationAdapter, VowelRoute } from '../../../types';

/**
 * Navigation adapter for extension platform
 * 
 * Handles navigation in extension context by:
 * - Querying active tab information
 * - Sending navigation commands to active tab
 * - Extracting routes from page context
 * 
 * Note: This adapter maintains cached state since some methods must be synchronous
 * while Chrome APIs are async.
 * 
 * @example
 * ```typescript
 * const adapter = new ExtensionNavigationAdapter();
 * await adapter.navigate('/products');
 * const currentPath = adapter.getCurrentPath();
 * ```
 */
export class ExtensionNavigationAdapter implements NavigationAdapter {
  private cachedPath: string = '/';

  constructor() {
    // Update cached path periodically
    this.updateCachedPath();
    setInterval(() => this.updateCachedPath(), 1000);
  }

  /**
   * Update cached path from active tab
   */
  private async updateCachedPath(): Promise<void> {
    try {
      const tab = await this.getActiveTab();
      if (tab.url) {
        const url = new URL(tab.url);
        this.cachedPath = url.pathname + url.search + url.hash;
      }
    } catch {
      // Ignore errors
    }
  }
  /**
   * Navigate to a path in the active tab
   * 
   * @param path - Target path or URL
   * @param context - Optional navigation context
   */
  async navigate(path: string, context?: any): Promise<void> {
    console.log(`🧭 [ExtensionNavigationAdapter] navigate() called with path: ${path}`);
    
    const tab = await this.getActiveTab();
    
    if (!tab.id) {
      throw new Error('No active tab found');
    }

    console.log(`📍 [ExtensionNavigationAdapter] Active tab ID: ${tab.id}, URL: ${tab.url}`);

    // Send navigation command to content script
    try {
      console.log(`📤 [ExtensionNavigationAdapter] Sending NAVIGATE message to content script`);
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'NAVIGATE',
        payload: { path, context },
      });
      console.log(`✅ [ExtensionNavigationAdapter] Navigation message sent successfully, response:`, response);
    } catch (error) {
      console.warn('⚠️ [ExtensionNavigationAdapter] Failed to send navigation message to content script:', error);
      console.log('🔄 [ExtensionNavigationAdapter] Falling back to chrome.tabs.update');
      
      // Fallback: Try to navigate the tab directly using chrome.tabs.update
      try {
        if (path.startsWith('http://') || path.startsWith('https://')) {
          console.log(`🔗 [ExtensionNavigationAdapter] Navigating to absolute URL: ${path}`);
          await chrome.tabs.update(tab.id, { url: path });
          console.log(`✅ [ExtensionNavigationAdapter] Tab updated successfully`);
        } else {
          // Relative path - need current URL
          const currentUrl = new URL(tab.url || 'http://localhost');
          currentUrl.pathname = path;
          const newUrl = currentUrl.toString();
          console.log(`🔗 [ExtensionNavigationAdapter] Navigating to relative path, full URL: ${newUrl}`);
          await chrome.tabs.update(tab.id, { url: newUrl });
          console.log(`✅ [ExtensionNavigationAdapter] Tab updated successfully`);
        }
      } catch (updateError) {
        console.error('❌ [ExtensionNavigationAdapter] Failed to update tab:', updateError);
        throw updateError;
      }
    }
    
    // Update cached path
    await this.updateCachedPath();
  }

  /**
   * Get current path (synchronous, returns cached value)
   * 
   * @returns Current URL path
   */
  getCurrentPath(): string {
    return this.cachedPath;
  }

  /**
   * Get available routes from active tab
   * 
   * @returns Array of available routes
   */
  async getRoutes(): Promise<VowelRoute[]> {
    const tab = await this.getActiveTab();
    
    if (!tab.id) {
      return [];
    }

    try {
      // Query content script for routes
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_ROUTES',
      });
      return response.routes || [];
    } catch (error) {
      console.warn('Failed to get routes from content script:', error);
      return [];
    }
  }

  /**
   * Get navigation context from active tab
   * 
   * @returns Navigation context object
   */
  async getContext(): Promise<any> {
    const tab = await this.getActiveTab();
    
    return {
      url: tab.url,
      title: tab.title,
      tabId: tab.id,
      favIconUrl: tab.favIconUrl,
    };
  }

  /**
   * Get the active browser tab
   */
  private async getActiveTab(): Promise<chrome.tabs.Tab> {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      throw new Error('Chrome tabs API not available');
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }

    return tabs[0];
  }
}

