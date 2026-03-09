/**
 * Shopify Platform Adapter Entry Point
 * Complete integration package for Shopify storefronts
 * 
 * @module @vowel.to/client/platforms/shopify
 * 
 * @example
 * ```ts
 * import { 
 *   ShopifyRouterAdapter,
 *   ShopifyActionHandler,
 *   RouteGenerator,
 *   initializeShopifyIntegration 
 * } from '@vowel.to/client/platforms/shopify';
 * import { Vowel } from '@vowel.to/client';
 * 
 * // Quick setup with helper
 * const { router, routes, actionHandler } = await initializeShopifyIntegration({
 *   storeUrl: 'https://mystore.com'
 * });
 * 
 * const vowel = new Vowel({
 *   appId: 'your-app-id',
 *   router,
 *   routes
 * });
 * 
 * // Register Shopify actions
 * const definitions = actionHandler.getActionDefinitions();
 * Object.entries(definitions).forEach(([name, definition]) => {
 *   vowel.registerAction(name, definition, (actionHandler as any)[name].bind(actionHandler));
 * });
 * ```
 */

export * from "../lib/vowel/platforms/shopify";

