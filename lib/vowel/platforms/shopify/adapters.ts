/**
 * @fileoverview Shopify Dual Adapters - Navigation and Automation
 * 
 * This file provides Shopify-specific implementations of the dual adapter pattern:
 * - ShopifyNavigationAdapter: Handles WHERE to go (routing)
 * - ShopifyAutomationAdapter: Handles WHAT to do (DOM interaction)
 * 
 * These adapters extend the generic controlled adapters with Shopify-specific
 * features and work together to provide complete voice-controlled commerce.
 * 
 * @module @vowel.to/client/platforms/shopify
 * @author vowel.to
 * @license Proprietary
 */

import { ControlledNavigationAdapter } from '../../adapters/navigation/controlled-navigation-adapter';
import { ControlledAutomationAdapter } from '../../adapters/automation/controlled-automation-adapter';
import type { NavigationAdapter, AutomationAdapter } from '../../types';

/**
 * Shopify Navigation Adapter
 * 
 * Handles cross-tab navigation for Shopify stores.
 * Extends the generic ControlledNavigationAdapter with Shopify-specific configuration.
 * 
 * @example
 * ```ts
 * const navigationAdapter = new ShopifyNavigationAdapter({
 *   storeUrl: 'https://mystore.com'
 * });
 * 
 * // Navigate to collections page
 * await navigationAdapter.navigate('/collections/all');
 * ```
 */
export class ShopifyNavigationAdapter extends ControlledNavigationAdapter {
  constructor(options: {
    storeUrl?: string;
    channelName?: string;
  } = {}) {
    super({
      channelName: options.channelName || 'vowel-navigation'  // Use default channel
    });
    
    console.log('🛍️ [ShopifyNavigationAdapter] Initialized', {
      storeUrl: options.storeUrl,
      channelName: options.channelName || 'vowel-navigation'
    });
  }
}

/**
 * Shopify Automation Adapter
 * 
 * Handles cross-tab DOM automation for Shopify stores.
 * Extends the generic ControlledAutomationAdapter with Shopify-specific configuration.
 * 
 * @example
 * ```ts
 * const automationAdapter = new ShopifyAutomationAdapter();
 * 
 * // Search for add to cart button
 * const results = await automationAdapter.searchElements('add to cart button');
 * 
 * // Click the button
 * await automationAdapter.clickElement(results.elements[0].id);
 * ```
 */
export class ShopifyAutomationAdapter extends ControlledAutomationAdapter {
  constructor(options: {
    channelName?: string;
  } = {}) {
    super(options.channelName || 'vowel-automation');  // Use default channel
    
    console.log('🛍️ [ShopifyAutomationAdapter] Initialized', {
      channelName: options.channelName || 'vowel-automation'
    });
  }
}

/**
 * Initialize Shopify dual adapters
 * 
 * Creates and configures both navigation and automation adapters for Shopify.
 * This is the recommended way to set up Shopify integration with the dual adapter pattern.
 * 
 * @param config - Configuration options
 * @returns Initialized navigation and automation adapters
 * 
 * @example
 * ```ts
 * import { initializeShopifyAdapters } from '@vowel.to/client/platforms/shopify';
 * import { Vowel } from '@vowel.to/client';
 * 
 * const { navigationAdapter, automationAdapter } = initializeShopifyAdapters({
 *   storeUrl: 'https://mystore.com'
 * });
 * 
 * const vowel = new Vowel({
 *   appId: 'your-app-id',
 *   navigationAdapter,
 *   automationAdapter
 * });
 * ```
 */
export function initializeShopifyAdapters(config: {
  storeUrl?: string;
  navigationChannelName?: string;
  automationChannelName?: string;
} = {}): {
  navigationAdapter: NavigationAdapter;
  automationAdapter: AutomationAdapter;
} {
  console.log('🛍️ [Shopify] Initializing dual adapters...');
  
  const navigationAdapter = new ShopifyNavigationAdapter({
    storeUrl: config.storeUrl,
    channelName: config.navigationChannelName
  });
  
  const automationAdapter = new ShopifyAutomationAdapter({
    channelName: config.automationChannelName
  });
  
  console.log('✅ [Shopify] Dual adapters initialized');
  
  return {
    navigationAdapter,
    automationAdapter
  };
}

