/**
 * Shopify Sitemap Parser
 * Client-side sitemap.xml parser for discovering store routes
 * Handles both sitemap indexes and direct URL sets
 */

/**
 * Sitemap data structure
 */
export interface SitemapData {
  type: "index" | "urlset";
  sitemaps?: SitemapEntry[];
  urls?: UrlEntry[];
}

/**
 * Sitemap entry (for indexes)
 */
export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  type: "sitemap";
}

/**
 * URL entry (for URL sets)
 */
export interface UrlEntry {
  url: string;
  lastModified?: Date;
  priority?: number;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  data: SitemapData;
  timestamp: number;
}

/**
 * Sitemap parser for Shopify stores
 * Parses sitemap.xml to discover all public routes
 * 
 * @example
 * ```ts
 * const parser = new SitemapParser();
 * const sitemapData = await parser.parseSitemap('https://mystore.com');
 * console.log('Found URLs:', sitemapData.urls);
 * ```
 */
export class SitemapParser {
  private cache: Map<string, CacheEntry>;
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.cache = new Map();
  }

  /**
   * Parse sitemap for a given store
   * Automatically handles sitemap indexes and URL sets
   * Results are cached for 15 minutes
   * 
   * @param urlOrBaseUrl - Complete sitemap URL or store base URL (e.g., "https://store.com/sitemap.xml" or "https://store.com")
   * @returns Parsed sitemap data
   */
  async parseSitemap(urlOrBaseUrl: string): Promise<SitemapData> {
    // Determine if this is a complete sitemap URL or just a base URL
    const sitemapUrl = this.normalizeSitemapUrl(urlOrBaseUrl);
    const cacheKey = sitemapUrl;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log("📋 Using cached sitemap data");
      return cached.data;
    }

    try {
      console.log("🔍 Fetching sitemap from:", sitemapUrl);
      const response = await fetch(sitemapUrl, {
        method: "GET",
        headers: {
          Accept: "application/xml, text/xml, */*",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const sitemapData = this.parseXML(xmlText);

      // Cache successful result
      this.cache.set(cacheKey, {
        data: sitemapData,
        timestamp: Date.now(),
      });

      console.log("✅ Sitemap parsed successfully");
      return sitemapData;
    } catch (error) {
      console.error("❌ Sitemap parsing failed:", error);
      throw new Error(
        `Sitemap fetch failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Normalize sitemap URL - handles both complete URLs and base URLs
   * 
   * @param urlOrBaseUrl - Complete sitemap URL or store base URL
   * @returns Normalized sitemap URL
   */
  private normalizeSitemapUrl(urlOrBaseUrl: string): string {
    try {
      const url = new URL(urlOrBaseUrl);
      
      // If the URL already points to an XML file, use it as-is
      // This handles child sitemaps like /sitemap_products_1.xml?from=...&to=...
      if (url.pathname.endsWith('.xml')) {
        return urlOrBaseUrl;
      }
      
      // Otherwise, append /sitemap.xml to the base URL
      // Remove trailing slash if present
      const baseUrl = urlOrBaseUrl.replace(/\/$/, '');
      return `${baseUrl}/sitemap.xml`;
    } catch {
      // If URL parsing fails, assume it's a base URL and append /sitemap.xml
      const baseUrl = urlOrBaseUrl.replace(/\/$/, '');
      return `${baseUrl}/sitemap.xml`;
    }
  }

  /**
   * Parse XML text into structured data
   * Handles both sitemap indexes and URL sets
   * 
   * @param xmlText - Raw XML content
   * @returns Parsed sitemap data
   */
  private parseXML(xmlText: string): SitemapData {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");

    // Check for parsing errors
    const parserError = xmlDoc.querySelector("parsererror");
    if (parserError) {
      throw new Error(`XML parsing error: ${parserError.textContent}`);
    }

    const root = xmlDoc.documentElement;

    if (root.tagName === "sitemapindex") {
      return this.parseSitemapIndex(xmlDoc);
    } else if (root.tagName === "urlset") {
      return this.parseUrlset(xmlDoc);
    } else {
      throw new Error(`Unexpected root element: ${root.tagName}`);
    }
  }

  /**
   * Parse sitemap index (contains links to child sitemaps)
   * 
   * @param xmlDoc - Parsed XML document
   * @returns Index data with child sitemap references
   */
  private parseSitemapIndex(xmlDoc: Document): SitemapData {
    const sitemaps: SitemapEntry[] = [];
    const sitemapElements = xmlDoc.querySelectorAll("sitemap");

    sitemapElements.forEach((sitemap) => {
      const loc = sitemap.querySelector("loc")?.textContent;
      const lastmod = sitemap.querySelector("lastmod")?.textContent;

      if (loc) {
        // DOMParser automatically decodes HTML entities (&amp; -> &)
        // but we'll trim whitespace to be safe
        sitemaps.push({
          url: loc.trim(),
          lastModified: lastmod ? new Date(lastmod) : undefined,
          type: "sitemap",
        });
      }
    });

    return { type: "index", sitemaps };
  }

  /**
   * Parse URL set (direct list of URLs)
   * 
   * @param xmlDoc - Parsed XML document
   * @returns URL set data with all URLs
   */
  private parseUrlset(xmlDoc: Document): SitemapData {
    const urls: UrlEntry[] = [];
    const urlElements = xmlDoc.querySelectorAll("url");

    urlElements.forEach((url) => {
      const loc = url.querySelector("loc")?.textContent;
      const lastmod = url.querySelector("lastmod")?.textContent;
      const priority = url.querySelector("priority")?.textContent;

      if (loc) {
        // DOMParser automatically decodes HTML entities (&amp; -> &)
        // but we'll trim whitespace to be safe
        urls.push({
          url: loc.trim(),
          lastModified: lastmod ? new Date(lastmod) : undefined,
          priority: priority ? parseFloat(priority) : undefined,
        });
      }
    });

    return { type: "urlset", urls };
  }

  /**
   * Get cache statistics for debugging
   * 
   * @returns Cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clear the sitemap cache
   * Useful for forcing a refresh of sitemap data
   */
  clearCache(): void {
    this.cache.clear();
    console.log("🧹 Sitemap cache cleared");
  }
}

