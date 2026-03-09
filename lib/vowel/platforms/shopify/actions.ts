/**
 * Shopify Action Handlers
 * Handles voice actions in the Shopify storefront context
 * Uses cross-tab communication to control navigation tab from main page
 */

import type { ToolResult } from "../../types";
import { CrossTabManager } from "../../managers/CrossTabManager";

/**
 * Product interface for DOM extraction
 */
interface Product {
  id: string;
  title: string;
  price?: string;
  image?: string;
  element?: Element;
}

/**
 * Shopify Store Data Manager
 * Handles client-side store data operations through DOM manipulation
 * 
 * @example
 * ```ts
 * const manager = new ShopifyStoreManager();
 * const products = await manager.getProducts();
 * await manager.addToCart('product-123', 1);
 * ```
 */
export class ShopifyStoreManager {
  private cache: Map<string, Product[]> = new Map();

  /**
   * Get products from the current page
   * Extracts product information from DOM elements
   * 
   * @returns Products array
   */
  async getProducts(): Promise<Product[]> {
    const cacheKey = "products";

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Try to get products from current page
    const products = this.extractProductsFromDOM();

    // Cache results
    this.cache.set(cacheKey, products);
    return products;
  }

  /**
   * Extract products from current DOM
   * Searches for common Shopify product element patterns
   * 
   * @returns Products found on current page
   */
  private extractProductsFromDOM(): Product[] {
    const products: Product[] = [];

    // Look for product cards/elements using common selectors
    const productSelectors = [
      "[data-product-id]",
      ".product-card",
      ".product-item",
      ".product",
      "[data-product]",
    ];

    productSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        const product = this.extractProductFromElement(element);
        if (product) {
          products.push(product);
        }
      });
    });

    return products;
  }

  /**
   * Extract product data from DOM element
   * Attempts to find product information using common patterns
   * 
   * @param element - Product element
   * @returns Product data or null
   */
  private extractProductFromElement(element: Element): Product | null {
    try {
      const id =
        element.getAttribute("data-product-id") ||
        element
          .querySelector("[data-product-id]")
          ?.getAttribute("data-product-id");

      const title =
        element
          .querySelector("h1, h2, h3, .title, [data-product-title]")
          ?.textContent?.trim() ||
        element.querySelector(".product-title")?.textContent?.trim();

      const price =
        element.querySelector(".price, [data-price]")?.textContent?.trim() ||
        element.querySelector(".product-price")?.textContent?.trim();

      const image = element.querySelector("img")?.src;

      if (id && title) {
        return {
          id,
          title,
          price,
          image,
          element, // Keep reference for DOM interactions
        };
      }
    } catch (error) {
      console.warn("Failed to extract product from element:", error);
    }

    return null;
  }

  /**
   * Add product to cart
   * Simulates clicking the "Add to Cart" button
   * 
   * @param productId - Product ID to add
   * @param quantity - Quantity to add (default: 1)
   * @returns Result of add operation
   */
  async addToCart(
    productId: string,
    quantity: number = 1
  ): Promise<{ success: boolean; productId: string; quantity: number; error?: string }> {
    try {
      // Use Shopify AJAX Cart API to add item
      // This works across tabs and doesn't require DOM manipulation
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: productId,
          quantity: quantity,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to add to cart: ${error}`);
      }

      const result = await response.json();
      console.log('✅ Added to cart:', result);
      
      return { success: true, productId, quantity };
    } catch (error) {
      // If main tab fails, try sending message to navigation tab
      console.warn('⚠️ Main tab addToCart failed, sending to navigation tab');
      try {
        const crossTab = CrossTabManager.getInstance();
        crossTab.sendMessage('addToCart', { productId, quantity });
        return { success: true, productId, quantity };
      } catch (crossTabError) {
        return {
          success: false,
          productId,
          quantity,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  /**
   * Search products by query
   * Filters products on current page by search term
   * 
   * @param query - Search query
   * @returns Matching products
   */
  async searchProducts(query: string): Promise<Product[]> {
    const products = await this.getProducts();
    const searchTerm = query.toLowerCase();

    return products.filter(
      (product) =>
        product.title?.toLowerCase().includes(searchTerm) ||
        product.id?.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Navigate to collection
   * Uses router-based navigation to preserve voice agent connection
   * 
   * @param collectionHandle - Collection handle/slug
   * @param navigate - Navigation function from router
   * @returns Navigation result
   */
  async navigateToCollection(
    collectionHandle: string,
    navigate?: NavigateFunction
  ): Promise<{
    success: boolean;
    navigated: boolean;
    url: string;
  }> {
    const collectionUrl = `/collections/${collectionHandle}`;
    
    if (navigate) {
      // Use router navigation to preserve voice connection
      await navigate(collectionUrl);
    } else {
      // Fallback to full page navigation
      console.warn("⚠️ No navigate function provided, using full page navigation");
      window.location.href = collectionUrl;
    }
    
    return { success: true, navigated: true, url: collectionUrl };
  }

  /**
   * Get store information from page
   * 
   * @returns Store info
   */
  async getStoreInfo(): Promise<{
    name: string;
    url: string;
    currency: string;
    locale: string;
  }> {
    return {
      name:
        document.querySelector("title")?.textContent?.split(" | ")[0] ||
        "Store",
      url: window.location.origin,
      currency: "USD", // Would need to detect this properly from Shopify context
      locale: navigator.language,
    };
  }
}

/**
 * Navigation function type
 */
type NavigateFunction = (path: string) => Promise<void>;

/**
 * Shopify Action Handler
 * Implements voice actions for Shopify storefront
 * Registers actions that can be called by the voice agent
 * 
 * @example
 * ```ts
 * const handler = new ShopifyActionHandler(router.navigate.bind(router));
 * 
 * // Register with Vowel client
 * vowel.registerAction('searchProducts', 
 *   handler.getActionDefinition('searchProducts'),
 *   handler.searchProducts.bind(handler)
 * );
 * ```
 */
export class ShopifyActionHandler {
  private storeManager: ShopifyStoreManager;
  private navigate?: NavigateFunction;

  constructor(navigate?: NavigateFunction) {
    this.storeManager = new ShopifyStoreManager();
    this.navigate = navigate;
  }

  /**
   * Search for products
   * Navigates the controlled tab to search page and extracts results
   * 
   * @param params - Search parameters
   * @returns Search results
   */
  async searchProducts(params: { query: string }): Promise<ToolResult> {
    try {
      console.log('🔍 [ShopifyActionHandler] Searching for:', params.query);
      
      // Navigate controlled tab to search page
      const searchUrl = `/search?q=${encodeURIComponent(params.query)}`;
      if (this.navigate) {
        console.log('   🧭 Navigating controlled tab to search page:', searchUrl);
        await this.navigate(searchUrl);
        
        // Wait a bit for page to load and results to be available
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Request search results from controlled tab via CrossTabManager
        console.log('   📡 Requesting search results from controlled tab...');
        const crossTab = CrossTabManager.getInstance();
        
        try {
          const context = await crossTab.request(
            'getContext',
            { type: 'search', query: params.query },
            'contextResponse',
            5000 // 5 second timeout
          );
          
          console.log('   ✅ Received search results:', context);
          
          const products = context.products || [];
          return {
            success: true,
            result: {
              products: products.slice(0, 10),
              total: products.length,
              query: params.query,
              searchUrl: searchUrl
            },
            response: products.length > 0
              ? `Found ${products.length} products matching "${params.query}". The search page is now open in the content window. You can ask me to go to a specific product by name.`
              : `No products found for "${params.query}". Try a different search term.`,
          };
        } catch (timeoutError) {
          console.warn('   ⚠️ Timeout waiting for search results, returning navigation success');
          return {
            success: true,
            result: {
              products: [],
              total: 0,
              query: params.query,
              searchUrl: searchUrl
            },
            response: `Opened search page for "${params.query}". The results should be visible in the content window.`,
          };
        }
      } else {
        // Fallback: search in current page only
        console.warn('   ⚠️ No navigate function, searching current page only');
        const products = await this.storeManager.searchProducts(params.query);
        return {
          success: true,
          result: {
            products: products.slice(0, 10).map((p) => ({
              id: p.id,
              title: p.title,
              price: p.price,
              image: p.image,
            })),
            total: products.length,
            query: params.query,
          },
          response: `Found ${products.length} products matching "${params.query}" on current page`,
        };
      }
    } catch (error) {
      console.error('   ❌ Search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add product to cart
   * 
   * @param params - Add to cart parameters
   * @returns Add result
   */
  async addToCart(params: {
    productId?: string;
    quantity?: number;
  }): Promise<ToolResult> {
    try {
      if (!params.productId) {
        throw new Error("Product ID is required");
      }

      const result = await this.storeManager.addToCart(
        params.productId,
        params.quantity || 1
      );

      if (result.success) {
        return {
          success: true,
          result,
          response: `Added product to cart`,
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to add to cart",
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Navigate to collection
   * 
   * @param params - Collection parameters
   * @returns Navigation result
   */
  async navigateToCollection(params: { collection: string }): Promise<ToolResult> {
    try {
      const result = await this.storeManager.navigateToCollection(
        params.collection,
        this.navigate
      );
      return {
        success: true,
        result,
        response: `Navigating to ${params.collection} collection`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current page context
   * 
   * @returns Page context
   */
  async getCurrentPageContext(): Promise<ToolResult> {
    return {
      success: true,
      result: {
        url: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Get store information
   * 
   * @param _params - Info request parameters (unused)
   * @returns Store information
   */
  async getStoreInfo(_params?: { info?: string }): Promise<ToolResult> {
    try {
      const info = await this.storeManager.getStoreInfo();
      return {
        success: true,
        result: info,
        response: `Store: ${info.name} at ${info.url}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Navigate to product page
   * First tries to get products from controlled tab, then searches by name
   * 
   * @param params - Product parameters
   * @returns Navigation result
   */
  async navigateToProduct(params: {
    product?: string;
    productId?: string;
  }): Promise<ToolResult> {
    try {
      console.log('🧭 [ShopifyActionHandler] Navigating to product:', params);
      
      // Try to get products from controlled tab first (if we're on search page)
      const crossTab = CrossTabManager.getInstance();
      let products: Product[] = [];
      
      try {
        console.log('   📡 Requesting product list from controlled tab...');
        const context = await crossTab.request(
          'getContext',
          { type: 'products' },
          'contextResponse',
          3000
        );
        products = context.products || [];
        console.log('   ✅ Got', products.length, 'products from controlled tab');
      } catch (error) {
        console.warn('   ⚠️ Could not get products from controlled tab, trying main tab DOM');
        products = await this.storeManager.getProducts();
      }
      
      // Find product by title or ID
      const searchTerm = params.product?.toLowerCase() || '';
      const product = products.find(
        (p) =>
          p.title?.toLowerCase().includes(searchTerm) ||
          p.id === params.productId ||
          // Fuzzy match for better UX
          searchTerm.split(' ').every(word => p.title?.toLowerCase().includes(word))
      );

      if (product && product.id) {
        // Use handle if available (from controlled tab), otherwise use ID
        const productHandle = (product as any).handle || product.id;
        const productUrl = (product as any).url || `/products/${productHandle}`;
        
        console.log('   🎯 Found product:', product.title);
        console.log('   🔗 URL:', productUrl);
        
        if (this.navigate) {
          // Use router navigation to preserve voice connection
          await this.navigate(productUrl);
        } else {
          // Fallback to full page navigation
          console.warn("⚠️ No navigate function provided, using full page navigation");
          window.location.href = productUrl;
        }
        
        return {
          success: true,
          result: { navigated: true, product: product.title, url: productUrl },
          response: `Opening ${product.title} in the content window`,
        };
      }

      console.warn('   ❌ Product not found:', params);
      return {
        success: false,
        error: `Product not found: "${params.product || params.productId}". Try searching first or be more specific.`,
        response: `I couldn't find that product. Try searching for it first, or be more specific with the product name.`,
      };
    } catch (error) {
      console.error('   ❌ Navigation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Search for elements by term using Levenshtein distance
   * Returns elements with spoken-word IDs (e.g., "apple_banana")
   * 
   * Searches across all element properties:
   * - Text content
   * - CSS classes
   * - ARIA labels
   * - Placeholders
   * - Values (inputs, selects, etc.)
   * - Element IDs
   * 
   * @param params - Search parameters
   * @returns Search results with spoken IDs
   */
  /**
   * @deprecated This function is temporarily disabled. Use getPageSnapshot() instead.
   * 
   * DEPRECATION NOTICE: searchElements is being replaced with getPageSnapshot.
   * The AI should always use getPageSnapshot to get a full page view, then search
   * within the snapshot results client-side.
   * 
   * This method now redirects to getPageSnapshot() with a deprecation warning.
   */
  async searchElements(_params: {
    query: string;
    maxResults?: number;
    minSimilarity?: number;
    requireInteractive?: boolean;
    requireVisible?: boolean;
    tag?: string;
  }): Promise<ToolResult> {
    console.warn('⚠️ [ShopifyActionHandler] searchElements() is DEPRECATED');
    console.warn('   Please use getPageSnapshot() instead for all element queries');
    console.warn('   Redirecting to getPageSnapshot()...');
    
    // Redirect to getPageSnapshot
    return this.getPageSnapshot({});
    
    /* ============================================================================
     * ORIGINAL IMPLEMENTATION (TEMPORARILY DISABLED)
     * This code is kept for reference but not currently used.
     * ============================================================================
    try {
      console.log('🔍 [ShopifyActionHandler] Searching for elements...');
      console.log('   Query:', params.query);
      console.log('   Options:', params);
      
      const crossTab = CrossTabManager.getInstance();
      
      const results = await crossTab.request(
        'searchElements',
        { query: params.query, options: params },
        'searchElementsResponse',
        5000
      );
      
      console.log('✅ [ShopifyActionHandler] Found', results.elements?.length || 0, 'elements');
      
      if (results.elements?.length > 0) {
        console.log('   Top result:', results.elements[0].id, '-', results.elements[0].tag);
      }
      
      return {
        success: true,
        result: results,
        response: `Found ${results.elements?.length || 0} elements matching "${params.query}"`,
      };
    } catch (error) {
      console.error('❌ [ShopifyActionHandler] Search elements failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    ============================================================================ */
  }

  /**
   * Click an element on the controlled tab
   * 
   * @param params.id - Spoken ID from search results (e.g., "apple_banana")
   * @returns Click result
   */
  async clickElement(params: { id: string }): Promise<ToolResult> {
    try {
      console.log(`🖱️ [ShopifyActionHandler] Clicking element: ${params.id}`);
      
      const crossTab = CrossTabManager.getInstance();
      
      const result = await crossTab.request(
        'clickElement',
        { id: params.id },
        'domActionResponse',
        5000
      );
      
      if (result.success) {
        console.log('✅ [ShopifyActionHandler] Click successful');
        return {
          success: true,
          result,
          response: `Clicked element ${params.id}`,
        };
      } else {
        console.error('❌ [ShopifyActionHandler] Click failed:', result.error);
        return {
          success: false,
          error: result.error || 'Click failed',
        };
      }
    } catch (error) {
      console.error('❌ [ShopifyActionHandler] Click error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Type text into an element on the controlled tab
   * 
   * @param params.id - Spoken ID from search results
   * @param params.text - Text to type
   * @returns Type result
   */
  async typeIntoElement(params: { id: string; text: string }): Promise<ToolResult> {
    try {
      console.log(`⌨️ [ShopifyActionHandler] Typing into element: ${params.id}`);
      console.log('   Text:', params.text);
      
      const crossTab = CrossTabManager.getInstance();
      
      const result = await crossTab.request(
        'typeIntoElement',
        { id: params.id, text: params.text },
        'domActionResponse',
        10000 // Longer timeout for typing
      );
      
      if (result.success) {
        console.log('✅ [ShopifyActionHandler] Type successful');
        return {
          success: true,
          result,
          response: `Typed "${params.text}" into element ${params.id}`,
        };
      } else {
        console.error('❌ [ShopifyActionHandler] Type failed:', result.error);
        return {
          success: false,
          error: result.error || 'Type failed',
        };
      }
    } catch (error) {
      console.error('❌ [ShopifyActionHandler] Type error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Press a key on the controlled tab
   * 
   * @param params.key - Key to press (e.g., 'Enter', 'Escape')
   * @returns Key press result
   */
  async pressKey(params: { key: string }): Promise<ToolResult> {
    try {
      console.log('⌨️ [ShopifyActionHandler] Pressing key:', params.key);
      
      const crossTab = CrossTabManager.getInstance();
      
      const result = await crossTab.request(
        'pressKey',
        { key: params.key },
        'domActionResponse',
        5000
      );
      
      if (result.success) {
        console.log('✅ [ShopifyActionHandler] Key press successful');
        return {
          success: true,
          result,
          response: `Pressed key ${params.key}`,
        };
      } else {
        console.error('❌ [ShopifyActionHandler] Key press failed:', result.error);
        return {
          success: false,
          error: result.error || 'Key press failed',
        };
      }
    } catch (error) {
      console.error('❌ [ShopifyActionHandler] Key press error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Focus an element on the controlled tab
   * 
   * @param params.id - Spoken ID from search results
   * @returns Focus result
   */
  async focusElement(params: { id: string }): Promise<ToolResult> {
    try {
      console.log(`🎯 [ShopifyActionHandler] Focusing element: ${params.id}`);
      
      const crossTab = CrossTabManager.getInstance();
      
      const result = await crossTab.request(
        'focusElement',
        { id: params.id },
        'domActionResponse',
        5000
      );
      
      if (result.success) {
        console.log('✅ [ShopifyActionHandler] Focus successful');
        return {
          success: true,
          result,
          response: `Focused element ${params.id}`,
        };
      } else {
        console.error('❌ [ShopifyActionHandler] Focus failed:', result.error);
        return {
          success: false,
          error: result.error || 'Focus failed',
        };
      }
    } catch (error) {
      console.error('❌ [ShopifyActionHandler] Focus error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Scroll to an element on the controlled tab
   * 
   * @param params.id - Spoken ID from search results
   * @returns Scroll result
   */
  async scrollToElement(params: { id: string }): Promise<ToolResult> {
    try {
      console.log(`📜 [ShopifyActionHandler] Scrolling to element: ${params.id}`);
      
      const crossTab = CrossTabManager.getInstance();
      
      const result = await crossTab.request(
        'scrollToElement',
        { id: params.id },
        'domActionResponse',
        5000
      );
      
      if (result.success) {
        console.log('✅ [ShopifyActionHandler] Scroll successful');
        return {
          success: true,
          result,
          response: `Scrolled to element ${params.id}`,
        };
      } else {
        console.error('❌ [ShopifyActionHandler] Scroll failed:', result.error);
        return {
          success: false,
          error: result.error || 'Scroll failed',
        };
      }
    } catch (error) {
      console.error('❌ [ShopifyActionHandler] Scroll error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get compressed page snapshot
   * Returns a highly compressed view of all interactive/visible elements
   * Use this when search fails to get context about what's on the page
   * 
   * @returns Compressed snapshot with element IDs, tags, text, etc.
   */
  async getPageSnapshot(_params: {}): Promise<ToolResult> {
    try {
      console.log('📸 [ShopifyActionHandler] Getting page snapshot...');
      
      const crossTab = CrossTabManager.getInstance();
      
      const snapshot = await crossTab.request(
        'getPageSnapshot',
        {},
        'pageSnapshotResponse',
        5000
      );
      
      console.log('✅ [ShopifyActionHandler] Received page snapshot');
      console.log('   📊 Snapshot preview (first 200 chars):');
      console.log('   ', snapshot.snapshot?.substring(0, 200) + '...');
      
      return {
        success: true,
        result: snapshot,
        response: `Page snapshot retrieved with ${snapshot.elementCount || 0} elements`,
      };
    } catch (error) {
      console.error('❌ [ShopifyActionHandler] Get page snapshot failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get all action definitions for registering with Vowel
   * 
   * @returns Record of action names to their definitions
   */
  getActionDefinitions() {
    return {
      // ============================================================
      // LEGACY TOOLS - DISABLED (Use DOM tools instead)
      // ============================================================
      // These tools are kept in code but commented out in definitions
      // so the AI cannot use them. DOM tools are now the only way
      // to interact with pages, ensuring theme-agnostic behavior.
      // ============================================================
      
      // searchProducts: {
      //   description: "[DISABLED - Use DOM tools instead] Legacy search that navigates to /search page. Use getPageSnapshot + clickElement + typeIntoElement + pressKey instead.",
      //   parameters: {
      //     query: {
      //       type: "string",
      //       description: "Search query for products",
      //     },
      //   },
      // },
      
      // navigateToProduct: {
      //   description: "[DISABLED - Use DOM tools instead] Navigate to a specific product page. Use getPageSnapshot to find product links and clickElement instead.",
      //   parameters: {
      //     product: {
      //       type: "string",
      //       description: "Product name to navigate to",
      //       optional: true,
      //     },
      //     productId: {
      //       type: "string",
      //       description: "Exact product ID if known",
      //       optional: true,
      //     },
      //   },
      // },
      
      // navigateToCollection: {
      //   description: "[DISABLED - Use DOM tools instead] Navigate to a product collection. Use getPageSnapshot to find collection links and clickElement instead.",
      //   parameters: {
      //     collection: {
      //       type: "string",
      //       description: "Collection handle/slug",
      //     },
      //   },
      // },
      
      // addToCart: {
      //   description: "[DISABLED - Use DOM tools instead] Add product to cart. Use getPageSnapshot to find add-to-cart button and clickElement instead.",
      //   parameters: {
      //     productId: {
      //       type: "string",
      //       description: "Product variant ID to add to cart",
      //     },
      //     quantity: {
      //       type: "number",
      //       description: "Quantity to add (default: 1)",
      //       optional: true,
      //     },
      //   },
      // },
      
      // getStoreInfo: {
      //   description: "[DISABLED] Get general store information",
      //   parameters: {
      //     info: {
      //       type: "string",
      //       description: "Type of information requested",
      //       optional: true,
      //     },
      //   },
      // },
      
      getCurrentPageContext: {
        description: "Get current page context including URL and what page the user is viewing",
        parameters: {},
      },
      
      // ============================================================
      // SMART DOM TOOLS - Page Snapshot with Spoken IDs
      // ============================================================
      // Simple, powerful tools for ANY Shopify theme
      // 1. getPageSnapshot - get ALL elements on the page (ALWAYS USE THIS FIRST)
      // 2. Use the spoken ID (e.g., "apple_banana") to interact
      // ============================================================
      
      searchElements: {
        description: `⚠️ DEPRECATED: This tool now redirects to getPageSnapshot(). Always use getPageSnapshot() instead.

[DEPRECATED - USE getPageSnapshot() INSTEAD]
This tool has been replaced with getPageSnapshot() which provides a full page view.
Any call to searchElements will automatically redirect to getPageSnapshot().

The AI should ALWAYS call getPageSnapshot() first to see all available elements,
then use the element IDs from the snapshot to interact with clickElement, typeIntoElement, etc.`,
        parameters: {
          query: {
            type: "string",
            description: "Search query - can be button text, aria-label, class name, placeholder, etc. The fuzzy matcher searches ALL element properties.",
          },
          maxResults: {
            type: "number",
            description: "Maximum elements to return (default: 10)",
            optional: true,
          },
          minSimilarity: {
            type: "number",
            description: "Minimum similarity score 0-1 (default: 0.3). Higher = stricter. Substring matches automatically score 0.9+. Use lower values for fuzzy matching.",
            optional: true,
          },
          requireInteractive: {
            type: "boolean",
            description: "Only return interactive elements (buttons, links, inputs, etc.)",
            optional: true,
          },
          requireVisible: {
            type: "boolean",
            description: "Only return visible elements (default: true)",
            optional: true,
          },
          tag: {
            type: "string",
            description: "Filter by HTML tag (e.g., 'button', 'input', 'a')",
            optional: true,
          },
        },
      },
      
      clickElement: {
        description: "Click an element using its spoken ID from searchElements results. Opens modals, toggles menus, submits forms, clicks links, etc. NOTE: Do NOT show IDs to user unless asked.",
        parameters: {
          id: {
            type: "string",
            description: "Spoken ID from search results (e.g., 'apple_banana'). This is INTERNAL - don't show to user.",
          },
        },
      },
      
      typeIntoElement: {
        description: "Type text into an input using its spoken ID from searchElements results. For search boxes, form inputs, textareas, etc. NOTE: Do NOT show IDs to user unless asked.",
        parameters: {
          id: {
            type: "string",
            description: "Spoken ID from search results (must be an input element). This is INTERNAL - don't show to user.",
          },
          text: {
            type: "string",
            description: "Text to type (e.g., search query, form data)",
          },
        },
      },
      
      pressKey: {
        description: "Press a keyboard key. Use to submit forms (Enter), close modals (Escape), navigate (Tab), etc. Works on currently focused element.",
        parameters: {
          key: {
            type: "string",
            description: "Key to press (e.g., 'Enter', 'Escape', 'Tab', 'ArrowDown')",
          },
        },
      },
      
      focusElement: {
        description: "Focus an element using its spoken ID from searchElements results. Sets keyboard focus. NOTE: Do NOT show IDs to user unless asked.",
        parameters: {
          id: {
            type: "string",
            description: "Spoken ID from search results. This is INTERNAL - don't show to user.",
          },
        },
      },
      
      scrollToElement: {
        description: "Scroll an element into view using its spoken ID from searchElements results. Makes element visible. NOTE: Do NOT show IDs to user unless asked.",
        parameters: {
          id: {
            type: "string",
            description: "Spoken ID from search results. This is INTERNAL - don't show to user.",
          },
        },
      },
      
      getPageSnapshot: {
        description: `⭐ PRIMARY TOOL - ALWAYS USE THIS FIRST ⭐

Get a compressed view of ALL interactive and visible elements on the page.

CRITICAL: You MUST call getPageSnapshot() BEFORE any other DOM interaction.
This is the ONLY way to discover what elements are available on the page.

Returns: Compressed snapshot showing element IDs, tags, text content, placeholders, aria-labels, etc.
Format: id|tag|text|value|placeholder|aria|flags (pipe-separated for compactness)

Once you have the snapshot:
1. Search through the returned elements to find what you need
2. Use the element's spoken ID (e.g., "apple_banana") with clickElement, typeIntoElement, etc.

WORKFLOW:
1. User: "Click the add to cart button"
2. AI: Call getPageSnapshot() → Get all elements
3. AI: Find element with text "add to cart" in snapshot results
4. AI: Use that element's ID with clickElement({id: "apple_banana"})

DO NOT attempt to interact with elements without calling getPageSnapshot first!`,
        parameters: {},
      },
    };
  }
}

