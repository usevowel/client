/**
 * Generic Controlled Navigation Platform Adapter
 * Works with any website that has a sitemap
 * 
 * Features:
 * - Sitemap-based route discovery
 * - Cross-tab navigation control
 * - AI-powered DOM interaction
 * - Theme-agnostic element search
 * 
 * @module @vowel.to/client/platforms/generic
 * 
 * @example
 * ```ts
 * import { initializeControlledNavigation } from '@vowel.to/client/platforms/generic';
 * import { Vowel } from '@vowel.to/client';
 * 
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

// Router
export { ControlledNavigationRouter } from './router';
export type { ControlledNavigationRouterOptions } from './router';

// Routes
export { GenericRouteGenerator, GenericUrlCategorizer } from './routes';
export type { IUrlCategorizer } from './routes';

// Sitemap
export { SitemapParser } from './sitemap';
export type { SitemapData, SitemapEntry, UrlEntry } from './sitemap';

// Navigation listener for cross-tab communication
export { initializeNavigationListener } from './navigation-listener';

// Automation listener for cross-tab DOM interaction
export { 
  initializeAutomationListener,
  autoInitializeAutomationListener 
} from './automation-listener';

// DOM Tools
export { FuzzyDOMSearcher } from './dom-search';
export type { 
  LevenshteinSearchOptions, 
  SearchResultElement, 
  DOMSearchResults 
} from './dom-search';

export { DOMManipulator } from './dom-tools';

// Snapshot
export { snapshotForAI, generateAriaTree } from './snapshot';
export type { 
  AriaNode, 
  AriaSnapshot, 
  AriaTreeOptions 
} from './snapshot';

// Types
export type { 
  ControlledNavigationOptions,
  ControlledNavigationResult,
  UrlCategory
} from './types';

// Import for helper function
import { ControlledNavigationRouter } from './router';
import { GenericRouteGenerator } from './routes';
import type { ControlledNavigationOptions, ControlledNavigationResult } from './types';

/**
 * Helper function to initialize a complete controlled navigation setup
 * Sets up router, discovers routes from sitemap
 * Fault-tolerant: always returns valid routes, falling back to basic routes if discovery fails
 * 
 * @param options - Configuration options
 * @returns Initialized router and routes
 * 
 * @example
 * ```ts
 * import { initializeControlledNavigation } from '@vowel.to/client/platforms/generic';
 * import { Vowel } from '@vowel.to/client';
 * 
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
export async function initializeControlledNavigation(
  options: ControlledNavigationOptions = {}
): Promise<ControlledNavigationResult> {
  const { storeUrl, useFallbackRoutes = false, channelName, config } = options;
  
  const router = new ControlledNavigationRouter({
    channelName,
    config
  });
  
  const generator = new GenericRouteGenerator();

  let routes;

  try {
    const baseUrl = storeUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    
    if (useFallbackRoutes) {
      console.log("📋 Using fallback routes (sitemap discovery disabled)");
      routes = generator['getFallbackRoutes'](); // Access protected method
    } else {
      console.log("🔍 Attempting to discover routes from sitemap...");
      routes = await generator.generateRoutes(baseUrl);
      
      if (routes.length === 0) {
        console.warn("⚠️ No routes were discovered");
      } else {
        console.log(`✅ Successfully loaded ${routes.length} routes`);
      }
    }
  } catch (error) {
    console.error("❌ Route generation failed completely:", error);
    // Provide a minimal set of routes as a last resort
    routes = [{
      path: "/",
      description: "Homepage",
      metadata: { type: "home", priority: "highest" },
    }];
  }

  router.setRoutes(routes);

  return {
    router,
    routes,
  };
}

