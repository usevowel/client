/**
 * Generic Controlled Navigation Platform Adapter Entry Point
 * Works with any website that has a sitemap
 * 
 * @module @vowel.to/client/platforms/generic
 * 
 * @example
 * ```ts
 * import { 
 *   initializeControlledNavigation,
 *   ControlledNavigationRouter,
 *   GenericRouteGenerator
 * } from '@vowel.to/client/platforms/generic';
 * import { Vowel } from '@vowel.to/client';
 * 
 * // Quick setup with helper
 * const { router, routes } = await initializeControlledNavigation({
 *   storeUrl: 'https://example.com'
 * });
 * 
 * const vowel = new Vowel({
 *   appId: 'your-app-id',
 *   router,
 *   routes
 * });
 * ```
 */

export * from "../lib/vowel/platforms/generic";

