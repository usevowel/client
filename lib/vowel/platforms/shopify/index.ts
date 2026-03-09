/**
 * Shopify Platform Adapter
 * Complete integration package for Shopify storefronts
 * Extends generic controlled navigation with Shopify-specific features
 * 
 * @module @vowel.to/client/platforms/shopify
 * 
 * @example
 * ```ts
 * import { 
 *   ShopifyRouterAdapter,
 *   ShopifyActionHandler,
 *   ShopifyRouteGenerator 
 * } from '@vowel.to/client/platforms/shopify';
 * import { Vowel } from '@vowel.to/client';
 * 
 * // Setup router
 * const router = new ShopifyRouterAdapter();
 * 
 * // Generate routes from sitemap
 * const generator = new ShopifyRouteGenerator();
 * const routes = await generator.generateRoutes('https://mystore.com');
 * router.setRoutes(routes);
 * 
 * // Create Vowel client
 * const vowel = new Vowel({
 *   appId: 'your-app-id',
 *   router,
 *   routes
 * });
 * 
 * // Register Shopify actions
 * const actionHandler = new ShopifyActionHandler();
 * const definitions = actionHandler.getActionDefinitions();
 * 
 * vowel.registerAction('searchProducts', 
 *   definitions.searchProducts,
 *   actionHandler.searchProducts.bind(actionHandler)
 * );
 * ```
 */

// Re-export generic components that work as-is for Shopify
export { 
  initializeNavigationListener,
  initializeAutomationListener,
  autoInitializeAutomationListener,
  FuzzyDOMSearcher,
  DOMManipulator,
  snapshotForAI,
  generateAriaTree
} from '../generic';

// Re-export generic types
export type {
  LevenshteinSearchOptions,
  SearchResultElement,
  DOMSearchResults,
  AriaNode,
  AriaSnapshot,
  AriaTreeOptions
} from '../generic';

// Export Shopify-specific components
export { ShopifyRouterAdapter } from "./router";
export { ShopifyRouteGenerator, ShopifyUrlCategorizer } from "./routes";
export { ShopifyActionHandler, ShopifyStoreManager } from "./actions";

// Export dual adapters (NEW)
export { 
  ShopifyNavigationAdapter,
  ShopifyAutomationAdapter,
  initializeShopifyAdapters
} from "./adapters";

// Import for helper function
import { ShopifyRouterAdapter } from "./router";
import { ShopifyActionHandler } from "./actions";
import { ShopifyRouteGenerator } from "./routes";
import { initializeShopifyAdapters } from "./adapters";
import type { VowelRoute, NavigationAdapter, AutomationAdapter } from "../../types";

/**
 * Helper function to initialize a complete Shopify integration
 * Sets up router, discovers routes, and registers actions
 * Fault-tolerant: always returns valid routes, falling back to basic routes if discovery fails
 * 
 * @param config - Configuration options
 * @returns Initialized components
 * 
 * @example
 * ```ts
 * import { initializeShopifyIntegration } from '@vowel.to/client/platforms/shopify';
 * import { Vowel } from '@vowel.to/client';
 * 
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
 * // Register all Shopify actions
 * const definitions = actionHandler.getActionDefinitions();
 * Object.entries(definitions).forEach(([name, definition]) => {
 *   vowel.registerAction(name, definition, (actionHandler as any)[name].bind(actionHandler));
 * });
 * ```
 */
export async function initializeShopifyIntegration(config: {
  storeUrl?: string;
  useFallbackRoutes?: boolean;
}): Promise<{
  router: ShopifyRouterAdapter;
  routes: VowelRoute[];
  actionHandler: ShopifyActionHandler;
}> {
  const { storeUrl, useFallbackRoutes = false } = config;
  
  const router = new ShopifyRouterAdapter();
  const generator = new ShopifyRouteGenerator();
  // Pass router's navigate function to action handler for client-side navigation
  const actionHandler = new ShopifyActionHandler(router.navigate.bind(router));

  let routes: VowelRoute[];

  try {
    const baseUrl = storeUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    
    if (useFallbackRoutes) {
      console.log("📋 Using fallback routes (sitemap discovery disabled)");
      // Directly get fallback routes without attempting sitemap discovery
      routes = await generator.generateRoutes(baseUrl);
    } else {
      console.log("🔍 Attempting to discover routes from sitemap...");
      // Try to discover routes from sitemap
      routes = await generator.generateRoutes(baseUrl);
      
      if (routes.length === 0) {
        console.warn("⚠️ No routes were discovered");
      } else {
        console.log(`✅ Successfully loaded ${routes.length} routes`);
      }
    }
  } catch (error) {
    console.error("❌ Route generation failed completely:", error);
    // This should rarely happen as RouteGenerator has its own fallback
    // But we'll provide a minimal set of routes as a last resort
    routes = [{
      path: "/",
      description: "Store homepage",
      metadata: { type: "home", priority: "highest" },
    }];
  }

  router.setRoutes(routes);

  return {
    router,
    routes,
    actionHandler,
  };
}

/**
 * Initialize Shopify integration with dual adapters (NEW)
 * Uses the modern dual-adapter architecture with NavigationAdapter and AutomationAdapter
 * 
 * @param config - Configuration options
 * @returns Initialized adapters, routes, and action handler
 * 
 * @example
 * ```ts
 * import { initializeShopifyDualAdapters } from '@vowel.to/client/platforms/shopify';
 * import { Vowel } from '@vowel.to/client';
 * 
 * const { navigationAdapter, automationAdapter, routes, actionHandler } = 
 *   await initializeShopifyDualAdapters({
 *     storeUrl: 'https://mystore.com'
 *   });
 * 
 * const vowel = new Vowel({
 *   appId: 'your-app-id',
 *   navigationAdapter,
 *   automationAdapter,
 *   routes,
 *   floatingCursor: { enabled: true }
 * });
 * 
 * // Register all Shopify actions
 * const definitions = actionHandler.getActionDefinitions();
 * Object.entries(definitions).forEach(([name, definition]) => {
 *   vowel.registerAction(name, definition, (actionHandler as any)[name].bind(actionHandler));
 * });
 * ```
 */
export async function initializeShopifyDualAdapters(config: {
  storeUrl?: string;
  useFallbackRoutes?: boolean;
  navigationChannelName?: string;
  automationChannelName?: string;
}): Promise<{
  navigationAdapter: NavigationAdapter;
  automationAdapter: AutomationAdapter;
  routes: VowelRoute[];
  actionHandler: ShopifyActionHandler;
}> {
  const { storeUrl, useFallbackRoutes = false, navigationChannelName, automationChannelName } = config;
  
  console.log('🛍️ [Shopify] Initializing dual-adapter integration...');
  
  // Initialize dual adapters
  const { navigationAdapter, automationAdapter } = initializeShopifyAdapters({
    storeUrl,
    navigationChannelName,
    automationChannelName
  });
  
  // Generate routes
  const generator = new ShopifyRouteGenerator();
  let routes: VowelRoute[];

  try {
    const baseUrl = storeUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    
    if (useFallbackRoutes) {
      console.log("📋 Using fallback routes (sitemap discovery disabled)");
      routes = await generator.generateRoutes(baseUrl);
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
    routes = [{
      path: "/",
      description: "Store homepage",
      metadata: { type: "home", priority: "highest" },
    }];
  }
  
  // Create action handler
  const actionHandler = new ShopifyActionHandler(
    (path: string) => navigationAdapter.navigate(path)
  );
  
  console.log('✅ [Shopify] Dual-adapter integration initialized');
  
  return {
    navigationAdapter,
    automationAdapter,
    routes,
    actionHandler,
  };
}
