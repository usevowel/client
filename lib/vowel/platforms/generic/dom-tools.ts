/**
 * DOM Manipulation Tools
 * 
 * Simple interaction tools that use spoken-word IDs (e.g., "apple_banana")
 * to identify and interact with elements found via search
 */

/**
 * DOM Manipulator - Provides interaction methods for elements
 * Uses spoken IDs to identify elements from the FuzzyDOMSearcher
 */
export class DOMManipulator {
  private getElementById: (id: string) => Element | null;
  
  constructor(options: { getElementById: (id: string) => Element | null }) {
    this.getElementById = options.getElementById;
  }
  
  /**
   * Click an element
   * @param params.id - Spoken ID (e.g., "apple_banana")
   * 
   * Smart clicking: If target isn't directly clickable (e.g., hidden radio input),
   * automatically finds and clicks the nearest interactive parent (e.g., label)
   */
  async clickElement(params: { id: string }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🖱️ [DOMManipulator] Clicking element: ${params.id}`);
      
      let element = this.getElementById(params.id);
      if (!element) {
        throw new Error(`Element ${params.id} not found`);
      }
      
      // Find the best element to click (might be a parent)
      const clickTarget = this.findClickableElement(element);
      
      // Scroll into view
      clickTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Click element
      (clickTarget as HTMLElement).click();
      
      if (clickTarget !== element) {
        console.log(`   ℹ️  Clicked parent <${clickTarget.tagName.toLowerCase()}> (target was hidden/non-interactive)`);
      }
      console.log('   ✅ Element clicked');
      return { success: true };
    } catch (error) {
      console.error('   ❌ Click failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Find the best clickable element (may traverse up to find interactive parent)
   * Handles cases like hidden radio inputs inside labels, custom form controls, etc.
   * 
   * @param element - Starting element
   * @returns The element to actually click
   */
  private findClickableElement(element: Element): Element {
    const isVisible = (el: Element): boolean => {
      const htmlEl = el as HTMLElement;
      const style = window.getComputedStyle(htmlEl);
      return !!(
        htmlEl.offsetWidth ||
        htmlEl.offsetHeight ||
        htmlEl.getClientRects().length
      ) && style.visibility !== 'hidden' && style.display !== 'none';
    };
    
    const isClickable = (el: Element): boolean => {
      const tag = el.tagName.toLowerCase();
      
      // Direct interactive elements
      if (['a', 'button', 'label', 'summary'].includes(tag)) {
        return true;
      }
      
      // Check for click indicators
      const hasClickHandler = el.hasAttribute('onclick') || el.hasAttribute('on:click');
      const hasTabIndex = el.hasAttribute('tabindex') && el.getAttribute('tabindex') !== '-1';
      const hasClickRole = el.getAttribute('role') === 'button' || el.getAttribute('role') === 'link';
      const hasCursor = window.getComputedStyle(el as HTMLElement).cursor === 'pointer';
      
      return hasClickHandler || hasTabIndex || hasClickRole || hasCursor;
    };
    
    // If element is visible and clickable, use it
    if (isVisible(element) && isClickable(element)) {
      return element;
    }
    
    // Otherwise, traverse up to find the nearest clickable parent
    let current: Element | null = element;
    let maxDepth = 10; // Prevent infinite loops
    
    while (current && maxDepth > 0) {
      current = current.parentElement;
      maxDepth--;
      
      if (current && isVisible(current) && isClickable(current)) {
        console.log(`   🔍 Found clickable parent: <${current.tagName.toLowerCase()}>`);
        return current;
      }
    }
    
    // Fallback: return original element (click will still work in most cases)
    console.log('   ⚠️  No clickable parent found, using original element');
    return element;
  }
  
  /**
   * Type text into an input element
   * @param params.id - Spoken ID
   * @param params.text - Text to type
   */
  async typeIntoElement(params: { id: string; text: string }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`⌨️ [DOMManipulator] Typing into element: ${params.id}`);
      console.log(`   Text: "${params.text}"`);
      
      const element = this.getElementById(params.id);
      if (!element) {
        throw new Error(`Element ${params.id} not found`);
      }
      
      const inputElement = element as HTMLInputElement | HTMLTextAreaElement;
      
      // Focus first
      inputElement.focus();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set value
      inputElement.value = params.text;
      
      // Dispatch input event to trigger any listeners
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      console.log('   ✅ Text entered');
      return { success: true };
    } catch (error) {
      console.error('   ❌ Type failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Press a key (e.g., Enter, Escape)
   * @param params.key - Key name (e.g., 'Enter', 'Escape', 'Tab')
   */
  async pressKey(params: { key: string }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`⌨️ [DOMManipulator] Pressing key: ${params.key}`);
      
      const event = new KeyboardEvent('keydown', {
        key: params.key,
        bubbles: true,
        cancelable: true
      });
      
      document.activeElement?.dispatchEvent(event);
      
      // Also dispatch keyup
      const upEvent = new KeyboardEvent('keyup', {
        key: params.key,
        bubbles: true,
        cancelable: true
      });
      
      document.activeElement?.dispatchEvent(upEvent);
      
      console.log('   ✅ Key pressed');
      return { success: true };
    } catch (error) {
      console.error('   ❌ Press key failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Focus an element
   * @param params.id - Spoken ID
   */
  async focusElement(params: { id: string }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🎯 [DOMManipulator] Focusing element: ${params.id}`);
      
      const element = this.getElementById(params.id);
      if (!element) {
        throw new Error(`Element ${params.id} not found`);
      }
      
      (element as HTMLElement).focus();
      
      console.log('   ✅ Element focused');
      return { success: true };
    } catch (error) {
      console.error('   ❌ Focus failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Scroll to an element
   * @param params.id - Spoken ID
   */
  async scrollToElement(params: { id: string }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📜 [DOMManipulator] Scrolling to element: ${params.id}`);
      
      const element = this.getElementById(params.id);
      if (!element) {
        throw new Error(`Element ${params.id} not found`);
      }
      
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      console.log('   ✅ Scrolled to element');
      return { success: true };
    } catch (error) {
      console.error('   ❌ Scroll failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
