/**
 * Controlled Automation Adapter
 * 
 * For cross-tab DOM interaction in traditional sites (Shopify, WordPress, etc.)
 * Uses BroadcastChannel to communicate automation commands to controlled tabs.
 * 
 * Architecture:
 * - Tab A (Voice Agent): Sends automation commands
 * - Tab B (Controlled): Receives commands and performs DOM actions
 * 
 * @example
 * ```ts
 * // Voice agent tab
 * import { ControlledAutomationAdapter } from '@vowel.to/client/adapters/automation';
 * 
 * const automationAdapter = new ControlledAutomationAdapter('vowel-automation');
 * 
 * // Controlled tab (receives automation commands)
 * import { createControlledAutomationListener } from '@vowel.to/client/adapters/automation';
 * 
 * createControlledAutomationListener('vowel-automation');
 * ```
 */

import type {
  AutomationAdapter,
  AutomationSearchOptions,
  AutomationSearchResults,
  AutomationActionResult
} from '../../types';
import type { FloatingCursorManager } from '../../managers/FloatingCursorManager';

/**
 * Automation command message types
 */
type AutomationMessageType =
  | 'searchElements'
  | 'getPageSnapshot'
  | 'clickElement'
  | 'typeIntoElement'
  | 'focusElement'
  | 'scrollToElement'
  | 'pressKey';

/**
 * Automation command message
 */
interface AutomationMessage {
  type: AutomationMessageType;
  payload: any;
  messageId: string;
  timestamp: number;
}

/**
 * Automation response message
 */
interface AutomationResponse {
  type: string;
  payload: any;
  messageId: string;
  timestamp: number;
}

/**
 * Pending request tracker
 */
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Controlled Automation Adapter
 * 
 * Handles cross-tab DOM interaction for traditional sites with page reloads.
 * Perfect for Shopify, WordPress, and other server-rendered platforms.
 */
export class ControlledAutomationAdapter implements AutomationAdapter {
  private channel: BroadcastChannel;
  private channelName: string;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private readonly REQUEST_TIMEOUT = 5000; // 5 seconds
  // Note: Cursor manager is stored but not used in cross-tab automation
  // It's here for API consistency with DirectAutomationAdapter
  // @ts-ignore - Unused in cross-tab mode but kept for API consistency
  private cursorManager?: FloatingCursorManager;

  constructor(channelName: string = 'vowel-automation') {
    this.channelName = channelName;
    this.channel = new BroadcastChannel(channelName);

    // Listen for responses
    this.channel.onmessage = (event: MessageEvent<AutomationResponse>) => {
      this.handleResponse(event.data);
    };

    console.log(`🤖 [ControlledAutomationAdapter] Initialized on channel: ${channelName}`);
    console.log(`   Mode: Cross-tab automation (controlled tab mode)`);
  }

  /**
   * Set floating cursor manager for visual feedback
   * Note: Cursor feedback works in the same tab, not across tabs
   */
  public setFloatingCursorManager(manager: FloatingCursorManager): void {
    this.cursorManager = manager;
    console.log('🤖 [ControlledAutomationAdapter] Floating cursor manager attached');
    console.log('   ⚠️  Note: Cursor feedback only works in this tab, not in controlled tabs');
  }

  /**
   * Handle response from controlled tab
   */
  private handleResponse(response: AutomationResponse): void {
    const { messageId, type, payload } = response;

    if (!type.endsWith('Response')) {
      return; // Not a response message
    }

    const pending = this.pendingRequests.get(messageId);
    if (pending) {
      clearTimeout(pending.timeout);
      pending.resolve(payload);
      this.pendingRequests.delete(messageId);
    }
  }

  /**
   * Send command to controlled tab and wait for response
   */
  private async sendCommand<T>(type: AutomationMessageType, payload: any): Promise<T> {
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`Command timeout: ${type}`));
      }, this.REQUEST_TIMEOUT);

      // Store pending request
      this.pendingRequests.set(messageId, { resolve, reject, timeout });

      // Send message
      const message: AutomationMessage = {
        type,
        payload,
        messageId,
        timestamp: Date.now()
      };

      this.channel.postMessage(message);

      console.log(`🤖 [ControlledAutomationAdapter] Sent command: ${type} (${messageId})`);
    });
  }

  /**
   * Search for elements on the page
   */
  async searchElements(
    query: string,
    options?: AutomationSearchOptions
  ): Promise<AutomationSearchResults> {
    console.log(`🤖 [ControlledAutomationAdapter] Searching for: "${query}"`);
    
    try {
      const results = await this.sendCommand<AutomationSearchResults>('searchElements', {
        query,
        options
      });
      
      console.log(`   ✅ Found ${results.elements.length} elements`);
      
      return results;
    } catch (error) {
      console.error(`   ❌ Search failed:`, error);
      throw error;
    }
  }

  /**
   * Get page snapshot
   */
  async getPageSnapshot(): Promise<string> {
    console.log(`🤖 [ControlledAutomationAdapter] Getting page snapshot`);
    
    try {
      const response = await this.sendCommand<{ snapshot: string }>('getPageSnapshot', {});
      
      console.log(`   ✅ Snapshot received`);
      
      return response.snapshot;
    } catch (error) {
      console.error(`   ❌ Snapshot failed:`, error);
      throw error;
    }
  }

  /**
   * Click an element
   */
  async clickElement(id: string, reason?: string): Promise<AutomationActionResult> {
    console.log(`🤖 [ControlledAutomationAdapter] Clicking element: ${id}`);
    if (reason) {
      console.log(`   📝 Reason: ${reason}`);
    }
    
    try {
      const result = await this.sendCommand<AutomationActionResult>('clickElement', { id, reason });
      
      if (result.success) {
        console.log(`   ✅ Click successful`);
      } else {
        console.error(`   ❌ Click failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`   ❌ Click error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Type text into an element
   */
  async typeIntoElement(id: string, text: string, reason?: string): Promise<AutomationActionResult> {
    console.log(`🤖 [ControlledAutomationAdapter] Typing into element: ${id}`);
    if (reason) {
      console.log(`   📝 Reason: ${reason}`);
    }
    
    try {
      const result = await this.sendCommand<AutomationActionResult>('typeIntoElement', {
        id,
        text,
        reason
      });
      
      if (result.success) {
        console.log(`   ✅ Type successful`);
      } else {
        console.error(`   ❌ Type failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`   ❌ Type error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Focus an element
   */
  async focusElement(id: string, reason?: string): Promise<AutomationActionResult> {
    console.log(`🤖 [ControlledAutomationAdapter] Focusing element: ${id}`);
    if (reason) {
      console.log(`   📝 Reason: ${reason}`);
    }
    
    try {
      const result = await this.sendCommand<AutomationActionResult>('focusElement', { id, reason });
      
      if (result.success) {
        console.log(`   ✅ Focus successful`);
      } else {
        console.error(`   ❌ Focus failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`   ❌ Focus error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Scroll to an element
   */
  async scrollToElement(id: string, reason?: string): Promise<AutomationActionResult> {
    console.log(`🤖 [ControlledAutomationAdapter] Scrolling to element: ${id}`);
    if (reason) {
      console.log(`   📝 Reason: ${reason}`);
    }
    
    try {
      const result = await this.sendCommand<AutomationActionResult>('scrollToElement', { id, reason });
      
      if (result.success) {
        console.log(`   ✅ Scroll successful`);
      } else {
        console.error(`   ❌ Scroll failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`   ❌ Scroll error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Press a key
   */
  async pressKey(key: string, reason?: string): Promise<AutomationActionResult> {
    console.log(`🤖 [ControlledAutomationAdapter] Pressing key: ${key}`);
    if (reason) {
      console.log(`   📝 Reason: ${reason}`);
    }
    
    try {
      const result = await this.sendCommand<AutomationActionResult>('pressKey', { key, reason });
      
      if (result.success) {
        console.log(`   ✅ Key press successful`);
      } else {
        console.error(`   ❌ Key press failed: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`   ❌ Key press error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    // Clear all pending requests
    for (const [, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Adapter cleanup'));
    }
    this.pendingRequests.clear();

    // Close channel
    this.channel.close();
    
    console.log(`🤖 [ControlledAutomationAdapter] Channel closed: ${this.channelName}`);
  }
}

/**
 * Create listener for controlled tab
 * 
 * Call this in the controlled tab to receive and execute automation commands.
 * 
 * @param channelName - BroadcastChannel name (must match adapter)
 * 
 * @example
 * ```ts
 * // In controlled tab (e.g., Shopify theme)
 * import { createControlledAutomationListener } from '@vowel.to/client/adapters/automation';
 * 
 * createControlledAutomationListener('vowel-automation');
 * ```
 */
export function createControlledAutomationListener(channelName: string = 'vowel-automation'): () => void {
  const channel = new BroadcastChannel(channelName);
  
  // Import automation tools lazily
  let searcher: any;
  let manipulator: any;
  
  const initTools = async () => {
    if (!searcher) {
      const { FuzzyDOMSearcher } = await import('../../platforms/generic/dom-search');
      const { DOMManipulator } = await import('../../platforms/generic/dom-tools');
      
      searcher = new FuzzyDOMSearcher();
      manipulator = new DOMManipulator({
        getElementById: (id: string) => searcher.getElementById(id)
      });
    }
  };

  channel.onmessage = async (event: MessageEvent<AutomationMessage>) => {
    const { type, payload, messageId } = event.data;
    
    console.log(`🤖 [ControlledAutomationListener] Received command: ${type} (${messageId})`);
    
    try {
      await initTools();
      
      let result: any;
      
      // Get global cursor manager (set by controlled tab initialization)
      const cursorManager = (window as any).__vowelFloatingCursorManager;
      console.log(`🎯 [ControlledAutomationListener] Cursor manager available:`, !!cursorManager);
      if (cursorManager) {
        console.log(`🎯 [ControlledAutomationListener] Cursor manager isActive:`, cursorManager.isActive?.());
      }
      
      switch (type) {
        case 'searchElements':
          // Show searching cursor at center
          if (cursorManager?.isActive?.()) {
            console.log(`🎯 [ControlledAutomationListener] Showing searching cursor for: ${payload.query}`);
            cursorManager.showAt({ x: 50, y: 50, text: `Searching: ${payload.query}`, isIdle: false });
          }
          
          result = searcher.search(payload.query, payload.options);
          
          // Show cursor at first result if available
          if (cursorManager?.isActive?.() && result.elements?.length > 0) {
            const firstResult = result.elements[0];
            console.log(`🎯 [ControlledAutomationListener] Showing cursor at first result: ${firstResult.id}`);
            const element = searcher.getElementById(firstResult.id);
            if (element) {
              const rect = element.getBoundingClientRect();
              const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
              const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
              cursorManager.showAt({ 
                x, 
                y, 
                text: `Found: ${firstResult.text || firstResult.ariaLabel || 'element'}`, 
                isIdle: true 
              });
            }
          }
          break;
          
        case 'getPageSnapshot':
          result = { snapshot: searcher.getCompressedPageSnapshot() };
          break;
          
        case 'clickElement':
          // Get element and show cursor at its position with AI's message
          if (cursorManager?.isActive?.()) {
            console.log(`🎯 [ControlledAutomationListener] Showing cursor at element for click: ${payload.id}`);
            const element = searcher.getElementById(payload.id);
            if (element) {
              const rect = element.getBoundingClientRect();
              const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
              const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
              // Use AI's reason if provided, otherwise default message
              const text = payload.reason || 'Clicked element';
              console.log(`🎯 [ControlledAutomationListener] Cursor text: "${text}"`);
              // Show with isIdle=true so it stays at element with bounce animation
              cursorManager.showAt({ x, y, text, isIdle: true });
            }
          }
          
          result = await manipulator.clickElement(payload);
          break;
          
        case 'typeIntoElement':
          // Show cursor at element with AI's message
          if (cursorManager?.isActive?.()) {
            const element = searcher.getElementById(payload.id);
            if (element) {
              const rect = element.getBoundingClientRect();
              const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
              const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
              // Use AI's reason if provided, otherwise show truncated text
              const text = payload.reason || `Typed: "${payload.text.substring(0, 20)}${payload.text.length > 20 ? '...' : ''}"`;
              console.log(`🎯 [ControlledAutomationListener] Cursor text: "${text}"`);
              // Show with isIdle=true so it stays at element with bounce animation
              cursorManager.showAt({ x, y, text, isIdle: true });
            }
          }
          
          result = await manipulator.typeIntoElement(payload);
          break;
          
        case 'focusElement':
          // Show cursor at element with AI's message
          if (cursorManager?.isActive?.()) {
            const element = searcher.getElementById(payload.id);
            if (element) {
              const rect = element.getBoundingClientRect();
              const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
              const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
              // Use AI's reason if provided, otherwise default message
              const text = payload.reason || 'Focused element';
              console.log(`🎯 [ControlledAutomationListener] Cursor text: "${text}"`);
              // Show with isIdle=true so it stays at element with bounce animation
              cursorManager.showAt({ x, y, text, isIdle: true });
            }
          }
          
          result = await manipulator.focusElement(payload);
          break;
          
        case 'scrollToElement':
          // Show cursor at element with AI's message
          if (cursorManager?.isActive?.()) {
            const element = searcher.getElementById(payload.id);
            if (element) {
              const rect = element.getBoundingClientRect();
              const x = ((rect.left + rect.width / 2) / window.innerWidth) * 100;
              const y = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
              // Use AI's reason if provided, otherwise default message
              const text = payload.reason || 'Scrolled to element';
              console.log(`🎯 [ControlledAutomationListener] Cursor text: "${text}"`);
              // Show with isIdle=true so it stays at element with bounce animation
              cursorManager.showAt({ x, y, text, isIdle: true });
            }
          }
          
          result = await manipulator.scrollToElement(payload);
          break;
          
        case 'pressKey':
          result = await manipulator.pressKey(payload);
          break;
          
        default:
          throw new Error(`Unknown command type: ${type}`);
      }
      
      // Send response
      const response: AutomationResponse = {
        type: `${type}Response`,
        payload: result,
        messageId,
        timestamp: Date.now()
      };
      
      channel.postMessage(response);
      
      console.log(`   ✅ Command executed: ${type}`);
    } catch (error) {
      console.error(`   ❌ Command failed: ${type}`, error);
      
      // Send error response
      const response: AutomationResponse = {
        type: `${type}Response`,
        payload: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        },
        messageId,
        timestamp: Date.now()
      };
      
      channel.postMessage(response);
    }
  };
  
  console.log(`🤖 [ControlledAutomationListener] Listening on channel: ${channelName}`);
  
  // Return cleanup function
  return () => {
    channel.close();
    console.log(`🤖 [ControlledAutomationListener] Channel closed: ${channelName}`);
  };
}

