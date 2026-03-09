/**
 * @fileoverview VAD Registry - Central registry for VAD implementations
 * 
 * Provides a central location to register and retrieve VAD implementations.
 * VAD factories register themselves during module initialization.
 * 
 * @module @vowel.to/client/vad
 * @author vowel.to
 * @license Proprietary
 */

import type { VADFactory } from './VADAdapter';

/**
 * Registry for VAD factories
 * Provides a central location to register and retrieve VAD implementations
 */
export class VADRegistry {
  private static factories = new Map<string, VADFactory>();
  
  /**
   * Register a VAD factory
   * Called by VAD implementations during module initialization
   */
  static register(factory: VADFactory): void {
    const metadata = factory.getMetadata();
    this.factories.set(metadata.id, factory);
  }
  
  /**
   * Get a registered VAD factory by ID
   */
  static getFactory(id: string): VADFactory | undefined {
    return this.factories.get(id);
  }
  
  /**
   * Get all registered VAD factories
   */
  static getAllFactories(): VADFactory[] {
    return Array.from(this.factories.values());
  }
  
  /**
   * Check if a factory is registered
   */
  static hasFactory(id: string): boolean {
    return this.factories.has(id);
  }
  
  /**
   * Unregister a VAD factory
   */
  static unregister(id: string): void {
    this.factories.delete(id);
  }
  
  /**
   * Get all registered VAD adapter IDs
   */
  static getRegisteredIds(): string[] {
    return Array.from(this.factories.keys());
  }
  
  /**
   * Clear all registered factories
   * Useful for testing
   */
  static clear(): void {
    this.factories.clear();
  }
}
