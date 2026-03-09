/**
 * Generic Platform Types
 * Shared types for controlled navigation platform adapter
 */

import type { VowelRoute } from "../../types";

/**
 * Options for controlled navigation initialization
 */
export interface ControlledNavigationOptions {
  /**
   * Base URL of the website (e.g., "https://example.com")
   * Defaults to window.location.origin
   */
  storeUrl?: string;
  
  /**
   * Skip sitemap discovery and use fallback routes only
   * @default false
   */
  useFallbackRoutes?: boolean;
  
  /**
   * BroadcastChannel name for cross-tab communication
   * @default 'vowel-navigation'
   */
  channelName?: string;
  
  /**
   * Custom config to send to controlled tab
   */
  config?: Record<string, any>;
}

/**
 * Result of controlled navigation initialization
 */
export interface ControlledNavigationResult {
  /**
   * Router adapter instance
   */
  router: any; // RouterAdapter type
  
  /**
   * Discovered or fallback routes
   */
  routes: VowelRoute[];
}

/**
 * URL category information
 */
export interface UrlCategory {
  /**
   * Type of URL (e.g., "home", "blog", "page")
   */
  type: string;
  
  /**
   * Category group (e.g., "content", "info")
   */
  category: string;
  
  /**
   * Human-readable description for voice navigation
   */
  description: string;
  
  /**
   * Priority level for route sorting
   */
  priority: "highest" | "high" | "medium" | "low";
}

/**
 * URL categorizer interface
 * Implement this to provide custom URL categorization logic
 */
export interface IUrlCategorizer {
  /**
   * Categorize a URL based on its pattern
   * 
   * @param url - Full URL or pathname to categorize
   * @returns Category information
   */
  categorizeUrl(url: string): UrlCategory;
}

