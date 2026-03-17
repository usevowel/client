/**
 * VowelWebComponentRegistry
 * 
 * Manages per-instance state for web components
 * Allows multiple web components on the same page without conflicts
 */

import type { Vowel } from "../core/VowelClient";
import type { VowelAction, ActionHandler } from "../types";

/**
 * Action registration entry
 */
interface ActionRegistration {
  definition: VowelAction;
  handler: ActionHandler;
}

/**
 * Per-instance state
 */
interface InstanceState {
  /** Unique instance ID */
  id: string;
  /** Vowel client instance */
  client: Vowel | null;
  /** Registered actions for this instance */
  actions: Map<string, ActionRegistration>;
  /** Instance configuration */
  config: {
    systemInstructionOverride?: string;
    language?: string;
    initialGreetingPrompt?: string;
    turnDetectionPreset?: 'aggressive' | 'balanced' | 'conservative';
    _voiceConfig?: {
      model?: string;
      voice?: string;
    };
  };
}

/**
 * Global registry of web component instances
 */
class VowelWebComponentRegistry {
  private instances: Map<string, InstanceState> = new Map();
  private elementToInstanceId: WeakMap<HTMLElement, string> = new WeakMap();

  /**
   * Register a new web component instance
   */
  registerInstance(element: HTMLElement): string {
    const instanceId = this.generateInstanceId();
    
    this.instances.set(instanceId, {
      id: instanceId,
      client: null,
      actions: new Map(),
      config: {},
    });
    
    this.elementToInstanceId.set(element, instanceId);
    
    console.log(`📝 [VowelRegistry] Registered instance: ${instanceId}`);
    return instanceId;
  }

  /**
   * Unregister a web component instance
   */
  unregisterInstance(instanceIdOrElement: string | HTMLElement): void {
    const instanceId = typeof instanceIdOrElement === 'string'
      ? instanceIdOrElement
      : this.elementToInstanceId.get(instanceIdOrElement);
    
    if (!instanceId) return;
    
    const instance = this.instances.get(instanceId);
    if (instance?.client) {
      instance.client.stopSession();
    }
    
    this.instances.delete(instanceId);
    console.log(`🗑️ [VowelRegistry] Unregistered instance: ${instanceId}`);
  }

  /**
   * Get instance ID from element
   */
  getInstanceId(element: HTMLElement): string | undefined {
    return this.elementToInstanceId.get(element);
  }

  /**
   * Get instance state
   */
  getInstance(instanceIdOrElement: string | HTMLElement): InstanceState | undefined {
    const instanceId = typeof instanceIdOrElement === 'string'
      ? instanceIdOrElement
      : this.elementToInstanceId.get(instanceIdOrElement);
    
    return instanceId ? this.instances.get(instanceId) : undefined;
  }

  /**
   * Set Vowel client for an instance
   */
  setClient(instanceId: string, client: Vowel): void {
    const instance = this.instances.get(instanceId);
    if (instance) {
      instance.client = client;
      console.log(`✅ [VowelRegistry] Client set for instance: ${instanceId}`);
    }
  }

  /**
   * Get Vowel client for an instance
   */
  getClient(instanceIdOrElement: string | HTMLElement): Vowel | null {
    const instance = this.getInstance(instanceIdOrElement);
    return instance?.client || null;
  }

  /**
   * Register an action for a specific instance
   */
  registerAction(
    instanceIdOrElement: string | HTMLElement,
    name: string,
    definition: VowelAction,
    handler: ActionHandler
  ): void {
    const instance = this.getInstance(instanceIdOrElement);
    if (!instance) {
      console.error(`❌ [VowelRegistry] Instance not found for action registration: ${name}`);
      return;
    }

    instance.actions.set(name, { definition, handler });
    
    // If client exists, register the action immediately
    if (instance.client) {
      instance.client.registerAction(name, definition, handler);
      console.log(`🎯 [VowelRegistry] Action registered: ${name} (instance: ${instance.id})`);
    }
  }

  /**
   * Get all actions for an instance
   */
  getActions(instanceIdOrElement: string | HTMLElement): Map<string, ActionRegistration> {
    const instance = this.getInstance(instanceIdOrElement);
    return instance?.actions || new Map();
  }

  /**
   * Set configuration for an instance
   */
  setConfig(
    instanceIdOrElement: string | HTMLElement,
    config: InstanceState['config']
  ): void {
    const instance = this.getInstance(instanceIdOrElement);
    if (instance) {
      instance.config = { ...instance.config, ...config };
    }
  }

  /**
   * Get configuration for an instance
   */
  getConfig(instanceIdOrElement: string | HTMLElement): InstanceState['config'] {
    const instance = this.getInstance(instanceIdOrElement);
    return instance?.config || {};
  }

  /**
   * Generate a unique instance ID
   */
  private generateInstanceId(): string {
    return `vowel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all registered instances (for debugging)
   */
  getAllInstances(): string[] {
    return Array.from(this.instances.keys());
  }
}

/**
 * Global singleton instance
 */
export const vowelRegistry = new VowelWebComponentRegistry();

/**
 * Export for testing/debugging
 */
if (typeof window !== 'undefined') {
  (window as any).__VOWEL_REGISTRY__ = vowelRegistry;
}
