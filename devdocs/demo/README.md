# Vowel Voice Agent - Demo Application

Complete guide to the Vowel demo - a voice-enabled e-commerce application showcasing all features.

## Overview

The demo is a React e-commerce app built with:
- **TanStack Router** - Client-side routing
- **Valtio** - State management
- **Convex** - Real-time backend
- **Vowel Voice Agent** - Voice interaction

## Quick Start

### Prerequisites

- Node.js 18+ or Bun
- [Convex account](https://convex.dev) (free)
- Google AI API credentials

### 5-Minute Setup

#### 1. Initialize Convex

```bash
# From project root
cd platform
bunx convex dev
```

This creates a deployment and generates `.env.local`. **Keep this terminal running!**

#### 2. Set Environment Variables

**Option A: Automated (Recommended)**

```bash
./setup-gemini-env.sh
```

**Option B: Manual**

```bash
npx convex env set GOOGLE_PROJECT_ID "your-project-id"
npx convex env set GOOGLE_SERVICE_ACCOUNT_EMAIL "your-service-account@project.iam.gserviceaccount.com"
npx convex env set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Verify:
```bash
npx convex env list
```

#### 3. Configure Demo

```bash
cd demos/demo
cp .env.example .env.local
```

Edit `demos/demo/.env.local`:
```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

#### 4. Install & Start

```bash
bun install
bun run dev
```

Open http://localhost:5173 🎉

#### 5. Try Voice Commands

Click the 🎤 button and say:
- "Go to products"
- "Search for laptops"
- "Add product 1 to cart"
- "Show me my cart"

## Demo Features

### Implemented Routes

| Route | Description |
|-------|-------------|
| `/` | Home page with featured products |
| `/dashboard` | User dashboard with stats |
| `/products` | Product catalog |
| `/product/:id` | Product details |
| `/cart` | Shopping cart |
| `/search` | Search with filters |
| `/users` | User list (admin) |
| `/users/:id` | User profile |
| `/admin/products` | Product management |
| `/admin/carts` | Cart management |

### Voice Actions (11 Total)

#### Navigation (Built-in)
The AI automatically navigates based on your route configuration.

#### Product Actions
- **searchProducts** - Search by query, category, price, stock status
- **getProductById** - View specific product details
- **filterProductsByCategory** - Filter by category
- **getProductsInPriceRange** - Filter by min/max price

#### Cart Actions
- **addToCart** - Add product with optional quantity
- **removeFromCart** - Remove product from cart
- **updateCartQuantity** - Change item quantity
- **clearCart** - Empty the cart

#### User Actions
- **createUser** - Create new user account (admin)
- **getUserById** - View user profile (admin)

### Voice Configuration

```typescript
voiceConfig: {
  model: 'models/gemini-2.0-flash-exp',
  voice: 'Puck',      // Friendly voice
  language: 'en-US',
  vadType: 'simple'   // Voice Activity Detection type (default)
}
```

**VAD Type Options:**
- `'simple'` (default) - Energy-based VAD, instant load, good accuracy
- `'silero'` - ML-based VAD, highest accuracy, requires model download (~5-10s)
- `'none'` - Disable client-side VAD, rely on server-side detection only

## Architecture

### Project Structure

```
demos/demo/
├── src/
│   ├── vowel.client.ts          # Vowel configuration (★ START HERE)
│   ├── ConvexClientProvider.tsx # Convex wrapper
│   ├── App.tsx                  # Main app with VowelProvider
│   ├── main.tsx                 # Entry point
│   │
│   ├── routes/                  # TanStack Router pages
│   │   ├── __root.tsx           # Root layout
│   │   ├── index.tsx            # Home
│   │   ├── products.tsx         # Product list
│   │   ├── cart.tsx             # Shopping cart
│   │   └── ...                  # Other pages
│   │
│   ├── store/                   # Valtio state stores
│   │   ├── productsStore.ts     # Product data
│   │   ├── cartStore.ts         # Cart state
│   │   ├── usersStore.ts        # User data
│   │   └── authStore.ts         # Auth state
│   │
│   ├── data/                    # Mock data
│   │   ├── products.json
│   │   └── users.json
│   │
│   └── lib/
│       └── vowelConfig.ts        # App-specific config
│
├── convex/                      # → Symlink to ../convex
├── convex.json                  # Convex configuration
├── package.json
├── vite.config.ts               # @vowel alias configuration
└── .env.local                   # Environment variables
```

### Key Implementation Files

#### `vowel.client.ts` - Voice Agent Configuration

```typescript
import { Vowel, tanstackRouterAdapter } from '@vowel.to/client';
import { router } from './router';
import { productsStore, cartStore } from './store';

// Create and export Vowel client
export const vowel = new Vowel({
  appId: DEMO_APP_ID,
  router: tanstackRouterAdapter(router),
      routes: [
        { path: '/', description: 'Home page' },
        { path: '/products', description: 'Product catalog' },
        { path: '/cart', description: 'Shopping cart' }
      ],
      voiceConfig: {
        model: 'models/gemini-2.0-flash-exp',
        voice: 'Puck',
        language: 'en-US'
      }
    });
    
// Register cart actions
vowel.registerAction('addToCart', {
  description: 'Add product to shopping cart',
  parameters: {
    productId: { type: 'string', description: 'Product ID' },
    quantity: { type: 'number', description: 'Quantity', optional: true }
  }
}, async (params) => {
  cartStore.addItem(params.productId, params.quantity || 1);
  return { success: true, message: 'Added to cart' };
});
```

#### `App.tsx` - Integration

```typescript
import { RouterProvider } from '@tanstack/react-router';
import { VowelProvider, VowelAgent } from '@vowel.to/client/react';
import { router } from './router';
import { vowel } from './vowel.client';

function App() {
  return (
    <VowelProvider client={vowel}>
      <RouterProvider router={router} />
      <VowelAgent position="bottom-right" showTranscripts />
    </VowelProvider>
  );
}
```

**Important:** 
1. Router is created in a separate `router.ts` file to avoid circular dependencies
2. `VowelProvider` wraps the `RouterProvider` in `App.tsx`, NOT in `__root.tsx`
3. This prevents the circular dependency: `router.ts` → `routeTree.gen.ts` → `__root.tsx` → `vowel.client.ts` → `router.ts` ❌

See the [Router Setup](#router-setup) section below for details

### Router Setup

To avoid circular dependency issues with TanStack Router, create the router in a separate file:

#### `router.ts`
```typescript
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// Create and export router instance
export const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

**Why separate the router AND keep Vowel out of __root.tsx?**

Without proper separation, you would have a circular dependency:
```
BAD: Circular dependency ❌
router creation in vowel.client.ts
  → imports routeTree.gen.ts
    → imports __root.tsx
      → imports vowel.client.ts (trying to use vowel)
        → tries to create router (needs routeTree)
          → already loading! ❌ CIRCULAR!
```

With proper file structure:
```
GOOD: Linear dependency chain ✅
1. router.ts creates router
   → imports routeTree.gen.ts
     → imports __root.tsx (NO vowel imports here!)

2. vowel.client.ts creates vowel
   → imports router from router.ts (already initialized)

3. App.tsx combines everything
   → imports router (already initialized)
   → imports vowel (already initialized)
   → wraps <RouterProvider> with <VowelProvider>
```

**Key Rules:**
1. Create `router.ts` separately (never in `vowel.client.ts`)
2. Never import `vowel` in `__root.tsx` or any route files
3. Wrap `RouterProvider` with `VowelProvider` in `App.tsx`, not in routes

## Customization Guide

### Adding New Routes

Edit `vowel.client.ts`:

```typescript
routes: [
  // Add your route
  {
    path: '/orders',
    description: 'Order history with filters',
    queryParams: ['status', 'date']
  }
]
```

### Adding New Actions

```typescript
vowel.registerAction('placeOrder', {
  description: 'Place an order with current cart items',
  parameters: {
    paymentMethod: {
      type: 'string',
      description: 'Payment method',
      enum: ['card', 'paypal', 'crypto']
    },
    shippingAddress: {
      type: 'string',
      description: 'Shipping address'
    }
  }
}, async (params) => {
  const order = await placeOrder({
    items: cartStore.items,
    payment: params.paymentMethod,
    address: params.shippingAddress
  });
  
  cartStore.clear();
  
  return {
    success: true,
    orderId: order.id,
    message: `Order ${order.id} placed successfully`
  };
});
```

### Changing Voice Settings

```typescript
voiceConfig: {
  model: 'models/gemini-2.0-flash-exp',
  voice: 'Charon',    // Professional voice
  language: 'es-ES',  // Spanish
  vadType: 'simple'   // Use fast energy-based VAD
}
```

**Available Voices:**
- Puck - Friendly
- Charon - Professional
- Kore - Warm
- Fenrir - Confident
- Aoede - Melodic

**VAD Types:**
- `simple` - Instant load, good accuracy (default)
- `silero` - Highest accuracy, ~5-10s load time
- `none` - Disable client VAD, server-only

## Voice Command Examples

### Navigation

| Say | Action |
|-----|--------|
| "Go to products" | Navigate to `/products` |
| "Show me the cart" | Navigate to `/cart` |
| "Take me home" | Navigate to `/` |
| "Go to dashboard" | Navigate to `/dashboard` |

### Product Search

| Say | Action |
|-----|--------|
| "Search for laptops" | Search products: query="laptops" |
| "Find electronics under $500" | Search: category=electronics, maxPrice=500 |
| "Show me clothing in stock" | Search: category=clothing, inStock=true |
| "Find products over $1000" | Search: minPrice=1000 |

### Cart Management

| Say | Action |
|-----|--------|
| "Add product 1 to cart" | Add product ID "1" |
| "Remove product 2 from cart" | Remove product ID "2" |
| "Update cart quantity for product 1 to 3" | Set quantity=3 |
| "Clear my cart" | Empty cart |

### Admin Commands

| Say | Action |
|-----|--------|
| "Show user 123" | View user ID "123" |
| "Create user John with email john@example.com" | Create new user |
| "Go to admin products" | Navigate to `/admin/products` |

## Troubleshooting

### Voice Button Not Working

**Symptoms:** Button appears but doesn't start session

**Solutions:**
1. Check Convex dev server is running
2. Verify environment variables: `npx convex env list`
3. Check browser console for errors
4. Ensure microphone permissions granted

### Microphone Access Denied

**Solutions:**
1. Grant permissions in browser settings
2. Use HTTPS (required for mic access)
3. Try Chrome or Edge (best compatibility)
4. Check system microphone permissions

### "No CONVEX_DEPLOYMENT" Error

**Solutions:**
1. Run `npx convex dev` from project root
2. Wait for "Convex functions ready!" message
3. Restart demo app

### Import Errors

**Solutions:**
```bash
cd demos/demo
rm -rf node_modules
bun install
```

### Navigation Not Working

**Solutions:**
1. Verify routes in `vowel.client.ts` match your router
2. Check router adapter is configured correctly
3. Ensure `tanstackRouterHookAdapter` receives router

### Actions Not Executing

**Solutions:**
1. Verify action is registered before VowelProvider mounts
2. Check action name matches exactly
3. Look for errors in browser console
4. Check Convex logs: `npx convex logs`

## Development Workflow

### Running Terminals

You need 2 terminals:

```bash
# Terminal 1: Convex backend (from root)
cd platform
bunx convex dev

# Terminal 2: Demo app (from root)
cd demos/demo
bun run dev
```

### Making Changes

1. **Edit `vowel.client.ts`** for routes/actions
2. **Edit store files** for business logic
3. **Edit route files** for UI
4. Hot reload works automatically

### Building for Production

```bash
cd demos/demo
bun run build
```

Output in `demos/demo/dist/`

## Technical Notes

### Mock Data vs Convex

The demo uses local Valtio stores with mock data. For production:

```typescript
// Replace this (Valtio)
cartStore.addItem(productId, quantity);

// With this (Convex)
await convex.mutation(api.cart.addItem, { productId, quantity });
```

### App ID Placeholder

```typescript
const DEMO_APP_ID = 'demo-app-id' as any;
```

For production, use a real app ID from your vowel.to dashboard.

### Authentication

Demo uses simulated auth. For production, integrate with Convex auth:

```typescript
const user = await getAuthUserId(ctx);
```

## Project Integrations

The demo folder has additional examples:

- **demo-next/** - Next.js integration
- **demo-laravel/** - Laravel integration
- **examples/** - Standalone examples

## Next Steps

1. **Explore the code** - Start with `vowel.client.ts`
2. **Try all voice commands** - Test navigation and actions
3. **Read the API guide** - [API Reference](../guides/API_REFERENCE.md)
4. **Build your own** - Use demo as template

## Resources

- [API Reference](../guides/API_REFERENCE.md) - Complete API docs
- [Getting Started Guide](../guides/GETTING_STARTED.md) - Integration guide
- [Architecture](../architecture/IMPLEMENTATION.md) - Technical details
- [Main README](../../README.md) - Project overview

## Support

Having issues? Check:
1. [Troubleshooting section](#troubleshooting) above
2. Browser console for errors
3. Convex logs: `npx convex logs`
4. Environment variables: `npx convex env list`

---

**Happy voice coding! 🎤✨**

