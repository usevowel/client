# Standalone JS Client Build

## Overview

The standalone JS client is a framework-agnostic, CDN-ready bundle of the Vowel client library **without React dependencies**. This allows developers to use the Vowel client in plain JavaScript projects without any build tools.

## Build Configuration

### Output Location
- **Directory**: `dist-js-bundled/`
- **Files**: 
  - `vowel-client.min.js` (~227 KB minified)
  - `vowel-client.min.js.map` (source map)

### Key Differences from Regular Build

| Feature | Regular Build | Standalone JS Build |
|---------|--------------|---------------------|
| Output Format | ESM + CJS | IIFE (browser global) |
| React Components | ✓ Included | ✗ Excluded |
| Dependencies | External (peer deps) | Bundled |
| Bundle Size | Small (externals) | Larger (all deps) |
| Use Case | npm/bundlers | CDN/script tag |
| R2 Deployment | ✗ No | ✗ No |

### Comparison with Web Component Build

| Feature | Standalone JS | Web Component (standalone) |
|---------|--------------|----------------------------|
| Output Location | `dist-js-bundled/` | `dist-standalone/` |
| Entry Point | `src/standalone-js.ts` | `src/web-component.ts` |
| Bundle Name | `VowelClient` | `VowelVoiceWidget` |
| R2 Deployment | ✗ No | ✓ Yes |
| React Required | ✗ No | ✓ Yes (bundled) |
| Web Component | ✗ No | ✓ Yes |
| Client Class | ✓ Yes | ✓ Yes (internal) |

## Build Commands

```bash
# Build only standalone-js
bun run build:standalone-js

# Build everything (lib + standalone + standalone-js)
bun run build

# Watch mode for development
bun run build:watch:standalone-js
```

## Usage

### Via CDN

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <!-- Load from CDN -->
  <script src="https://unpkg.com/@vowel.to/client@latest/standalone-js"></script>
</head>
<body>
  <script>
    // VowelClient is now available globally
    const { Vowel } = window.VowelClient;
    
    // Create Vowel instance
    const vowel = new Vowel({
      appId: 'your-app-id',
      router: {
        navigate: (path) => window.location.href = path,
        getCurrentPath: () => window.location.pathname,
      },
      routes: [
        { path: '/home', description: 'Home page' },
        { path: '/products', description: 'Products' }
      ]
    });
    
    // Register actions
    vowel.registerAction('search', {
      description: 'Search products',
      parameters: {
        query: { type: 'string', description: 'Search query' }
      }
    }, async ({ query }) => {
      console.log('Searching for:', query);
      return { success: true };
    });
    
    // Start session
    vowel.startSession();
  </script>
</body>
</html>
```

### Via npm

```javascript
import '@vowel.to/client/standalone-js';

// Same usage as above
const { Vowel } = window.VowelClient;
```

## Package.json Exports

```json
{
  "exports": {
    "./standalone-js": "./dist-js-bundled/vowel-client.min.js",
    "./standalone-js.css": "./dist-js-bundled/vowel-client.css"
  }
}
```

## Technical Details

### Entry Point: `src/standalone-js.ts`

This file exports only the core client library without React components:

```typescript
// Core client (no React)
export * from './lib/vowel/core';
export * from './lib/vowel/managers';
export * from './lib/vowel/adapters';
export * from './lib/vowel/types';
export * from './lib/vowel/version';
```

### What's Excluded

- React components (`VowelProvider`, `VowelAgent`, `VowelMicrophone`)
- React hooks (`useVowel`)
- Web component wrapper
- React dependencies

### What's Included

- `Vowel` class (core client)
- Router adapters (`tanstackRouterAdapter`, etc.)
- Type definitions
- Audio manager
- Session manager
- Tool manager
- State manager

## Testing

A test HTML file is provided to verify the standalone bundle works correctly:

```bash
# Open in browser
open test-standalone-js.html
```

The test verifies:
- ✓ VowelClient is loaded
- ✓ Vowel class is available
- ✓ Version information is present
- ✓ All exports are accessible

## Why No R2 Deployment?

The standalone JS bundle is **not** deployed to R2 because:

1. **NPM Distribution**: Primarily distributed via npm/unpkg
2. **Versioning**: Users should explicitly choose versions via unpkg
3. **Size**: Smaller than web component, better suited for npm
4. **Flexibility**: Users may want to self-host

The **web component** standalone bundle IS deployed to R2 because it's designed for direct CDN usage with a fixed URL.

## Related Documentation

- [Getting Started Guide](./guides/GETTING_STARTED.md)
- [API Reference](./guides/API_REFERENCE.md)
- [Web Component Documentation](../src/web-component.ts)

