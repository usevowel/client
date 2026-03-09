/**
 * @fileoverview Vowel Factory Registry - Manages custom Vowel client factory functions
 * 
 * This registry allows users to provide a custom factory function that creates
 * and configures a Vowel client instance. This enables advanced use cases like:
 * - Custom provider configuration (vowel-prime, etc.)
 * - Pre-registering actions before the web component initializes
 * - Custom adapter configuration
 * - Full control over Vowel client initialization
 * 
 * @module @vowel.to/client/web-component
 * @author vowel.to
 * @license Proprietary
 */

import type { Vowel } from "../core/VowelClient";

/**
 * Configuration passed to the factory function
 */
export interface VowelFactoryConfig {
  /** App ID from the web component attribute */
  appId: string;
  /** The web component DOM element */
  element: HTMLElement;
  /** Position of the floating button */
  position?: string;
  /** Any additional config from web component attributes */
  [key: string]: any;
}

/**
 * Factory function that creates and returns a Vowel client instance
 * Can be async to support dynamic imports or API calls
 */
export type VowelFactory = (
  config: VowelFactoryConfig
) => Promise<Vowel> | Vowel;

/**
 * Registry for storing and retrieving the Vowel client factory function
 */
class VowelFactoryRegistry {
  private factory: VowelFactory | null = null;
  private eventTarget: EventTarget = new EventTarget();

  /**
   * Register a factory function
   * 
   * @param factory - Function that creates and returns a Vowel client
   * 
   * @example
   * ```typescript
   * window.registerVowelFactory(async (config) => {
   *   const vowel = new window.Vowel({
   *     appId: config.appId,
   *     voiceConfig: {
   *       provider: 'vowel-prime',
   *       model: 'openai/gpt-oss-120b',
   *     },
   *   });
   *   
   *   // Register custom actions
   *   vowel.registerAction('myAction', { ... }, handler);
   *   
   *   return vowel;
   * });
   * ```
   */
  registerFactory(factory: VowelFactory): void {
    if (this.factory) {
      console.warn(
        "⚠️ [VowelFactoryRegistry] Factory already registered. Overwriting existing factory."
      );
    }
    
    console.log("✅ [VowelFactoryRegistry] Factory registered");
    this.factory = factory;
    
    // Dispatch event to notify waiting components
    this.eventTarget.dispatchEvent(new Event('factory-registered'));
  }

  /**
   * Get the registered factory function
   * 
   * @returns The factory function, or null if none registered
   */
  getFactory(): VowelFactory | null {
    return this.factory;
  }

  /**
   * Check if a factory has been registered
   * 
   * @returns true if a factory is registered
   */
  hasFactory(): boolean {
    return this.factory !== null;
  }

  /**
   * Wait for factory to be registered
   * 
   * @param timeoutMs - Maximum time to wait in milliseconds (default: 30000)
   * @returns Promise that resolves with the factory when registered
   */
  async waitForFactory(timeoutMs: number = 30000): Promise<VowelFactory> {
    // If factory already exists, return immediately
    if (this.factory) {
      return this.factory;
    }

    // Wait for factory registration event or timeout
    return new Promise((resolve, reject) => {
      const handleRegistration = () => {
        if (this.factory) {
          clearTimeout(timeoutHandle);
          resolve(this.factory);
        }
      };

      const timeoutHandle = setTimeout(() => {
        this.eventTarget.removeEventListener('factory-registered', handleRegistration);
        reject(new Error('Factory registration timeout'));
      }, timeoutMs);

      this.eventTarget.addEventListener('factory-registered', handleRegistration, { once: true });
    });
  }

  /**
   * Clear the registered factory
   * Useful for testing or resetting state
   */
  clearFactory(): void {
    console.log("🧹 [VowelFactoryRegistry] Factory cleared");
    this.factory = null;
  }
}

/**
 * Global singleton instance of the factory registry
 */
export const vowelFactoryRegistry = new VowelFactoryRegistry();

/**
 * Type augmentation for window object
 */
declare global {
  interface Window {
    registerVowelFactory: (factory: VowelFactory) => void;
  }
}

/**
 * Expose factory registration function globally
 * 
 * This allows users to register their factory function before the
 * web component initializes:
 * 
 * @example
 * ```html
 * <script>
 *   window.registerVowelFactory(async (config) => {
 *     const vowel = new window.Vowel({ ... });
 *     return vowel;
 *   });
 * </script>
 * 
 * <vowel-voice-widget init-mode="custom" app-id="..."></vowel-voice-widget>
 * ```
 */
if (typeof window !== "undefined") {
  window.registerVowelFactory = (factory: VowelFactory) => {
    vowelFactoryRegistry.registerFactory(factory);
  };
}



