/**
 * Generic Route Generator
 * Generates voice-friendly routes from sitemap data
 * Platform-agnostic base that can be extended for specific platforms
 */

import type { VowelRoute } from "../../types";
import { SitemapParser, type SitemapData, type UrlEntry } from "./sitemap";

/**
 * URL category information
 */
export interface UrlCategory {
  type: string;
  category: string;
  description: string;
  priority: string;
}

/**
 * URL categorizer interface
 * Implement this to provide platform-specific URL categorization
 */
export interface IUrlCategorizer {
  categorizeUrl(url: string): UrlCategory;
}

/**
 * Generic route generator
 * Converts sitemap data into voice-navigable routes with natural language descriptions
 * 
 * @example
 * ```ts
 * const generator = new GenericRouteGenerator();
 * const routes = await generator.generateRoutes('https://example.com');
 * console.log(`Generated ${routes.length} routes`);
 * ```
 */
export class GenericRouteGenerator {
  protected parser: SitemapParser;
  protected categorizer: IUrlCategorizer;

  constructor(categorizer?: IUrlCategorizer) {
    this.parser = new SitemapParser();
    this.categorizer = categorizer || new GenericUrlCategorizer();
  }

  /**
   * Generate routes from sitemap
   * Automatically discovers, categorizes, and prioritizes routes
   * 
   * @param baseUrl - Base URL (e.g., "https://example.com")
   * @returns Array of voice-friendly routes
   */
  async generateRoutes(baseUrl: string): Promise<VowelRoute[]> {
    // Get hardcoded routes (can be overridden by subclasses)
    const hardcodedRoutes = this.getHardcodedRoutes();
    
    try {
      const sitemapData = await this.parser.parseSitemap(baseUrl);
      const discoveredRoutes = await this.processSitemapData(sitemapData, baseUrl);
      
      // Combine hardcoded routes with discovered routes
      return [...hardcodedRoutes, ...discoveredRoutes];
    } catch (error) {
      console.error("Route generation failed:", error);
      
      // Return hardcoded + fallback routes
      return [...hardcodedRoutes, ...this.getFallbackRoutes()];
    }
  }

  /**
   * Process sitemap data into routes
   * Handles both sitemap indexes and direct URL sets
   * Fault-tolerant: continues processing even if individual child sitemaps fail
   * 
   * @param sitemapData - Parsed sitemap data
   * @param baseUrl - Base URL
   * @returns Generated routes
   */
  protected async processSitemapData(
    sitemapData: SitemapData,
    baseUrl: string
  ): Promise<VowelRoute[]> {
    const routes: VowelRoute[] = [];

    if (sitemapData.type === "index") {
      // Process sitemap index - fetch child sitemaps
      if (sitemapData.sitemaps && sitemapData.sitemaps.length > 0) {
        console.log(`📚 Processing ${sitemapData.sitemaps.length} child sitemaps...`);
        
        let successCount = 0;
        let failCount = 0;

        for (const sitemap of sitemapData.sitemaps) {
          try {
            console.log(`🔗 Fetching child sitemap: ${sitemap.url}`);
            const childSitemapData = await this.parser.parseSitemap(
              sitemap.url
            );
            if (childSitemapData.type === "urlset" && childSitemapData.urls) {
              const childRoutes = this.processUrlset(
                childSitemapData.urls,
                baseUrl
              );
              routes.push(...childRoutes);
              successCount++;
              console.log(`✅ Processed ${childRoutes.length} routes from ${sitemap.url}`);
            } else {
              console.warn(`⚠️ Unexpected sitemap type for ${sitemap.url}: ${childSitemapData.type}`);
            }
          } catch (error) {
            failCount++;
            console.warn(
              `⚠️ Failed to process child sitemap ${sitemap.url}:`,
              error instanceof Error ? error.message : String(error)
            );
            // Continue processing other sitemaps - fault-tolerant behavior
          }
        }

        console.log(
          `📊 Sitemap processing complete: ${successCount} succeeded, ${failCount} failed, ${routes.length} total routes`
        );
      }
    } else if (sitemapData.type === "urlset" && sitemapData.urls) {
      // Process direct URL set
      try {
        const urlsetRoutes = this.processUrlset(sitemapData.urls, baseUrl);
        routes.push(...urlsetRoutes);
        console.log(`✅ Processed ${urlsetRoutes.length} routes from direct URL set`);
      } catch (error) {
        console.error("❌ Failed to process URL set:", error);
        // Don't throw - return empty routes and let fallback handle it
      }
    }

    // If no routes were found, log a warning
    if (routes.length === 0) {
      console.warn("⚠️ No routes were extracted from sitemap data");
    }

    // Sort by priority and limit results for performance
    return routes
      .sort((a, b) => this.comparePriority(a, b))
      .slice(0, 200); // Limit to prevent performance issues
  }

  /**
   * Process URL set into categorized routes
   * Converts raw URLs into voice-friendly routes with descriptions
   * Fault-tolerant: skips malformed URLs and continues processing
   * 
   * @param urls - URLs from sitemap
   * @param baseUrl - Base URL
   * @returns Categorized routes
   */
  protected processUrlset(urls: UrlEntry[], baseUrl: string): VowelRoute[] {
    const routes: VowelRoute[] = [];
    
    for (const url of urls) {
      try {
        const category = this.categorizer.categorizeUrl(url.url);
        const relativePath = this.getRelativePath(url.url, baseUrl);

        // Build metadata object with only defined values
        const metadata: Record<string, any> = {
          type: category.type,
          category: category.category,
          priority: category.priority,
          originalUrl: url.url,
        };
        
        // Only include optional fields if they have values
        if (url.priority !== undefined) {
          metadata.sitemapPriority = url.priority;
        }

        routes.push({
          path: relativePath,
          description: category.description,
          metadata,
        });
      } catch (error) {
        console.warn(
          `⚠️ Failed to process URL ${url.url}:`,
          error instanceof Error ? error.message : String(error)
        );
        // Skip this URL and continue with others - fault-tolerant behavior
      }
    }
    
    return routes;
  }

  /**
   * Convert absolute URL to relative path
   * 
   * @param absoluteUrl - Absolute URL
   * @param baseUrl - Base URL to remove
   * @returns Relative path
   */
  protected getRelativePath(absoluteUrl: string, baseUrl: string): string {
    try {
      return new URL(absoluteUrl).pathname;
    } catch {
      return absoluteUrl.replace(baseUrl, "");
    }
  }

  /**
   * Compare route priorities for sorting
   * 
   * @param a - First route
   * @param b - Second route
   * @returns Comparison result
   */
  protected comparePriority(a: VowelRoute, b: VowelRoute): number {
    const priorityOrder: Record<string, number> = {
      highest: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    const aPriority = priorityOrder[a.metadata?.priority || "low"] || 0;
    const bPriority = priorityOrder[b.metadata?.priority || "low"] || 0;
    return bPriority - aPriority;
  }

  /**
   * Get hardcoded routes that should always be available
   * Override in subclasses to provide platform-specific hardcoded routes
   * 
   * @returns Hardcoded routes
   */
  protected getHardcodedRoutes(): VowelRoute[] {
    return [];
  }

  /**
   * Get fallback routes when sitemap parsing fails
   * Override in subclasses to provide platform-specific fallback routes
   * 
   * @returns Basic fallback routes
   */
  protected getFallbackRoutes(): VowelRoute[] {
    return [
      {
        path: "/",
        description: "Homepage",
        metadata: { type: "home", priority: "highest" },
      },
    ];
  }
}

/**
 * Generic URL categorizer
 * Provides basic categorization for common URL patterns
 * Extend this class to add platform-specific categorization
 */
export class GenericUrlCategorizer implements IUrlCategorizer {
  /**
   * Categorize a URL based on its path pattern
   * Recognizes common URL patterns and generates natural descriptions
   * Fault-tolerant: handles malformed URLs gracefully
   * 
   * @param url - URL to categorize
   * @returns Category information with type, description, and priority
   */
  categorizeUrl(url: string): UrlCategory {
    let pathname: string;
    
    try {
      pathname = new URL(url).pathname;
    } catch (error) {
      console.warn(`⚠️ Failed to parse URL ${url}, treating as pathname`);
      // If URL parsing fails, treat the input as a pathname directly
      pathname = url.startsWith('/') ? url : `/${url}`;
    }

    // Common pages that exist on most websites
    const commonPages = this.getCommonPages();
    if (commonPages[pathname]) {
      return {
        type: commonPages[pathname].type,
        category: commonPages[pathname].type,
        description: commonPages[pathname].description,
        priority: commonPages[pathname].priority,
      };
    }

    // Blog patterns
    if (pathname.match(/^\/blog\/?/) || pathname.match(/^\/posts?\//)) {
      return {
        type: "blog",
        category: "content",
        description: this.extractBlogDescription(pathname),
        priority: "medium",
      };
    }

    // About/Contact/Static pages
    if (pathname.match(/^\/(about|contact|privacy|terms|faq)/)) {
      return {
        type: "page",
        category: "info",
        description: this.extractPageDescription(pathname),
        priority: "medium",
      };
    }

    // Default categorization
    return {
      type: "other",
      category: "other",
      description: `Navigate to ${pathname}`,
      priority: "low",
    };
  }

  /**
   * Get common pages mapping
   * Override in subclasses to add platform-specific pages
   * 
   * @returns Common pages mapping
   */
  protected getCommonPages(): Record<string, { type: string; description: string; priority: string }> {
    return {
      "/": { type: "home", description: "Homepage", priority: "highest" },
      "/about": { type: "about", description: "About page", priority: "medium" },
      "/contact": { type: "contact", description: "Contact page", priority: "medium" },
      "/blog": { type: "blog", description: "Blog", priority: "high" },
      "/search": { type: "search", description: "Search", priority: "medium" },
    };
  }

  /**
   * Extract page description from URL path
   * Converts path to human-readable format
   * 
   * @param pathname - URL path
   * @returns Human-readable description
   */
  protected extractPageDescription(pathname: string): string {
    const parts = pathname.split("/").filter(Boolean);
    const lastPart = parts[parts.length - 1] || "page";
    return `${lastPart.replace(/-/g, " ")} page`;
  }

  /**
   * Extract blog description from URL path
   * Converts path to human-readable format
   * 
   * @param pathname - URL path
   * @returns Human-readable description
   */
  protected extractBlogDescription(pathname: string): string {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length > 1) {
      const postSlug = parts[parts.length - 1];
      return `${postSlug.replace(/-/g, " ")} blog post`;
    }
    return "Blog";
  }
}

