/**
 * @fileoverview Floating Cursor Manager - Lifecycle and state management
 * 
 * This file contains the `FloatingCursorManager` class which manages the lifecycle
 * and state of the floating cursor feature. It handles initialization, updates,
 * element tracking, and coordinate calculations.
 * 
 * The manager acts as a bridge between automation adapters and the FloatingCursor
 * web component, providing a clean API for showing/hiding the cursor based on
 * automation actions.
 * 
 * Implementation Note:
 * All documentation for this feature is maintained under `.ai/plans/floating-cursor/`
 * as specified in the implementation plan. This preference should be preserved
 * throughout the development lifecycle.
 * 
 * @module @vowel.to/client/managers
 * @author vowel.to
 * @license Proprietary
 * 
 * @example
 * ```ts
 * const manager = new FloatingCursorManager({
 *   enabled: true,
 *   appearance: { cursorColor: '#2563eb' }
 * });
 * 
 * // Track element interaction
 * manager.trackElement(elementId, 'Clicking button');
 * 
 * // Show cursor at specific position
 * manager.showAt({ x: 50, y: 50, text: 'Searching...', isIdle: false });
 * ```
 */

import { registerFloatingCursorWebComponent } from '../components/web-components/FloatingCursorWebComponent';
import type { FloatingCursorConfig, FloatingCursorUpdate } from '../types';
import type { FloatingCursorContextType } from '../components/FloatingCursorProvider';

/**
 * Floating Cursor Manager Mode
 */
export type FloatingCursorMode = 'web-component' | 'react-context';

/**
 * Floating Cursor Manager
 * 
 * Manages the lifecycle and state of the floating cursor.
 * Supports two modes:
 * - 'web-component': Creates DOM element (for non-React environments)
 * - 'react-context': Updates React context (for React environments)
 * 
 * Mode is automatically detected based on whether React context is provided.
 */
export class FloatingCursorManager {
  private cursorElement: HTMLElement | null = null;
  private reactContext: FloatingCursorContextType | null = null;
  private config: FloatingCursorConfig;
  private isEnabled: boolean;
  private mode: FloatingCursorMode;
  private lastTrackedElementId: string | null = null;

  /**
   * Create a new FloatingCursorManager
   * 
   * Mode is automatically detected:
   * - If reactContext is provided: use 'react-context' mode
   * - Otherwise: use 'web-component' mode
   * 
   * @param config - Floating cursor configuration
   * @param reactContext - Optional React context (for React mode)
   */
  constructor(
    config: FloatingCursorConfig,
    reactContext?: FloatingCursorContextType
  ) {
    this.config = config;
    this.isEnabled = config.enabled;
    
    // Auto-detect mode based on context presence
    if (reactContext) {
      this.mode = 'react-context';
      this.reactContext = reactContext;
      console.log('🎯 [FloatingCursorManager] Initialized in react-context mode');
      
      if (this.isEnabled) {
        this.reactContext.enable();
        this.reactContext.showResting();
      }
    } else {
      this.mode = 'web-component';
      console.log('🎯 [FloatingCursorManager] Initialized in web-component mode');
      
      if (this.isEnabled) {
        this.initializeCursor();
      }
    }

    console.log('🎯 [FloatingCursorManager] Config:', {
      mode: this.mode,
      enabled: this.isEnabled,
      appearance: config.appearance,
      animation: config.animation,
      behavior: config.behavior
    });
  }

  /**
   * Initialize the floating cursor web component (web-component mode only)
   */
  private initializeCursor(): void {
    if (this.mode !== 'web-component') {
      console.warn('🎯 [FloatingCursorManager] initializeCursor called in react-context mode');
      return;
    }

    if (typeof window === 'undefined') {
      console.warn('🎯 [FloatingCursorManager] Cannot initialize - window not available (SSR)');
      return;
    }

    // Ensure web component is registered
    registerFloatingCursorWebComponent();

    // Create the web component element
    console.log('🎯 [FloatingCursorManager] Creating cursor web component with config:', this.config);
    this.cursorElement = document.createElement('vowel-floating-cursor');
    
    // Set initial attributes from config
    const appearance = this.config.appearance || {};
    const animation = this.config.animation || {};
    const behavior = this.config.behavior || {};
    
    if (appearance.cursorColor) {
      this.cursorElement.setAttribute('cursorColor', appearance.cursorColor);
    }
    if (appearance.cursorSize) {
      this.cursorElement.setAttribute('cursorSize', String(appearance.cursorSize));
    }
    if (appearance.badgeBackground) {
      this.cursorElement.setAttribute('badgeBackground', appearance.badgeBackground);
    }
    if (appearance.badgeTextColor) {
      this.cursorElement.setAttribute('badgeTextColor', appearance.badgeTextColor);
    }
    if (animation.enableTyping !== undefined) {
      this.cursorElement.setAttribute('enableTyping', String(animation.enableTyping));
    }
    if (animation.typingSpeed) {
      this.cursorElement.setAttribute('typingSpeed', String(animation.typingSpeed));
    }
    if (animation.enableBounce !== undefined) {
      this.cursorElement.setAttribute('enableBounce', String(animation.enableBounce));
    }
    if (animation.transitionDuration) {
      this.cursorElement.setAttribute('transitionDuration', String(animation.transitionDuration));
    }
    if (behavior.zIndex) {
      this.cursorElement.setAttribute('zIndex', String(behavior.zIndex));
    }
    
    // Initially hidden
    this.cursorElement.setAttribute('visible', 'false');
    
    // Append to body
    document.body.appendChild(this.cursorElement);
    console.log('🎯 [FloatingCursorManager] ✅ Cursor web component created and attached to DOM');
    
    // Show cursor in resting position to indicate it's ready
    console.log('🎯 [FloatingCursorManager] Showing cursor in resting position');
    this.showResting();
  }

  /**
   * Show cursor in resting position (bottom center)
   */
  public showResting(text: string = 'Ready'): void {
    if (!this.isEnabled) {
      return;
    }

    console.log('🎯 [FloatingCursorManager] showResting():', { mode: this.mode, text });

    if (this.mode === 'react-context' && this.reactContext) {
      // React mode: update context
      this.reactContext.showResting(text);
    } else if (this.mode === 'web-component' && this.cursorElement) {
      // Web component mode: update attributes
      this.cursorElement.setAttribute('x', '50');
      this.cursorElement.setAttribute('y', '91');
      this.cursorElement.setAttribute('text', text);
      this.cursorElement.setAttribute('isIdle', 'true');
      this.cursorElement.setAttribute('visible', 'true');
    }
  }

  /**
   * Enable the floating cursor
   */
  public enable(): void {
    if (this.isEnabled) {
      return;
    }

    this.isEnabled = true;
    this.config.enabled = true;

    if (this.mode === 'react-context' && this.reactContext) {
      this.reactContext.enable();
    } else if (this.mode === 'web-component' && !this.cursorElement) {
      this.initializeCursor();
    }

    console.log('🎯 [FloatingCursorManager] Enabled');
  }

  /**
   * Disable the floating cursor
   */
  public disable(): void {
    if (!this.isEnabled) {
      return;
    }

    this.isEnabled = false;
    this.config.enabled = false;

    if (this.mode === 'react-context' && this.reactContext) {
      this.reactContext.disable();
    } else if (this.mode === 'web-component' && this.cursorElement) {
      this.cursorElement.setAttribute('visible', 'false');
    }

    console.log('🎯 [FloatingCursorManager] Disabled');
  }

  /**
   * Check if the cursor is active
   */
  public isActive(): boolean {
    return this.isEnabled && (
      (this.mode === 'react-context' && this.reactContext !== null) ||
      (this.mode === 'web-component' && this.cursorElement !== null)
    );
  }

  /**
   * Track an element and show cursor at its position
   * 
   * @param elementId - Element ID to track
   * @param actionText - Text to display (e.g., "Clicking button")
   * @param isIdle - Whether the cursor should appear idle
   */
  public trackElement(elementId: string, actionText: string, isIdle: boolean = false): void {
    console.log(`🎯 [FloatingCursorManager] trackElement() called`, {
      elementId,
      actionText,
      isIdle,
      isActive: this.isActive()
    });

    if (!this.isActive()) {
      console.warn(`🎯 [FloatingCursorManager] Cannot track element - manager not active`, {
        isEnabled: this.isEnabled,
        hasCursorElement: !!this.cursorElement
      });
      return;
    }

    this.lastTrackedElementId = elementId;
    console.log(`🎯 [FloatingCursorManager] Calculating position for element: ${elementId}`);

    const position = this.calculateElementPosition(elementId);
    if (position) {
      console.log(`🎯 [FloatingCursorManager] ✅ Element found at position:`, position);
      this.showAt({
        x: position.x,
        y: position.y,
        text: actionText,
        isIdle
      });
    } else {
      console.error(`🎯 [FloatingCursorManager] ❌ Element not found: ${elementId}`);
      // Show at resting position instead
      console.log(`🎯 [FloatingCursorManager] Showing at resting position with error message`);
      this.showAt({
        x: 50,
        y: 96.5,
        text: `Element not found: ${elementId.substring(0, 20)}...`,
        isIdle: true
      });
    }
  }

  /**
   * Show cursor at specific position
   * 
   * @param update - Cursor position and display data
   */
  public showAt(update: FloatingCursorUpdate): void {
    if (!this.isActive()) {
      return;
    }

    console.log('🎯 [FloatingCursorManager] showAt():', { mode: this.mode, update });

    if (this.mode === 'react-context' && this.reactContext) {
      // React mode: update context
      this.reactContext.updateCursor(update);
    } else if (this.mode === 'web-component' && this.cursorElement) {
      // Web component mode: update attributes
      this.cursorElement.setAttribute('x', String(update.x));
      this.cursorElement.setAttribute('y', String(update.y));
      this.cursorElement.setAttribute('text', update.text);
      this.cursorElement.setAttribute('isIdle', String(update.isIdle));
      this.cursorElement.setAttribute('visible', 'true');
    }
  }

  /**
   * Hide the cursor
   */
  public hide(): void {
    console.log('🎯 [FloatingCursorManager] hide():', { mode: this.mode });

    if (this.mode === 'react-context' && this.reactContext) {
      this.reactContext.hide();
    } else if (this.mode === 'web-component' && this.cursorElement) {
      this.cursorElement.setAttribute('visible', 'false');
    }

    this.lastTrackedElementId = null;
  }

  /**
   * Show cursor during search operation
   * 
   * @param query - Search query text
   */
  public showSearching(query: string): void {
    if (!this.isActive()) {
      return;
    }

    const behavior = this.config.behavior;
    if (behavior && behavior.showDuringSearch === false) {
      return;
    }

    // Show at center of viewport
    this.showAt({
      x: 50,
      y: 50,
      text: `Searching: ${query}`,
      isIdle: false
    });

    console.log(`🎯 [FloatingCursorManager] Showing search: ${query}`);
  }

  /**
   * Calculate position of an element as viewport percentage
   * 
   * @param elementId - Element ID (format: "word1_word2_word3")
   * @returns Position as percentage or null if element not found
   */
  private calculateElementPosition(elementId: string): { x: number; y: number } | null {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return null;
    }

    // Try to get element by data-vowel-id
    let element = document.querySelector(`[data-vowel-id="${elementId}"]`) as HTMLElement | null;

    // If not found, try parsing the ID
    if (!element) {
      element = this.findElementByVowelId(elementId);
    }

    if (!element) {
      return null;
    }

    // Get element bounding rect
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    console.log(`  📐 [FloatingCursorManager] Position calculation:`);
    console.log(`     Element rect:`, {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    });
    console.log(`     Viewport size:`, { width: viewportWidth, height: viewportHeight });

    // Calculate center point of element
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    console.log(`     Center point (px):`, { centerX, centerY });

    // Convert to percentage
    const x = (centerX / viewportWidth) * 100;
    const y = (centerY / viewportHeight) * 100;

    console.log(`     Center point (%):`, { x, y });

    // Clamp to viewport bounds
    const clamped = {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };

    console.log(`     Final position (%):`, clamped);
    console.log(`     Note: Cursor will be centered on this point via CSS transform`);

    return clamped;
  }

  /**
   * Find element by Vowel ID
   * 
   * Vowel IDs are in format: "word1_word2_word3" where each word is from
   * the element's accessible text. We need to search for elements with
   * matching text patterns.
   * 
   * @param vowelId - Vowel element ID
   * @returns Element or null
   */
  private findElementByVowelId(vowelId: string): HTMLElement | null {
    console.log(`🔍 [FloatingCursorManager] Finding element by vowelId: "${vowelId}"`);
    
    // First check if element has data-vowel-id attribute
    const byAttribute = document.querySelector(`[data-vowel-id="${vowelId}"]`);
    if (byAttribute) {
      console.log(`  ✅ Found by data-vowel-id attribute`);
      const rect = byAttribute.getBoundingClientRect();
      console.log(`  📍 Position:`, { 
        left: rect.left, 
        top: rect.top, 
        width: rect.width, 
        height: rect.height 
      });
      return byAttribute as HTMLElement;
    }

    console.log(`  ⚠️  No data-vowel-id found, using fuzzy text search...`);

    // Parse vowel ID into search terms
    const searchTerms = vowelId.split('_').map(term => term.toLowerCase());
    console.log(`  🔎 Search terms:`, searchTerms);

    // Search all interactive elements
    const interactiveSelectors = [
      'button',
      'a',
      'input',
      'textarea',
      'select',
      '[role="button"]',
      '[role="link"]',
      '[onclick]',
      '[tabindex]'
    ].join(',');

    const elements = Array.from(document.querySelectorAll(interactiveSelectors)) as HTMLElement[];
    console.log(`  🔎 Searching ${elements.length} interactive elements`);

    // Score each element by how well it matches
    let bestMatch: { element: HTMLElement; score: number; text: string; selector: string } | null = null;
    const matches: Array<{ element: HTMLElement; score: number; text: string; selector: string }> = [];

    for (const element of elements) {
      const text = this.getElementText(element).toLowerCase();
      const trimmedText = text.trim();
      let matchCount = 0;
      let exactMatch = false;

      // Check for exact text match first
      const joinedTerms = searchTerms.join(' ');
      if (trimmedText === joinedTerms || trimmedText === searchTerms.join('_')) {
        exactMatch = true;
        matchCount = searchTerms.length;
      } else {
        // Count term matches
        for (const term of searchTerms) {
          if (text.includes(term)) {
            matchCount++;
          }
        }
      }

      let score = matchCount / searchTerms.length;

      // Boost score for exact matches
      if (exactMatch) {
        score += 0.5;
      }

      // Boost score for elements that are visible in viewport
      const rect = element.getBoundingClientRect();
      const isVisible = this.isElementVisible(element, rect);
      if (isVisible) {
        score += 0.3;
      }

      // Boost score for elements in top portion of page (likely navigation)
      const viewportHeight = window.innerHeight;
      if (rect.top < viewportHeight * 0.2) {  // Top 20% of viewport
        score += 0.2;
      }

      if (score > 0) {
        const selector = this.getElementSelector(element);
        const matchInfo = { element, score, text: trimmedText.substring(0, 50), selector };
        matches.push(matchInfo);
        
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = matchInfo;
        }
      }
    }

    // Sort matches by score for better logging
    matches.sort((a, b) => b.score - a.score);

    // Log all matches for debugging
    if (matches.length > 0) {
      console.log(`  📊 Found ${matches.length} potential matches:`);
      matches.slice(0, 5).forEach((match, index) => {
        const rect = match.element.getBoundingClientRect();
        const isVisible = this.isElementVisible(match.element, rect);
        const isInTopArea = rect.top < window.innerHeight * 0.2;
        console.log(`    ${index + 1}. Score: ${match.score.toFixed(2)} | ${match.selector} | "${match.text}" | visible:${isVisible} topArea:${isInTopArea}`);
      });
      if (matches.length > 5) {
        console.log(`    ... and ${matches.length - 5} more matches`);
      }
    }

    if (bestMatch) {
      console.log(`  ✅ Best match: Score ${(bestMatch.score * 100).toFixed(0)}% | ${bestMatch.selector}`);
      const rect = bestMatch.element.getBoundingClientRect();
      console.log(`  📍 Position:`, { 
        left: rect.left, 
        top: rect.top, 
        width: rect.width, 
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
      });
      return bestMatch.element;
    }

    console.log(`  ❌ No matching element found`);
    return null;
  }

  /**
   * Check if an element is visible in the viewport
   */
  private isElementVisible(element: HTMLElement, rect: DOMRect): boolean {
    // Check if element is in viewport
    const inViewport = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
    
    // Check if element is actually visible (not hidden)
    const styles = window.getComputedStyle(element);
    const isDisplayed = (
      styles.display !== 'none' &&
      styles.visibility !== 'hidden' &&
      styles.opacity !== '0'
    );
    
    return inViewport && isDisplayed;
  }

  /**
   * Get a simple selector for an element (for debugging)
   */
  private getElementSelector(element: HTMLElement): string {
    const parts: string[] = [];
    
    // Tag name
    parts.push(element.tagName.toLowerCase());
    
    // ID
    if (element.id) {
      parts.push(`#${element.id}`);
    }
    
    // Classes (first 2)
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c).slice(0, 2);
      if (classes.length > 0) {
        parts.push(`.${classes.join('.')}`);
      }
    }
    
    return parts.join('');
  }

  /**
   * Get text content from element including ARIA labels
   */
  private getElementText(element: HTMLElement): string {
    const parts: string[] = [];

    // Aria label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      parts.push(ariaLabel);
    }

    // Aria labelledby
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) {
        parts.push(labelElement.textContent || '');
      }
    }

    // Text content
    const textContent = element.textContent || '';
    if (textContent) {
      parts.push(textContent);
    }

    // Placeholder for inputs
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const placeholder = element.placeholder;
      if (placeholder) {
        parts.push(placeholder);
      }
    }

    // Value for inputs
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const value = element.value;
      if (value) {
        parts.push(value);
      }
    }

    // Alt text for images
    if (element instanceof HTMLImageElement) {
      const alt = element.alt;
      if (alt) {
        parts.push(alt);
      }
    }

    return parts.join(' ').trim();
  }

  /**
   * Update configuration
   * 
   * @param config - New configuration (partial)
   */
  public updateConfig(config: Partial<FloatingCursorConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.enabled !== undefined) {
      if (config.enabled) {
        this.enable();
      } else {
        this.disable();
      }
    }

    if (this.cursorElement && this.isEnabled) {
      // Update appearance attributes
      if (config.appearance) {
        const appearance = config.appearance;
        if (appearance.cursorColor) {
          this.cursorElement.setAttribute('cursorColor', appearance.cursorColor);
        }
        if (appearance.cursorSize) {
          this.cursorElement.setAttribute('cursorSize', String(appearance.cursorSize));
        }
        if (appearance.badgeBackground) {
          this.cursorElement.setAttribute('badgeBackground', appearance.badgeBackground);
        }
        if (appearance.badgeTextColor) {
          this.cursorElement.setAttribute('badgeTextColor', appearance.badgeTextColor);
      }
      }
      
      // Update animation attributes
      if (config.animation) {
        const animation = config.animation;
        if (animation.enableTyping !== undefined) {
          this.cursorElement.setAttribute('enableTyping', String(animation.enableTyping));
        }
        if (animation.typingSpeed) {
          this.cursorElement.setAttribute('typingSpeed', String(animation.typingSpeed));
        }
        if (animation.enableBounce !== undefined) {
          this.cursorElement.setAttribute('enableBounce', String(animation.enableBounce));
        }
        if (animation.transitionDuration) {
          this.cursorElement.setAttribute('transitionDuration', String(animation.transitionDuration));
      }
      }
      
      // Update behavior attributes
      if (config.behavior) {
        const behavior = config.behavior;
        if (behavior.zIndex) {
          this.cursorElement.setAttribute('zIndex', String(behavior.zIndex));
        }
      }
    }

    console.log('🎯 [FloatingCursorManager] Configuration updated', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): FloatingCursorConfig {
    return { ...this.config };
  }

  /**
   * Get last tracked element ID
   */
  public getLastTrackedElementId(): string | null {
    return this.lastTrackedElementId;
  }

  /**
   * Cleanup and destroy cursor
   */
  public destroy(): void {
    console.log('🎯 [FloatingCursorManager] Destroying:', { mode: this.mode });

    if (this.mode === 'react-context' && this.reactContext) {
      // React mode: disable via context
      this.reactContext.disable();
      this.reactContext = null;
    } else if (this.mode === 'web-component' && this.cursorElement) {
      // Web component mode: remove from DOM
      if (this.cursorElement.parentElement) {
        this.cursorElement.parentElement.removeChild(this.cursorElement);
      }
      this.cursorElement = null;
    }

    this.lastTrackedElementId = null;
    console.log('🎯 [FloatingCursorManager] Destroyed');
  }
}

