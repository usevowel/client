/**
 * Shopify Router Adapter
 * Extends generic controlled navigation with Shopify-specific features
 * 
 * Currently, the generic implementation works perfectly for Shopify,
 * so this is a simple extension with no overrides needed.
 */

import { ControlledNavigationRouter } from '../generic/router';
import type { ControlledNavigationRouterOptions } from '../generic/router';

/**
 * Router adapter for Shopify storefronts
 * Opens navigation in a dedicated tab to preserve voice agent session
 * 
 * @example
 * ```ts
 * const router = new ShopifyRouterAdapter();
 * router.setRoutes(discoveredRoutes);
 * 
 * // Navigate to a collection (opens in separate tab)
 * await router.navigate('/collections/new-arrivals');
 * ```
 */
export class ShopifyRouterAdapter extends ControlledNavigationRouter {
  constructor(options: ControlledNavigationRouterOptions = {}) {
    // Pass Shopify-specific config to generic router
    super({
      channelName: options.channelName || 'vowel-navigation',
      config: {
        ...options.config,
        features: ['navigation', 'addToCart', ...(options.config?.features || [])]
      }
    });
  }

  // No overrides needed - generic implementation works perfectly for Shopify
  // Can add Shopify-specific methods here if needed in the future
}

