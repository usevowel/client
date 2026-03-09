/**
 * Extension Automation Adapter
 * 
 * Implements AutomationAdapter for extension platform.
 * Handles DOM automation by communicating with content scripts.
 * 
 * @packageDocumentation
 */

import type {
  AutomationAdapter,
  AutomationSearchOptions,
  AutomationSearchResults,
  AutomationActionResult,
} from '../../../types';

/**
 * Automation adapter for extension platform
 * 
 * Handles DOM automation in extension context by:
 * - Sending automation commands to content script
 * - Querying page structure via content script
 * - Coordinating element interactions
 * 
 * @example
 * ```typescript
 * const adapter = new ExtensionAutomationAdapter();
 * const results = await adapter.searchElements('search input');
 * await adapter.clickElement('element-123');
 * ```
 */
export class ExtensionAutomationAdapter implements AutomationAdapter {
  /**
   * Search for elements in active tab
   * 
   * @param query - Search query (natural language)
   * @param options - Search options
   * @returns Search results with matching elements
   */
  async searchElements(query: string, options?: AutomationSearchOptions): Promise<AutomationSearchResults> {
    const tab = await this.getActiveTab();
    
    if (!tab.id) {
      throw new Error('No active tab found');
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'SEARCH_ELEMENTS',
        payload: { query, options },
      });

      // Content script returns { success: true, result: {...} } for search
      return response.result || response || { elements: [], error: 'No results found' };
    } catch (error) {
      console.error('Failed to search elements:', error);
      //@ts-ignore - error is not defined in the type AutomationSearchResults
      return { elements: [], error: `Error: ${String(error)}` };
    }
  }

  /**
   * Get page snapshot from active tab
   * 
   * @returns Page snapshot as ARIA tree text
   */
  async getPageSnapshot(): Promise<string> {
    const tab = await this.getActiveTab();
    
    if (!tab.id) {
      throw new Error('No active tab found');
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_PAGE_SNAPSHOT',
      });

      console.log('📨 [ExtensionAutomationAdapter] Received snapshot response:', {
        hasResponse: !!response,
        hasSnapshot: !!response?.snapshot,
        snapshotLength: response?.snapshot?.length || 0,
        responseKeys: response ? Object.keys(response) : []
      });

      return response.snapshot || '';
    } catch (error) {
      console.error('Failed to get page snapshot:', error);
      return '';
    }
  }

  /**
   * Click an element in active tab
   * 
   * @param id - Element identifier from search results
   * @param reason - Optional reason for clicking
   * @returns Action result with success status
   */
  async clickElement(id: string, reason?: string): Promise<AutomationActionResult> {
    const tab = await this.getActiveTab();
    
    if (!tab.id) {
      throw new Error('No active tab found');
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'CLICK_ELEMENT',
        payload: { id, reason },
      });

      return response || { success: false, error: 'No response from content script' };
    } catch (error) {
      console.error('Failed to click element:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Type into an element in active tab
   * 
   * @param id - Element identifier from search results
   * @param text - Text to type
   * @param reason - Optional reason for typing
   * @returns Action result with success status
   */
  async typeIntoElement(id: string, text: string, reason?: string): Promise<AutomationActionResult> {
    const tab = await this.getActiveTab();
    
    if (!tab.id) {
      throw new Error('No active tab found');
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'TYPE_INTO_ELEMENT',
        payload: { id, text, reason },
      });

      return response || { success: false, error: 'No response from content script' };
    } catch (error) {
      console.error('Failed to type into element:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Focus an element in active tab
   * 
   * @param id - Element identifier from search results
   * @param reason - Optional reason for focusing
   * @returns Action result with success status
   */
  async focusElement(id: string, reason?: string): Promise<AutomationActionResult> {
    const tab = await this.getActiveTab();
    
    if (!tab.id) {
      throw new Error('No active tab found');
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'FOCUS_ELEMENT',
        payload: { id, reason },
      });

      return response || { success: false, error: 'No response from content script' };
    } catch (error) {
      console.error('Failed to focus element:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Scroll to an element in active tab
   * 
   * @param id - Element identifier from search results
   * @param reason - Optional reason for scrolling
   * @returns Action result with success status
   */
  async scrollToElement(id: string, reason?: string): Promise<AutomationActionResult> {
    const tab = await this.getActiveTab();
    
    if (!tab.id) {
      throw new Error('No active tab found');
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'SCROLL_TO_ELEMENT',
        payload: { id, reason },
      });

      return response || { success: false, error: 'No response from content script' };
    } catch (error) {
      console.error('Failed to scroll to element:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Press a key in active tab
   * 
   * @param key - Key name (e.g., 'Enter', 'Escape')
   * @param reason - Optional reason for pressing the key
   * @returns Action result with success status
   */
  async pressKey(key: string, reason?: string): Promise<AutomationActionResult> {
    const tab = await this.getActiveTab();
    
    if (!tab.id) {
      throw new Error('No active tab found');
    }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'PRESS_KEY',
        payload: { key, reason },
      });

      return response || { success: false, error: 'No response from content script' };
    } catch (error) {
      console.error('Failed to press key:', error);
      return { success: false, error: String(error) };
    }
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

