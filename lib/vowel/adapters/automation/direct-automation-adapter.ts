/**
 * @fileoverview Direct Automation Adapter - Same-tab DOM interaction for SPAs
 * 
 * This file contains the `DirectAutomationAdapter` class which enables voice-controlled
 * page automation in Single Page Applications. It provides intelligent DOM element
 * searching and manipulation capabilities, allowing the AI to interact with your page
 * through voice commands.
 * 
 * Use Cases:
 * - Voice-controlled form filling
 * - Voice-activated button clicks
 * - Voice-driven search and filtering
 * - Accessibility enhancements
 * - Hands-free application control
 * 
 * Key Features:
 * - Fuzzy DOM element searching
 * - Intelligent element identification
 * - Click, type, focus, scroll actions
 * - Keyboard event simulation
 * - Page snapshot generation
 * 
 * @module @vowel.to/client/adapters/automation
 * @author vowel.to
 * @license Proprietary
 * 
 * @example
 * ```ts
 * import { DirectAutomationAdapter } from '@vowel.to/client/adapters/automation';
 * 
 * const automationAdapter = new DirectAutomationAdapter();
 * 
 * // Search for elements
 * const results = await automationAdapter.searchElements('add to cart button');
 * 
 * // Click an element
 * await automationAdapter.clickElement(results.elements[0].id);
 * ```
 */

import type {
  AutomationAdapter,
  AutomationSearchOptions,
  AutomationSearchResults,
  AutomationActionResult
} from '../../types';
import { FuzzyDOMSearcher } from '../../platforms/generic/dom-search';
import { DOMManipulator } from '../../platforms/generic/dom-tools';
import type { FloatingCursorManager } from '../../managers/FloatingCursorManager';
import { getActionNotifier } from '../../core/action-notifier';

/**
 * Direct Automation Adapter
 * 
 * Handles same-tab DOM interaction for SPAs.
 * Uses FuzzyDOMSearcher for intelligent element finding and
 * DOMManipulator for reliable interaction.
 */
export class DirectAutomationAdapter implements AutomationAdapter {
  private searcher: FuzzyDOMSearcher;
  private manipulator: DOMManipulator;

  constructor() {
    this.searcher = new FuzzyDOMSearcher();
    this.manipulator = new DOMManipulator({
      getElementById: (id) => this.searcher.getElementById(id)
    });

    console.log('🤖 [DirectAutomationAdapter] Initialized for same-tab DOM interaction');
  }

  /**
   * Set floating cursor manager for visual feedback
   * @deprecated Floating cursor now uses ActionNotifier. This method is kept for backwards compatibility but does nothing.
   */
  public setFloatingCursorManager(_manager: FloatingCursorManager): void {
    // No-op: Floating cursor now receives updates via ActionNotifier
    console.log('🤖 [DirectAutomationAdapter] setFloatingCursorManager called (deprecated - now uses ActionNotifier)');
  }

  /**
   * Search for elements on the page
   */
  async searchElements(
    query: string,
    options?: AutomationSearchOptions
  ): Promise<AutomationSearchResults> {
    console.log(`🤖 [DirectAutomationAdapter] Searching for: "${query}"`);
    
    // Notify about search action
    const notifier = getActionNotifier();
    notifier.notifySearch(query);
    
    try {
      const results = this.searcher.search(query, options);
      
      console.log(`   ✅ Found ${results.elements.length} elements`);
      
      // Notify about first result if available
      if (results.elements.length > 0) {
        const firstElement = results.elements[0];
        notifier.notify({
          type: 'search',
          message: `Found: ${firstElement.text || firstElement.ariaLabel || 'element'}`,
          targetElementId: firstElement.id,
          isIdle: true,
          timestamp: Date.now(),
        });
      }
      
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
    console.log(`🤖 [DirectAutomationAdapter] Generating page snapshot`);
    
    try {
      const snapshot = this.searcher.getCompressedPageSnapshot();
      
      console.log(`   ✅ Snapshot generated`);
      
      return snapshot;
    } catch (error) {
      console.error(`   ❌ Snapshot generation failed:`, error);
      throw error;
    }
  }

  /**
   * Click an element
   */
  async clickElement(id: string, reason?: string): Promise<AutomationActionResult> {
    console.log(`🤖 [DirectAutomationAdapter] Clicking element: ${id}`);
    if (reason) {
      console.log(`   📝 Reason: ${reason}`);
    }
    
    // Notify about click action
    const notifier = getActionNotifier();
    notifier.notifyClick(id, reason);
    
    try {
      const result = await this.manipulator.clickElement({ id });
      
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
    console.log(`🤖 [DirectAutomationAdapter] Typing into element: ${id}`);
    if (reason) {
      console.log(`   📝 Reason: ${reason}`);
    }
    
    // Notify about type action
    const notifier = getActionNotifier();
    notifier.notifyType(id, text, reason);
    
    try {
      const result = await this.manipulator.typeIntoElement({ id, text });
      
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
    console.log(`🤖 [DirectAutomationAdapter] Focusing element: ${id}`);
    if (reason) {
      console.log(`   📝 Reason: ${reason}`);
    }
    
    // Notify about focus action
    const notifier = getActionNotifier();
    notifier.notify({
      type: 'focus',
      message: reason || 'Focused element',
      targetElementId: id,
      isIdle: true,
      timestamp: Date.now(),
    });
    
    try{
      const result = await this.manipulator.focusElement({ id });
      
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
    console.log(`🤖 [DirectAutomationAdapter] Scrolling to element: ${id}`);
    if (reason) {
      console.log(`   📝 Reason: ${reason}`);
    }
    
    // Notify about scroll action
    const notifier = getActionNotifier();
    notifier.notify({
      type: 'scroll',
      message: reason || 'Scrolled to element',
      targetElementId: id,
      isIdle: true,
      timestamp: Date.now(),
    });
    
    try {
      const result = await this.manipulator.scrollToElement({ id });
      
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
    console.log(`🤖 [DirectAutomationAdapter] Pressing key: ${key}`);
    if (reason) {
      console.log(`   📝 Reason: ${reason}`);
    }
    
    try {
      const result = await this.manipulator.pressKey({ key });
      
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
   * Clear element store (call on page navigation)
   */
  clearStore(): void {
    this.searcher.clearStore();
  }
}

