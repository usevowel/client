# Generic Controlled Navigation Platform Adapter

A platform-agnostic navigation adapter that works with any website. Uses sitemap discovery, cross-tab communication, and AI-powered DOM interaction to enable voice-controlled navigation on any site.

## Features

- **🗺️ Sitemap Discovery**: Automatically discovers routes from `sitemap.xml`
- **🔀 Cross-Tab Navigation**: Controls a separate browser tab for navigation while keeping the voice agent active
- **🤖 AI-Powered DOM Tools**: Theme-agnostic element search and interaction using Playwright's AI snapshot algorithm
- **🎙️ Voice Agent Preservation**: Keeps voice agent running on the main tab while navigating in a controlled tab
- **🔍 Fuzzy Search**: Levenshtein distance-based element search with spoken-word IDs (e.g., "apple_banana")
- **📸 Smart Snapshots**: Generates hierarchical ARIA tree views optimized for AI comprehension

## Installation

```bash
npm install @vowel.to/client
# or
bun add @vowel.to/client
```

## Quick Start

### Basic Setup

```typescript
import { initializeControlledNavigation } from '@vowel.to/client/platforms/generic';
import { Vowel } from '@vowel.to/client';

// Initialize controlled navigation
const { router, routes } = await initializeControlledNavigation({
  storeUrl: 'https://example.com'
});

// Create Vowel client
const vowel = new Vowel({
  appId: 'your-app-id',
  router,
  routes
});

// Start the voice agent
vowel.start();
```

### Advanced Setup with Custom Categorization

```typescript
import { 
  ControlledNavigationRouter,
  GenericRouteGenerator, 
  GenericUrlCategorizer 
} from '@vowel.to/client/platforms/generic';
import type { UrlCategory } from '@vowel.to/client/platforms/generic';

// Create custom URL categorizer
class MyCustomCategorizer extends GenericUrlCategorizer {
  categorizeUrl(url: string): UrlCategory {
    const pathname = new URL(url).pathname;
    
    // Custom logic for your site
    if (pathname.startsWith('/blog/')) {
      return {
        type: 'blog',
        category: 'content',
        description: 'Blog post',
        priority: 'medium'
      };
    }
    
    if (pathname.startsWith('/docs/')) {
      return {
        type: 'documentation',
        category: 'content',
        description: 'Documentation page',
        priority: 'high'
      };
    }
    
    // Fall back to generic categorization
    return super.categorizeUrl(url);
  }
}

// Use custom categorizer
const router = new ControlledNavigationRouter();
const generator = new GenericRouteGenerator(new MyCustomCategorizer());
const routes = await generator.generateRoutes('https://example.com');
router.setRoutes(routes);
```

## How It Works

### 1. Sitemap Parsing

The adapter fetches and parses your website's `sitemap.xml`:

```typescript
import { SitemapParser } from '@vowel.to/client/platforms/generic';

const parser = new SitemapParser();
const sitemapData = await parser.parseSitemap('https://example.com');
```

Supports:
- Sitemap indexes (links to multiple sitemaps)
- Direct URL sets
- Gzipped sitemaps
- Nested sitemaps

### 2. Route Generation

URLs are converted to voice-friendly routes with natural language descriptions:

```typescript
import { GenericRouteGenerator } from '@vowel.to/client/platforms/generic';

const generator = new GenericRouteGenerator();
const routes = await generator.generateRoutes('https://example.com');

// Example output:
// [
//   { path: '/', description: 'Homepage', metadata: { type: 'home', priority: 'highest' } },
//   { path: '/about', description: 'About page', metadata: { type: 'about', priority: 'medium' } },
//   { path: '/blog/my-post', description: 'My post blog post', metadata: { type: 'blog', priority: 'medium' } }
// ]
```

### 3. Cross-Tab Control

The router uses `BroadcastChannel` to control a separate tab:

```typescript
import { ControlledNavigationRouter } from '@vowel.to/client/platforms/generic';

const router = new ControlledNavigationRouter({
  channelName: 'my-app-navigation', // Optional custom channel name
  config: { features: ['navigation', 'search'] } // Optional config
});

// Navigate (opens/controls separate tab)
await router.navigate('/about');
```

**How it works:**
1. Main tab (with voice agent) sends navigation commands via BroadcastChannel
2. Controlled tab (opened automatically) listens for commands
3. Controlled tab navigates while main tab keeps voice agent running
4. Shows "Controlled by Vowel" banner in controlled tab

### 4. DOM Interaction

AI can search for and interact with page elements:

```typescript
import { FuzzyDOMSearcher, DOMManipulator } from '@vowel.to/client/platforms/generic';

// Initialize DOM tools
const searcher = new FuzzyDOMSearcher();
const manipulator = new DOMManipulator({
  getElementById: (id) => searcher.getElementById(id)
});

// Search for elements (fuzzy matching)
const results = searcher.search('search button', {
  maxResults: 5,
  requireVisible: true
});

// Interact with elements using spoken IDs
await manipulator.clickElement({ id: results.elements[0].id });
await manipulator.typeIntoElement({ id: 'apple_banana', text: 'hello' });
await manipulator.pressKey({ key: 'Enter' });
```

**Features:**
- Fuzzy search with Levenshtein distance
- Searches text, classes, IDs, ARIA labels, placeholders, values
- Spoken-word IDs (e.g., "apple_banana") for easy reference
- Smart clicking (finds clickable parents if needed)
- Visual feedback for typing

### 5. AI Snapshots

Generate AI-readable page snapshots using Playwright's algorithm:

```typescript
import { snapshotForAI, generateAriaTree } from '@vowel.to/client/platforms/generic';

// Get snapshot
const snapshot = snapshotForAI(document.body);

// Or get structured tree
const ariaTree = generateAriaTree(document.body, { mode: 'ai' });
```

Returns a hierarchical ARIA tree in YAML format:
```yaml
- button "Search" [ref=apple_banana] [cursor=pointer]
- textbox "Search products" [ref=cherry_date]
- link "Home" [ref=elderberry_fig]
```

## API Reference

### `initializeControlledNavigation(options)`

Helper function to set up everything at once.

**Parameters:**
- `options.storeUrl` (string, optional): Base URL of the website
- `options.useFallbackRoutes` (boolean, optional): Skip sitemap discovery
- `options.channelName` (string, optional): Custom BroadcastChannel name
- `options.config` (object, optional): Custom config for controlled tab

**Returns:** `Promise<{ router, routes }>`

### `ControlledNavigationRouter`

Router adapter for cross-tab navigation.

**Methods:**
- `navigate(path: string): Promise<void>` - Navigate to a path
- `getCurrentPath(): string` - Get current path
- `getRoutes(): VowelRoute[]` - Get available routes
- `setRoutes(routes: VowelRoute[]): void` - Set routes
- `isControlledTabConnected(): boolean` - Check connection status

### `GenericRouteGenerator`

Generates routes from sitemap data.

**Methods:**
- `generateRoutes(baseUrl: string): Promise<VowelRoute[]>` - Generate routes
- `getHardcodedRoutes(): VowelRoute[]` - Override for custom hardcoded routes
- `getFallbackRoutes(): VowelRoute[]` - Override for custom fallback routes

### `GenericUrlCategorizer`

Categorizes URLs into types.

**Methods:**
- `categorizeUrl(url: string): UrlCategory` - Categorize a URL
- `getCommonPages()` - Override to add custom common pages

### `SitemapParser`

Parses sitemap.xml files.

**Methods:**
- `parseSitemap(url: string): Promise<SitemapData>` - Parse sitemap
- `clearCache(): void` - Clear sitemap cache

### `FuzzyDOMSearcher`

Searches for DOM elements using fuzzy matching.

**Methods:**
- `search(query: string, options?): DOMSearchResults` - Search for elements
- `getElementById(id: string): Element | null` - Get element by spoken ID
- `getCompressedPageSnapshot(): string` - Get AI snapshot
- `clearStore(): void` - Clear element store

### `DOMManipulator`

Interacts with DOM elements.

**Methods:**
- `clickElement({ id }): Promise<Result>` - Click element
- `typeIntoElement({ id, text }): Promise<Result>` - Type text
- `pressKey({ key }): Promise<Result>` - Press keyboard key
- `focusElement({ id }): Promise<Result>` - Focus element
- `scrollToElement({ id }): Promise<Result>` - Scroll to element

### `initializeNavigationListener()`

Initializes the navigation listener in the controlled tab. This should be called in your website's main script.

```typescript
import { initializeNavigationListener } from '@vowel.to/client/platforms/generic';

// Call on page load
initializeNavigationListener();
```

## Platform-Specific Adapters

This generic adapter is designed to be extended for specific platforms:

### Shopify

```typescript
import { initializeShopifyIntegration } from '@vowel.to/client/platforms/shopify';

const { router, routes, actionHandler } = await initializeShopifyIntegration({
  storeUrl: 'https://mystore.com'
});
```

Adds Shopify-specific features:
- Product/collection URL patterns
- Cart operations
- Shopify-specific actions

### Create Your Own

Extend the generic adapter for your platform:

```typescript
import { 
  ControlledNavigationRouter,
  GenericRouteGenerator,
  GenericUrlCategorizer 
} from '@vowel.to/client/platforms/generic';

// Custom router (if needed)
export class MyPlatformRouter extends ControlledNavigationRouter {
  constructor() {
    super({ channelName: 'my-platform-nav' });
  }
}

// Custom URL categorizer
export class MyPlatformCategorizer extends GenericUrlCategorizer {
  categorizeUrl(url: string): UrlCategory {
    // Your platform-specific logic
    return super.categorizeUrl(url);
  }
}

// Custom route generator
export class MyPlatformRouteGenerator extends GenericRouteGenerator {
  constructor() {
    super(new MyPlatformCategorizer());
  }
  
  protected getFallbackRoutes(): VowelRoute[] {
    // Your platform-specific fallback routes
    return [...];
  }
}
```

## Configuration

### Router Options

```typescript
const router = new ControlledNavigationRouter({
  channelName: 'custom-channel',  // Default: 'vowel-navigation'
  config: {
    version: '1.0.0',
    features: ['navigation', 'search'],
    customData: { ... }
  }
});
```

### Route Generation Options

```typescript
const routes = await generator.generateRoutes(baseUrl);
// Routes are automatically:
// - Categorized by URL pattern
// - Sorted by priority
// - Limited to 200 for performance
```

### DOM Search Options

```typescript
const results = searcher.search('search button', {
  maxDistance: 3,           // Levenshtein distance threshold
  minSimilarity: 0.6,       // Minimum similarity score (0-1)
  maxResults: 10,           // Maximum results to return
  searchClasses: true,      // Search in class names
  searchIds: true,          // Search in element IDs
  searchText: true,         // Search in text content
  searchPlaceholders: true, // Search in placeholders
  searchAriaLabels: true,   // Search in ARIA labels
  searchValues: true,       // Search in input values
  requireInteractive: false,// Only return interactive elements
  requireVisible: true,     // Only return visible elements
  tag: 'button'            // Filter by tag name
});
```

## Browser Compatibility

- **BroadcastChannel**: Chrome 54+, Firefox 38+, Safari 15.4+
- **Modern browsers** with ES6+ support
- **No IE11 support**

## Troubleshooting

### Controlled tab not connecting

1. Check browser console for errors
2. Verify BroadcastChannel is supported
3. Ensure navigation listener is initialized in controlled tab
4. Check that query parameter `?vowel_controlled=true` is present

### Sitemap parsing fails

1. Verify sitemap.xml exists at `/sitemap.xml`
2. Check CORS headers allow fetching sitemap
3. Use `useFallbackRoutes: true` to skip sitemap discovery
4. Provide custom routes via `router.setRoutes()`

### DOM search not finding elements

1. Lower `minSimilarity` threshold
2. Increase `maxDistance` for fuzzier matching
3. Use `getCompressedPageSnapshot()` to see all elements
4. Try more specific search terms

## Examples

See the [examples directory](../../examples/) for complete working examples:

- Basic setup
- Custom categorization
- Platform-specific extensions
- DOM interaction patterns

## License

MIT

## Contributing

Contributions welcome! Please read the [contributing guidelines](../../../../../CONTRIBUTING.md) first.

