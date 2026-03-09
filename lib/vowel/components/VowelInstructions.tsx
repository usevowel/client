/**
 * @fileoverview Vowel Instructions Component - Web component for long-form system instructions
 * 
 * This component provides a clean way to define system instructions (system prompts)
 * for the AI without having to use awkward HTML attributes or JavaScript strings.
 * 
 * The component registers itself globally and can be discovered by vowel-voice-widget
 * components on the same page.
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { useEffect, useRef } from "react";

/**
 * Props for VowelInstructions component
 */
export interface VowelInstructionsProps {
  /** Optional ID for targeting specific widgets */
  id?: string;
  /** The instructions content (can also come from children) */
  content?: string;
  /** React children (text content) */
  children?: React.ReactNode;
}

/**
 * Global registry for vowel-instructions components
 */
class VowelInstructionsRegistry {
  private instances: Map<string, string> = new Map();

  /**
   * Register an instructions component
   * 
   * @param id - Unique ID for this instructions component
   * @param content - The instructions text
   */
  register(id: string, content: string): void {
    console.log(
      `📝 [VowelInstructions] Registered instructions (${id}): ${content.length} characters`
    );
    this.instances.set(id, content);
  }

  /**
   * Unregister an instructions component
   * 
   * @param id - ID of the component to unregister
   */
  unregister(id: string): void {
    console.log(`🧹 [VowelInstructions] Unregistered instructions (${id})`);
    this.instances.delete(id);
  }

  /**
   * Get instructions by ID
   * 
   * @param id - ID of the instructions to retrieve
   * @returns The instructions text, or null if not found
   */
  get(id: string): string | null {
    return this.instances.get(id) || null;
  }

  /**
   * Get the first registered instructions
   * Useful when there's only one instructions component on the page
   * 
   * @returns The first instructions text, or null if none registered
   */
  getFirst(): string | null {
    const first = this.instances.values().next();
    return first.done ? null : first.value;
  }

  /**
   * Check if any instructions are registered
   * 
   * @returns true if at least one instructions component is registered
   */
  hasInstructions(): boolean {
    return this.instances.size > 0;
  }

  /**
   * Get all registered instructions
   * 
   * @returns Map of ID to instructions text
   */
  getAll(): Map<string, string> {
    return new Map(this.instances);
  }
}

/**
 * Global singleton instance
 */
export const vowelInstructionsRegistry = new VowelInstructionsRegistry();

/**
 * Expose registry globally for web components to discover
 */
declare global {
  interface Window {
    __VOWEL_INSTRUCTIONS__?: VowelInstructionsRegistry;
  }
}

if (typeof window !== "undefined") {
  window.__VOWEL_INSTRUCTIONS__ = vowelInstructionsRegistry;
}

/**
 * VowelInstructions Component
 * 
 * A component that holds long-form system instructions for the AI.
 * Automatically registers itself when mounted and unregisters when unmounted.
 * 
 * @example
 * ```html
 * <vowel-instructions>
 *   You are an AI assistant for an e-commerce site.
 *   
 *   Your role is to help users find products and complete purchases.
 *   
 *   Guidelines:
 *   - Be friendly and helpful
 *   - Ask clarifying questions when needed
 *   - Provide product recommendations
 * </vowel-instructions>
 * 
 * <vowel-voice-widget 
 *   app-id="your-app-id"
 *   init-mode="auto">
 * </vowel-voice-widget>
 * ```
 */
export function VowelInstructions({
  id,
  content,
  children,
}: VowelInstructionsProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef(
    id || `vowel-instructions-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    const readContent = () => {
      // Priority 1: Use content prop if provided
      if (content) {
        const trimmed = content.trim();
        if (trimmed) {
          console.log(`📝 [VowelInstructions] Registering instructions from 'content' prop (${instanceId.current}): ${trimmed.length} characters`);
          vowelInstructionsRegistry.register(instanceId.current, trimmed);
          return true;
        }
      }

      // Priority 2: Try to find the host <vowel-instructions> element
      // r2wc renders React inside the custom element, so we need to traverse up
      if (elementRef.current) {
        // Find the vowel-instructions host element
        let hostElement: HTMLElement | null = elementRef.current;
        while (hostElement && hostElement.tagName !== 'VOWEL-INSTRUCTIONS') {
          hostElement = hostElement.parentElement;
        }

        if (hostElement) {
          // Read text content from the host element (light DOM)
          const textContent = hostElement.textContent || "";
          const trimmed = textContent.trim();
          
          if (trimmed) {
            console.log(`📝 [VowelInstructions] Registering instructions from DOM content (${instanceId.current}): ${trimmed.length} characters`);
            vowelInstructionsRegistry.register(instanceId.current, trimmed);
            return true;
          }
        }
      }

      // Priority 3: Try children prop
      if (children) {
        let instructionsText = "";
        if (typeof children === "string") {
          instructionsText = children;
        } else if (Array.isArray(children)) {
          instructionsText = children
            .map((child) => (typeof child === "string" ? child : ""))
            .join("");
        }

        const trimmed = instructionsText.trim();
        if (trimmed) {
          console.log(`📝 [VowelInstructions] Registering instructions from children prop (${instanceId.current}): ${trimmed.length} characters`);
          vowelInstructionsRegistry.register(instanceId.current, trimmed);
          return true;
        }
      }

      return false;
    };

    // Try reading content immediately
    const success = readContent();

    if (!success) {
      // If failed, try again after a short delay
      const timeoutId = setTimeout(() => {
        const retrySuccess = readContent();
        if (!retrySuccess) {
          console.warn(
            `⚠️ [VowelInstructions] No instructions content found after retry (${instanceId.current})`
          );
        }
      }, 100);

      // Cleanup timeout on unmount
      return () => {
        clearTimeout(timeoutId);
        vowelInstructionsRegistry.unregister(instanceId.current);
      };
    }

    // Cleanup on unmount
    return () => {
      vowelInstructionsRegistry.unregister(instanceId.current);
    };
  }, [content, children]);

  // Render hidden div to capture children text content
  // This component is not meant to be visible in the UI
  return (
    <div
      ref={elementRef}
      data-vowel-instructions-id={instanceId.current}
      style={{ display: "none" }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

/**
 * Default export for web component conversion
 */
export default VowelInstructions;

