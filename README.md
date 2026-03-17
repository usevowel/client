# @vowel.to/client

<<<<<<< HEAD
**Add voice-powered AI agents to any web application in minutes.**

A framework-agnostic voice agent library powered by Google's Gemini Live API. Enable real-time voice interaction with automatic navigation, custom actions, and intelligent assistance.

[![npm version](https://img.shields.io/npm/v/@vowel.to/client.svg)](https://www.npmjs.com/package/@vowel.to/client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎤 **Real-time Voice Interface** - Powered by Gemini Live API and OpenAI Realtime API
- 🧭 **Smart Navigation** - Voice-controlled routing (WHERE to go)
- 🤖 **Page Automation** - Voice-controlled interaction (WHAT to do)
- ⚡ **Custom Actions** - Define business logic for voice commands
- 📢 **Event Notifications** - Programmatically trigger AI voice responses for app events
- 🔌 **Framework Agnostic** - Works with React, Vue, vanilla JS, and more
- 📦 **Multiple Formats** - React components, web component, standalone JS
- 🎨 **Customizable** - Configure voice, behavior, and UI
- 🔄 **Dual Adapter Architecture** - Independent navigation and automation adapters
- 💬 **Interrupt Handling** - User can speak over AI with automatic audio interruption
- ⏱️ **Session Timeout Management** - Graceful handling of idle timeouts and max duration limits
- ⏸️ **Pause/Resume Sessions** - Temporarily mute microphone while keeping connection alive
- 💾 **State Persistence** - Export/import conversation history for session restoration
- 🎯 **Server-Side VAD** - More accurate speech detection with lower CPU usage
- 👋 **Initial Greetings** - AI proactively introduces itself when session starts
- 📬 **Message Queueing** - Automatic queuing of messages before connection is ready

## Quick Example

```typescript
import { Vowel, createDirectAdapters } from '@vowel.to/client';
import { useRouter } from 'next/navigation';

// Create adapters for navigation + page automation
const router = useRouter();
const { navigationAdapter, automationAdapter } = createDirectAdapters({
  navigate: (path) => router.push(path),
  routes: [
    { path: '/', description: 'Home page' },
    { path: '/products', description: 'Product catalog' }
  ],
  enableAutomation: true  // Enable voice page interaction
});

const vowel = new Vowel({
  appId: 'your-app-id',
  navigationAdapter,   // Voice navigation
  automationAdapter    // Voice page interaction (search, click, type, etc.)
});

// Register a custom action
vowel.registerAction('search', {
  description: 'Search for products',
  parameters: {
    query: { type: 'string', description: 'Search query' }
  }
}, async ({ query }) => {
  // Your search logic
  return { success: true };
});

// Start voice session
await vowel.startSession();

// Pause/resume session
await vowel.pauseSession();  // Mute mic, keep connection
await vowel.resumeSession(); // Unmute mic

// Export/import conversation state
const state = vowel.exportState({ maxTurns: 20 });
localStorage.setItem('conversation', JSON.stringify(state));

// Restore conversation in new session
const saved = JSON.parse(localStorage.getItem('conversation'));
await vowel.startSession({ restoreState: saved });

// Programmatically notify user of events
await vowel.notifyEvent('Order placed successfully!', {
  orderId: '12345',
  total: 99.99
});
```

## Connection Options

### Option 1: Platform-Managed Tokens (Recommended for most apps)

Use `appId` to let Vowel handle token generation:

```typescript
const vowel = new Vowel({
  appId: 'your-app-id',  // Vowel manages tokens
  routes: [{ path: '/', description: 'Home' }],
});
```

### Option 2: Direct Tokens (For custom auth)

Pass a pre-generated token directly for full control:

```typescript
const vowel = new Vowel({
  voiceConfig: {
    provider: 'vowel-prime',
    token: 'your-ephemeral-token',  // From your backend
  },
});
```

**See [Connection Paradigms](docs/recipes/connection-paradigms.md)** for detailed patterns including API key management, sidecar pattern, and direct WebSocket connections.

## Installation

```bash
npm install @vowel.to/client
# or
yarn add @vowel.to/client
# or
bun add @vowel.to/client
```

## Available Formats

### 1. React Components (Recommended for React apps)

```typescript
import { VowelProvider, VowelAgent } from '@vowel.to/client/react';
import { Vowel, createDirectAdapters } from '@vowel.to/client';
import { useRouter } from 'next/navigation';

const router = useRouter();
const { navigationAdapter, automationAdapter } = createDirectAdapters({
  navigate: (path) => router.push(path),
  routes: [/* your routes */],
  enableAutomation: true
});

const vowel = new Vowel({
  appId: 'your-app-id',
  navigationAdapter,
  automationAdapter
});

function App() {
  return (
    <VowelProvider client={vowel}>
      <YourApp />
      <VowelAgent />  {/* Floating voice button */}
    </VowelProvider>
  );
}
```

### 2. Web Component (For any framework)

```html
<script src="https://unpkg.com/@vowel.to/client@latest/standalone"></script>

<vowel-voice-widget 
  id="widget"
  app-id="your-app-id">
</vowel-voice-widget>

<script>
  const widget = document.getElementById('widget');
  
  widget.addEventListener('vowel-ready', () => {
    widget.registerAction('myAction', definition, handler);
  });
</script>
```

### 3. Standalone JavaScript (CDN)

```html
<script src="https://unpkg.com/@vowel.to/client@latest/standalone-js"></script>

<script>
  const { Vowel } = window.VowelClient;
  
  const vowel = new Vowel({
    appId: 'your-app-id',
    routes: [/* your routes */]
  });
  
  vowel.startSession();
</script>
```

## Documentation

- **[Quick Reference](./docs/guides/QUICK_REFERENCE.md)** - Common operations and patterns
- **[Getting Started](./docs/guides/GETTING_STARTED.md)** - Complete integration guide
- **[Pause/Resume & State Restoration](./docs/guides/PAUSE_RESUME_AND_STATE_RESTORATION.md)** - Session control and persistence
- **[Event Notifications](./docs/EVENT_NOTIFICATIONS.md)** - Programmatic AI notifications
- **[Web Component API](./docs/WEB_COMPONENT_PROGRAMMATIC_API.md)** - Web component usage
- **[Examples](./examples/)** - Code examples

## Use Cases

- **E-commerce** - Voice shopping, product search, cart management
- **SaaS Applications** - Voice-controlled workflows and navigation
- **Customer Support** - Interactive voice assistance
- **Accessibility** - Hands-free navigation
- **Productivity Tools** - Quick actions via voice commands

## Voice Configuration

Configure voice provider settings including initial greetings:

```typescript
const vowel = new Vowel({
  appId: 'your-app-id',
  voiceConfig: {
    provider: 'vowel-prime',  // or 'gemini', 'openai'
    model: 'moonshotai/kimi-k2-instruct-0905',
    voice: 'Ashley',
    
    // 🆕 Initial Greeting - AI introduces itself when session starts
    initialGreeting: 'Introduce yourself as a helpful shopping assistant and ask how you can help today.',
    
    // Vowel Prime specific options
    vowelPrimeConfig: {
      environment: 'production',  // 'testing', 'dev', 'staging', or 'production'
      // Or custom URL:
      // workerUrl: 'wss://custom.prime.vowel.to'
    },
    
    // LLM provider for vowel-prime
    llmProvider: 'openrouter',  // or 'groq'
    openrouterOptions: {
      provider: 'anthropic',
      siteUrl: 'https://yoursite.com',
      appName: 'Your App'
    }
  }
});
```

### Initial Greeting Feature

When `initialGreeting` is configured, the AI will proactively speak first after the connection is established:

```typescript
// Example: E-commerce assistant
voiceConfig: {
  provider: 'vowel-prime',
  initialGreeting: 'Hi! I'm your shopping assistant. I can help you find products, check your cart, or answer questions. What are you looking for today?'
}

// Example: Customer support
voiceConfig: {
  provider: 'vowel-prime',
  initialGreeting: 'Hello! I'm here to help with your support request. What can I assist you with?'
}

// Example: Productivity assistant
voiceConfig: {
  provider: 'vowel-prime',
  initialGreeting: 'Good day! I can help you navigate the app, create tasks, or search for information. How can I help?'
}
```

### Message Queueing

The client automatically queues messages sent before the connection is fully ready:

```typescript
// These calls are safe immediately after startSession()
await vowel.startSession();

// Messages are automatically queued until connection is ready
await vowel.notify('user_login', 'User logged in', { userId: '123' });
await vowel.sendText('Show me available products');

// When connection is ready (including STT initialization), 
// all queued messages are sent in order
```

This ensures:
- ✅ No messages are lost
- ✅ Messages are sent in order
- ✅ Works even with slow STT provider initialization (e.g., AssemblyAI)

## Dual Adapter Architecture

Vowel uses two independent, optional adapters:

### Navigation Adapter (WHERE to go)
Handles voice-controlled routing:

```typescript
import { 
  DirectNavigationAdapter, 
  TanStackNavigationAdapter,
  ReactRouterNavigationAdapter 
} from '@vowel.to/client';

// Option 1: Direct navigation (SPAs)
const navigationAdapter = new DirectNavigationAdapter({
  navigate: (path) => router.push(path),
  routes: [/* your routes */]
});

// Option 2: TanStack Router (auto-detects routes)
const navigationAdapter = new TanStackNavigationAdapter(router);

// Option 3: React Router
const navigationAdapter = new ReactRouterNavigationAdapter({
  navigate,  // from useNavigate()
  location,  // from useLocation()
  routes: [/* your routes */]
});

// Option 4: Controlled navigation (traditional sites with page reloads)
const navigationAdapter = new ControlledNavigationAdapter({
  channelName: 'vowel-nav'
});
```

### Automation Adapter (WHAT to do)
Handles voice-controlled page interaction:

```typescript
import { DirectAutomationAdapter, ControlledAutomationAdapter } from '@vowel.to/client';

// Option 1: Direct automation (SPAs)
const automationAdapter = new DirectAutomationAdapter();

// Option 2: Controlled automation (traditional sites)
const automationAdapter = new ControlledAutomationAdapter('vowel-automation');
```

### Helper Functions

Quick setup for common scenarios:

```typescript
import { 
  createDirectAdapters,      // SPAs (React, Vue, etc.)
  createControlledAdapters,   // Traditional sites (Shopify, WordPress)
  createTanStackAdapters,     // TanStack Router
  createNextJSAdapters,       // Next.js
  createVueRouterAdapters,    // Vue Router
  createReactRouterAdapters   // React Router
} from '@vowel.to/client';

// Example: Next.js
const { navigationAdapter, automationAdapter } = createNextJSAdapters(router, {
  routes: [/* your routes */],
  enableAutomation: true
});

// Example: React Router
const navigate = useNavigate();
const location = useLocation();
const { navigationAdapter, automationAdapter } = createReactRouterAdapters({
  navigate,
  location,
  routes: [/* your routes */],
  enableAutomation: true
});
```

**Supported Frameworks:**
- ✅ TanStack Router
- ✅ Next.js (App Router & Pages Router)
- ✅ Vue Router
- ✅ React Router
- ✅ Custom routers (bring your own)
- ✅ Traditional sites (Shopify, WordPress, etc.)

### Built-in Actions

When you provide adapters, Vowel automatically registers these actions:

**From NavigationAdapter:**
- `navigate_to_page` - Navigate to any route

**From AutomationAdapter:**
- `search_page_elements` - Search for elements on the page
- `get_page_snapshot` - Get page structure snapshot
- `click_element` - Click any element
- `type_into_element` - Type into inputs
- `focus_element` - Focus an element
- `scroll_to_element` - Scroll to an element
- `press_key` - Press keyboard keys

These work automatically - no configuration needed! Just provide the adapters.

## Voice Configuration

Customize the voice agent's provider, model, voice, and VAD settings:

```typescript
const vowel = new Vowel({
  appId: 'your-app-id',
  voiceConfig: {
    // Provider (default: "gemini")
    // Options: "gemini" | "openai"
    provider: 'gemini',
    
    // Voice model - varies by provider
    // Gemini: "gemini-live-2.5-flash-preview" (default), "gemini-2.0-flash-live-001"
    // OpenAI: "gpt-realtime" (default), "gpt-4o-realtime-preview"
    // See SUPPORTED_MODELS.md for complete list
    model: 'gemini-live-2.5-flash-preview',
    
    // Voice personality - varies by provider
    // Gemini: "Puck" (default), "Charon", "Kore", "Fenrir", "Aoede", "Orus"
    // OpenAI: "alloy" (default), "echo", "fable", "onyx", "nova", "shimmer"
    voice: 'Puck',
    
    // Language (default: "en-US")
    language: 'en-US',
    
    // VAD (Voice Activity Detection) type (default: undefined - deprecated, use turnDetection instead)
    // - "simple": Energy-based VAD (fast, no download, good accuracy)
    // - "silero": ML-based VAD (most accurate, ~5-10s model download)
    // - "none": Disable client-side VAD (rely only on server-side)
    // NOTE: Deprecated - use turnDetection.mode instead. Default is now 'client_vad' with 'silero-vad' adapter.
    // NOTE: OpenAI provider handles VAD internally via SDK
    vadType: undefined,
    
    // Turn detection configuration (default: client-side VAD)
    // Controls how speech is detected and when responses are triggered
    turnDetection: {
      mode: 'client_vad', // 'client_vad' (default) | 'server_vad' | 'semantic_vad' | 'disabled'
      // Server VAD configuration (for 'server_vad' and 'semantic_vad' modes)
      serverVAD: {
        threshold: 0.5,           // Activation threshold (0 to 1)
        silenceDurationMs: 550,    // Silence duration to detect speech stop
        prefixPaddingMs: 0,       // Audio padding before detected speech
        interruptResponse: true,   // Allow interruptions during AI response
      },
      // Client VAD configuration (for 'client_vad' mode only)
      // Defaults to 'silero-vad' adapter if not specified
      // clientVAD: {
      //   adapter: 'silero-vad', // 'silero-vad' (default) | 'simple-vad' | 'smart-turn'
      //   config: { ... }
      // }
    },
    
    // Use server-side VAD for UI updates (default: false)
    // When true, uses server VAD events instead of client-side VAD
    // Recommended for Vowel Prime with AssemblyAI/Fennec STT
    useServerVad: false
  }
});
```

> **⚠️ Important**: Gemini Live models will be deprecated on December 9th, 2025. See `SUPPORTED_MODELS.md` for migration guidance.

### VAD Type Comparison

| Type | Accuracy | Load Time | Use Case |
|------|----------|-----------|----------|
| **client_vad** (default) | High | 5-10s | Client-side ML-based VAD (silero-vad) - high accuracy, enables client-side interruptions |
| **server_vad** | High | Instant | Server-side VAD - no client processing, best server-side performance |
| **semantic_vad** | High | Instant | Server-side semantic VAD - understands speech context |
| **disabled** | N/A | Instant | Disabled - troubleshooting, bandwidth-constrained environments |

**Recommendation:** The default `client_vad` mode uses client-side VAD (`silero-vad` adapter) for high accuracy and enables client-side interruptions. Use `server_vad` or `semantic_vad` if you prefer server-side processing, or `simple-vad` adapter for instant initialization (lower accuracy).

## Platform Adapters

### Shopify

Pre-built Shopify integration:

```typescript
import { initializeShopifyIntegration } from '@vowel.to/client/platforms/shopify';

const { router, routes, actionHandler } = await initializeShopifyIntegration({
  storeUrl: 'https://mystore.com'
});

const vowel = new Vowel({
  appId: 'your-app-id',
  router,
  routes
});
```

## Requirements

- Node.js 18+ or Bun
- Modern browser with microphone support
- HTTPS (required for microphone access)

## Browser Support

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Microphone permissions required

## Getting Your App ID

Visit [vowel.to](https://vowel.to) to:
1. Create a free account
2. Configure your voice agent
3. Get your app ID

## Examples

Check out complete examples:
- [React + TanStack Router](https://github.com/vowel-life/demos)
- [Next.js](https://github.com/vowel-life/demos)
- [Laravel](https://github.com/vowel-life/demos)

## Contributing

We welcome contributions! Please see our [contributing guidelines](./CONTRIBUTING.md).

## License

MIT © vowel.to

## Support

- 📧 Email: support@vowel.to
- 💬 Discord: [Join our community](https://discord.gg/vowel-life)
- 📚 Docs: [vowel.to/docs](https://vowel.to/docs)
- 🐛 Issues: [GitHub Issues](https://github.com/vowel-life/client/issues)

---

Built with ❤️ using Google Gemini Live API

=======
**Status:** Beta  
**Version:** 0.2.0-beta

---

A framework-agnostic voice agent library powered by Google Gemini Live API.

For inquiries, contact: support@vowel.to

---

Copyright (c) 2025 Vowel.to. All rights reserved.

## Configuration Ownership

- Hosted `platform` apps should use managed presets such as `vowel-prime`, `vowel-prime-high`, or `vowel-premium` through the platform UI.
- Self-hosted `core` apps can own full backend/runtime JSON in Core.
- Public client config should keep supported fields like `language`, `initialGreetingPrompt`, and `turnDetectionPreset` at the top level.
- Backend/runtime escape hatches belong in `_voiceConfig` and may be ignored unless the token issuer enables development overrides.
>>>>>>> release/client-0.2.0
