/**
 * Shopify Route Generator
 * Extends generic route generator with Shopify-specific URL categorization
 */

import { GenericRouteGenerator, GenericUrlCategorizer } from '../generic/routes';
import type { IUrlCategorizer, UrlCategory } from '../generic/routes';
import type { VowelRoute } from '../../types';

/**
 * Shopify URL Categorizer
 * Recognizes Shopify-specific URL patterns (products, collections, etc.)
 */
export class ShopifyUrlCategorizer extends GenericUrlCategorizer implements IUrlCategorizer {
  /**
   * Categorize a URL based on Shopify patterns
   * Falls back to generic categorization for non-Shopify URLs
   * 
   * @param url - URL to categorize
   * @returns Category information
   */
  categorizeUrl(url: string): UrlCategory {
    let pathname: string;
    
    try {
      pathname = new URL(url).pathname;
    } catch (error) {
      console.warn(`⚠️ Failed to parse URL ${url}, treating as pathname`);
      pathname = url.startsWith('/') ? url : `/${url}`;
    }

    // Shopify-specific patterns

    // Product pages
    if (pathname.match(/^\/products\/[^\/]+$/)) {
      return {
        type: "product",
        category: "products",
        description: this.extractProductDescription(pathname),
        priority: "high",
      };
    }

    // Collection pages
    if (pathname.match(/^\/collections\/[^\/]+$/)) {
      return {
        type: "collection",
        category: "collections",
        description: this.extractCollectionDescription(pathname),
        priority: "high",
      };
    }

    // Static pages
    if (pathname.match(/^\/pages\/[^\/]+$/)) {
      return {
        type: "page",
        category: "pages",
        description: this.extractShopifyPageDescription(pathname),
        priority: "medium",
      };
    }

    // Blog posts
    if (pathname.match(/^\/blogs\/[^\/]+\/[^\/]+$/)) {
      return {
        type: "blog",
        category: "blogs",
        description: this.extractShopifyBlogDescription(pathname),
        priority: "medium",
      };
    }

    // Shopify-specific common pages
    const shopifyPages = this.getShopifyCommonPages();
    if (shopifyPages[pathname]) {
      return {
        type: shopifyPages[pathname].type,
        category: shopifyPages[pathname].type,
        description: shopifyPages[pathname].description,
        priority: shopifyPages[pathname].priority,
      };
    }

    // Fall back to generic categorization
    return super.categorizeUrl(url);
  }

  /**
   * Get Shopify-specific common pages
   * 
   * @returns Common Shopify pages mapping
   */
  protected getShopifyCommonPages(): Record<string, { type: string; description: string; priority: string }> {
    return {
      "/": { type: "home", description: "Store homepage", priority: "highest" },
      "/products": { type: "products", description: "Browse all products", priority: "high" },
      "/collections": { type: "collections", description: "Browse all collections", priority: "high" },
      "/cart": { type: "cart", description: "Shopping cart", priority: "high" },
      "/search": { type: "search", description: "Search products", priority: "medium" },
      "/account": { type: "account", description: "Customer account", priority: "medium" },
      "/account/login": { type: "account", description: "Customer login", priority: "medium" },
      "/account/register": { type: "account", description: "Customer registration", priority: "medium" },
    };
  }

  /**
   * Extract product description from URL path
   * 
   * @param pathname - URL path
   * @returns Human-readable description
   */
  private extractProductDescription(pathname: string): string {
    const handle = pathname.split("/").pop();
    return `View ${handle?.replace(/-/g, " ")} product`;
  }

  /**
   * Extract collection description from URL path
   * 
   * @param pathname - URL path
   * @returns Human-readable description
   */
  private extractCollectionDescription(pathname: string): string {
    const handle = pathname.split("/").pop();
    return `Browse ${handle?.replace(/-/g, " ")} collection`;
  }

  /**
   * Extract Shopify page description from URL path
   * 
   * @param pathname - URL path
   * @returns Human-readable description
   */
  private extractShopifyPageDescription(pathname: string): string {
    const handle = pathname.split("/").pop();
    return `${handle?.replace(/-/g, " ")} page`;
  }

  /**
   * Extract Shopify blog post description from URL path
   * 
   * @param pathname - URL path
   * @returns Human-readable description
   */
  private extractShopifyBlogDescription(pathname: string): string {
    const parts = pathname.split("/");
    const postHandle = parts[3];
    return `${postHandle?.replace(/-/g, " ")} blog post`;
  }
}

/**
 * Shopify Route Generator
 * Extends generic route generator with Shopify-specific features
 * 
 * @example
 * ```ts
 * const generator = new ShopifyRouteGenerator();
 * const routes = await generator.generateRoutes('https://mystore.com');
 * console.log(`Generated ${routes.length} routes`);
 * ```
 */
export class ShopifyRouteGenerator extends GenericRouteGenerator {
  constructor() {
    super(new ShopifyUrlCategorizer());
  }

  /**
   * Get Shopify-specific hardcoded routes
   * These routes are guaranteed to be included regardless of sitemap parsing
   * 
   * @returns Hardcoded Shopify routes
   */
  protected getHardcodedRoutes(): VowelRoute[] {
    // Note: In production, you might want to make this configurable
    // or remove the hardcoded store URL
    return [];
  }

  /**
   * Get Shopify-specific fallback routes
   * Used when sitemap parsing fails
   * 
   * @returns Basic Shopify routes
   */
  protected getFallbackRoutes(): VowelRoute[] {
    return [
      {
        path: "/",
        description: "Store homepage",
        metadata: { type: "home", priority: "highest" },
      },
      {
        path: "/products",
        description: "Browse all products",
        metadata: { type: "products", priority: "high" },
      },
      {
        path: "/collections",
        description: "Browse collections",
        metadata: { type: "collections", priority: "high" },
      },
      {
        path: "/cart",
        description: "Shopping cart",
        metadata: { type: "cart", priority: "high" },
      },
      {
        path: "/search",
        description: "Search products",
        metadata: { type: "search", priority: "medium" },
      },
    ];
  }
}

