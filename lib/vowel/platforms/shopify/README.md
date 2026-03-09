# Shopify Platform Adapter

Shopify-specific platform adapter that extends the [generic controlled navigation adapter](../generic/README.md) with Shopify-specific features.

## Features

All features from the [generic adapter](../generic/README.md), plus:

- **🛍️ Shopify URL Patterns**: Recognizes `/products/`, `/collections/`, `/pages/`, `/blogs/` patterns
- **🛒 Cart Operations**: Add to cart, update quantity, remove from cart
- **📦 Product Search**: Search products on current page
- **🏪 Store Context**: Extract store information from DOM
- **🎯 Shopify-Specific Actions**: Pre-built actions for common Shopify operations

## Installation

```bash
npm install @vowel.to/client
# or
bun add @vowel.to/client
```

## Quick Start

```typescript
import { initializeShopifyIntegration } from '@vowel.to/client/platforms/shopify';
import { Vowel } from '@vowel.to/client';

// Initialize Shopify integration
const { router, routes, actionHandler } = await initializeShopifyIntegration({
  storeUrl: 'https://mystore.com'
});

// Create Vowel client
const vowel = new Vowel({
  appId: 'your-app-id',
  router,
  routes
});

// Register Shopify actions
const definitions = actionHandler.getActionDefinitions();
Object.entries(definitions).forEach(([name, definition]) => {
  vowel.registerAction(
    name, 
    definition, 
    (actionHandler as any)[name].bind(actionHandler)
  );
});

// Start the voice agent
vowel.start();
```

## Shopify-Specific Features

### URL Categorization

The Shopify adapter recognizes these URL patterns:

- `/products/:handle` - Product pages
- `/collections/:handle` - Collection pages
- `/pages/:handle` - Static pages
- `/blogs/:blog/:post` - Blog posts
- `/cart` - Shopping cart
- `/search` - Search page
- `/account/*` - Customer account pages

### Actions

#### Search Products

```typescript
await actionHandler.searchProducts({
  query: 'blue dress',
  limit: 10
});
```

#### Navigate to Product

```typescript
await actionHandler.navigateToProduct({
  product: 'blue-dress'
});
```

#### Add to Cart

```typescript
await actionHandler.addToCart({
  productId: '123456789',
  quantity: 1
});
```

#### Get Store Info

```typescript
const storeInfo = await actionHandler.getStoreInfo();
```

#### Get Current Page Context

```typescript
const context = await actionHandler.getCurrentPageContext();
// Returns: { url, pathname, title, type, products, collections }
```

### Store Manager

The `ShopifyStoreManager` class provides low-level access to store data:

```typescript
import { ShopifyStoreManager } from '@vowel.to/client/platforms/shopify';

const manager = new ShopifyStoreManager();

// Get products from current page
const products = await manager.getProducts();

// Add to cart via Shopify API
await manager.addToCart('product-id', 1);
```

## Architecture

The Shopify adapter extends the generic adapter:

```
Generic Adapter (Base)
├── ControlledNavigationRouter
├── GenericRouteGenerator
├── GenericUrlCategorizer
├── DOM Tools (search, manipulation, snapshots)
└── Navigation Listener

Shopify Adapter (Extension)
├── ShopifyRouterAdapter extends ControlledNavigationRouter
├── ShopifyRouteGenerator extends GenericRouteGenerator
├── ShopifyUrlCategorizer extends GenericUrlCategorizer
└── ShopifyActionHandler (Shopify-specific)
    └── ShopifyStoreManager (Shopify-specific)
```

### What's Inherited from Generic

- Cross-tab navigation via BroadcastChannel
- Sitemap parsing and route discovery
- DOM search with fuzzy matching
- DOM manipulation (click, type, etc.)
- AI-powered page snapshots
- Navigation listener

### What's Shopify-Specific

- URL categorization for Shopify patterns
- Cart operations via Shopify AJAX API
- Product/collection extraction from DOM
- Shopify-specific action handlers
- Store context extraction

## API Reference

### `initializeShopifyIntegration(config)`

**Parameters:**
- `config.storeUrl` (string, optional): Shopify store URL
- `config.useFallbackRoutes` (boolean, optional): Skip sitemap discovery

**Returns:** `Promise<{ router, routes, actionHandler }>`

### `ShopifyRouterAdapter`

Extends `ControlledNavigationRouter` with Shopify-specific config.

**Methods:** Same as `ControlledNavigationRouter`

### `ShopifyRouteGenerator`

Extends `GenericRouteGenerator` with Shopify URL patterns.

**Methods:** Same as `GenericRouteGenerator`

### `ShopifyUrlCategorizer`

Extends `GenericUrlCategorizer` with Shopify-specific categorization.

**Methods:**
- `categorizeUrl(url: string): UrlCategory` - Categorizes Shopify URLs

### `ShopifyActionHandler`

Handles Shopify-specific voice actions.

**Methods:**
- `searchProducts(params)` - Search products
- `navigateToProduct(params)` - Navigate to product
- `navigateToCollection(params)` - Navigate to collection
- `addToCart(params)` - Add product to cart
- `getStoreInfo()` - Get store information
- `getCurrentPageContext()` - Get current page context
- `getActionDefinitions()` - Get all action definitions

### `ShopifyStoreManager`

Low-level Shopify store operations.

**Methods:**
- `getProducts()` - Extract products from current page
- `addToCart(productId, quantity)` - Add to cart via API

## Examples

### Basic Shopify Store

```typescript
import { initializeShopifyIntegration } from '@vowel.to/client/platforms/shopify';
import { Vowel } from '@vowel.to/client';

const { router, routes, actionHandler } = await initializeShopifyIntegration({
  storeUrl: 'https://mystore.myshopify.com'
});

const vowel = new Vowel({
  appId: 'my-app-id',
  router,
  routes
});

// Register actions
const definitions = actionHandler.getActionDefinitions();
Object.entries(definitions).forEach(([name, definition]) => {
  vowel.registerAction(name, definition, (actionHandler as any)[name].bind(actionHandler));
});

vowel.start();
```

### Custom Shopify Routes

```typescript
import { ShopifyRouteGenerator } from '@vowel.to/client/platforms/shopify';

class CustomShopifyRouteGenerator extends ShopifyRouteGenerator {
  protected getHardcodedRoutes() {
    return [
      {
        path: '/collections/featured',
        description: 'Featured products collection',
        metadata: { type: 'collection', priority: 'highest', hardcoded: true }
      },
      ...super.getHardcodedRoutes()
    ];
  }
}

const generator = new CustomShopifyRouteGenerator();
const routes = await generator.generateRoutes('https://mystore.com');
```

## Shopify Theme Integration

To enable controlled navigation in your Shopify theme, add the navigation listener:

```liquid
<!-- In your theme.liquid, before </body> -->
<script src="https://assets.codetek.us/apps/vowel/vowel-navigation-listener.js"></script>
```

Or if using the npm package:

```typescript
import { initializeNavigationListener } from '@vowel.to/client/platforms/shopify';

// Initialize on page load
initializeNavigationListener();
```

## Configuration

### Router Options

```typescript
const router = new ShopifyRouterAdapter({
  channelName: 'my-shopify-nav',
  config: {
    features: ['navigation', 'addToCart', 'search']
  }
});
```

### Route Generation Options

```typescript
const { router, routes } = await initializeShopifyIntegration({
  storeUrl: 'https://mystore.com',
  useFallbackRoutes: false  // Set true to skip sitemap discovery
});
```

## Troubleshooting

### Cart operations not working

1. Verify Shopify AJAX API is enabled
2. Check CORS settings
3. Ensure product IDs are correct
4. Check browser console for errors

### Products not being extracted

1. Verify page has product elements
2. Check if theme uses custom selectors
3. Use DOM search tools to find elements manually
4. Extend `ShopifyStoreManager` for custom extraction

### Routes not discovered

1. Check if sitemap.xml exists
2. Verify sitemap is accessible (not password protected)
3. Use `useFallbackRoutes: true` to skip sitemap
4. Provide custom routes manually

## See Also

- [Generic Platform Adapter](../generic/README.md) - Base adapter documentation
- [Vowel Client Documentation](../../README.md) - Main client documentation
- [Examples](../../examples/) - Working examples

## License

MIT

