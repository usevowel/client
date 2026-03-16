/**
 * VowelWebComponentAPI
 * 
 * Extends the web component element with imperative API methods
 * Allows programmatic access to Vowel client and action registration
 */

import { vowelRegistry } from "./VowelWebComponentRegistry";
import type { Vowel } from "../core/VowelClient";
import type { VowelAction, ActionHandler } from "../types";

/**
 * Extended interface for the vowel-voice-widget element
 * These methods will be available on the DOM element
 */
export interface VowelVoiceWidgetElement extends HTMLElement {
  /**
   * Register a custom action programmatically
   * 
   * @example
   * const widget = document.querySelector('vowel-voice-widget');
   * widget.registerAction('addToCart', {
   *   description: 'Add product to cart',
   *   parameters: {
   *     productId: { type: 'string', description: 'Product ID' }
   *   }
   * }, async (params) => {
   *   console.log('Adding to cart:', params.productId);
   * });
   */
  registerAction(name: string, definition: VowelAction, handler: ActionHandler): void;

  /**
   * Get the Vowel client instance
   * Returns null if not yet initialized
   * 
   * @example
   * const widget = document.querySelector('vowel-voice-widget');
   * const client = widget.getVowelClient();
   * if (client) {
   *   client.startSession();
   * }
   */
  getVowelClient(): Vowel | null;

  /**
   * Start a voice session programmatically
   */
  startSession(): Promise<void>;

  /**
   * Stop the current voice session
   */
  stopSession(): void;

  /**
   * Get the current session state
   */
  getState(): any;

  /**
   * Set configuration options
   * 
   * @example
   * widget.setConfig({
   *   systemInstructionOverride: 'You are a helpful assistant',
   *   voiceConfig: { voice: 'Puck' }
   * });
   */
  setConfig(config: {
    systemInstructionOverride?: string;
    language?: string;
    initialGreetingPrompt?: string;
    turnDetectionPreset?: 'aggressive' | 'balanced' | 'conservative';
    _voiceConfig?: {
      model?: string;
      voice?: string;
    };
  }): void;

  /**
   * Get instance ID (internal)
   */
  _instanceId?: string;
}

/**
 * Enhance a web component element with Vowel API methods
 */
export function enhanceVowelElement(element: HTMLElement, instanceId: string): void {
  const enhanced = element as VowelVoiceWidgetElement;
  
  // Store instance ID
  enhanced._instanceId = instanceId;
  element.setAttribute('data-vowel-instance-id', instanceId);

  /**
   * Register an action
   */
  enhanced.registerAction = function(
    name: string,
    definition: VowelAction,
    handler: ActionHandler
  ): void {
    if (!this._instanceId) {
      console.error('❌ [VowelWebComponent] Cannot register action: instance ID not found');
      return;
    }

    vowelRegistry.registerAction(this._instanceId, name, definition, handler);
  };

  /**
   * Get Vowel client
   */
  enhanced.getVowelClient = function(): Vowel | null {
    if (!this._instanceId) return null;
    return vowelRegistry.getClient(this._instanceId);
  };

  /**
   * Start session
   */
  enhanced.startSession = async function(): Promise<void> {
    const client = this.getVowelClient();
    if (!client) {
      throw new Error('Vowel client not initialized yet');
    }
    await client.startSession();
  };

  /**
   * Stop session
   */
  enhanced.stopSession = function(): void {
    const client = this.getVowelClient();
    if (client) {
      client.stopSession();
    }
  };

  /**
   * Get state
   */
  enhanced.getState = function(): any {
    const client = this.getVowelClient();
    return client ? client.state : null;
  };

  /**
   * Set config
   */
  enhanced.setConfig = function(config: any): void {
    if (!this._instanceId) {
      console.error('❌ [VowelWebComponent] Cannot set config: instance ID not found');
      return;
    }
    vowelRegistry.setConfig(this._instanceId, config);
  };

  console.log(`✅ [VowelWebComponent] API methods attached to element (${instanceId})`);
}

/**
 * Dispatch lifecycle event
 */
export function dispatchVowelEvent(
  element: HTMLElement,
  eventName: 'ready' | 'session-start' | 'session-end' | 'error',
  detail?: any
): void {
  const event = new CustomEvent(`vowel-${eventName}`, {
    detail,
    bubbles: true,
    composed: true,
  });
  
  element.dispatchEvent(event);
  console.log(`📢 [VowelWebComponent] Event dispatched: vowel-${eventName}`);
}

/**
 * Wait for Vowel client to be ready
 * 
 * @example
 * const widget = document.querySelector('vowel-voice-widget');
 * const client = await waitForVowelReady(widget);
 */
export function waitForVowelReady(element: HTMLElement): Promise<Vowel> {
  return new Promise((resolve, reject) => {
    const enhanced = element as VowelVoiceWidgetElement;
    
    // Check if already ready
    const existingClient = enhanced.getVowelClient?.();
    if (existingClient) {
      resolve(existingClient);
      return;
    }

    // Wait for ready event
    const handleReady = (event: Event) => {
      const customEvent = event as CustomEvent;
      resolve(customEvent.detail.client);
      element.removeEventListener('vowel-ready', handleReady);
    };

    element.addEventListener('vowel-ready', handleReady);

    // Timeout after 30 seconds
    setTimeout(() => {
      element.removeEventListener('vowel-ready', handleReady);
      reject(new Error('Vowel client initialization timeout'));
    }, 30000);
  });
}

/**
 * Export types for TypeScript users
 */
export type { VowelAction, ActionHandler } from "../types";
