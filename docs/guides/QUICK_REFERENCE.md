# Vowel Client Quick Reference

Quick reference for common operations with the Vowel client library.

## Installation

```bash
npm install @vowel.to/client
# or
bun add @vowel.to/client
```

## Basic Setup

```typescript
import { Vowel, createDirectAdapters } from '@vowel.to/client';

const { navigationAdapter, automationAdapter } = createDirectAdapters({
  navigate: (path) => router.push(path),
  routes: [
    { path: '/', description: 'Home' },
    { path: '/products', description: 'Products' }
  ],
  enableAutomation: true
});

const vowel = new Vowel({
  appId: 'your-app-id',
  navigationAdapter,
  automationAdapter
});
```

## Session Control

```typescript
// Start session
await vowel.startSession();

// Pause session (mute mic, keep connection)
await vowel.pauseSession();

// Resume session (unmute mic)
await vowel.resumeSession();

// Stop session (disconnect)
await vowel.stopSession();

// Toggle session on/off
await vowel.toggleSession();
```

## State Persistence

```typescript
// Export conversation state
const state = vowel.exportState({ maxTurns: 20 });
localStorage.setItem('vowel-state', JSON.stringify(state));

// Import state
const saved = JSON.parse(localStorage.getItem('vowel-state'));
vowel.importState(saved);

// Start with restored state
await vowel.startSession({ restoreState: saved });

// Clear transcripts
vowel.clearTranscripts();
```

## Custom Actions

```typescript
// Register action
vowel.registerAction('addToCart', {
  description: 'Add product to shopping cart',
  parameters: {
    productId: { type: 'string', description: 'Product ID' },
    quantity: { type: 'number', description: 'Quantity' }
  }
}, async ({ productId, quantity }) => {
  await cart.add(productId, quantity);
  return { success: true, message: 'Added to cart' };
});

// Unregister action
vowel.unregisterAction('addToCart');
```

## Event Notifications

```typescript
// Notify AI of events
await vowel.notifyEvent('Order placed successfully!', {
  orderId: '12345',
  total: 99.99
});

// Send text to AI
await vowel.sendText('What are the current promotions?');
```

## State Management

```typescript
// Get current state
const state = vowel.getState();
console.log(state.isConnected);
console.log(state.transcripts);

// Listen to state changes
const unsubscribe = vowel.onStateChange((state) => {
  console.log('State updated:', state);
});

// Unsubscribe
unsubscribe();
```

## Voice Configuration

```typescript
const vowel = new Vowel({
  appId: 'your-app-id',
  voiceConfig: {
    // Provider
    provider: 'grok', // 'gemini' | 'openai' | 'grok' | 'vowel-prime'
    
    // Model
    model: 'grok-4-1-fast-reasoning',
    
    // Voice
    voice: 'Eve', // Grok: Eve, Ara, Rex, Sal, Leo
                  // Gemini: Puck, Charon, Kore, Fenrir, Aoede
                  // OpenAI: alloy, echo, fable, onyx, nova, shimmer
    
    // VAD (Voice Activity Detection)
    vadType: 'simple', // 'simple' | 'silero' | 'none'
    useServerVad: false, // Use server-side VAD (recommended for vowel-prime)
    
    // Tool retry configuration
    toolRetry: {
      maxSteps: 30,
      maxRetries: 3
    }
  }
});
```

## Navigation Adapters

```typescript
// Direct (SPAs)
import { createDirectAdapters } from '@vowel.to/client';
const adapters = createDirectAdapters({
  navigate: (path) => router.push(path),
  routes: [/* routes */],
  enableAutomation: true
});

// Next.js
import { createNextJSAdapters } from '@vowel.to/client';
const adapters = createNextJSAdapters(router, {
  routes: [/* routes */],
  enableAutomation: true
});

// TanStack Router
import { createTanStackAdapters } from '@vowel.to/client';
const adapters = createTanStackAdapters(router, {
  enableAutomation: true
});

// React Router
import { createReactRouterAdapters } from '@vowel.to/client';
const adapters = createReactRouterAdapters({
  navigate: useNavigate(),
  location: useLocation(),
  routes: [/* routes */],
  enableAutomation: true
});

// Vue Router
import { createVueRouterAdapters } from '@vowel.to/client';
const adapters = createVueRouterAdapters(router, {
  routes: [/* routes */],
  enableAutomation: true
});

// Controlled (Traditional sites)
import { createControlledAdapters } from '@vowel.to/client';
const adapters = createControlledAdapters({
  channelName: 'vowel-nav'
});
```

## React Components

```typescript
import { VowelProvider, VowelAgent } from '@vowel.to/client/react';

function App() {
  return (
    <VowelProvider client={vowel}>
      <YourApp />
      <VowelAgent />
    </VowelProvider>
  );
}
```

## React Hooks

### useVowel

```typescript
import { useVowel } from '@vowel.to/client/react';

function MyComponent() {
  const { client, state } = useVowel();
  
  // Access state
  console.log(state.isConnected);
  console.log(state.isAISpeaking);
  
  // Control session
  const start = () => client.startSession();
  const stop = () => client.stopSession();
}
```

### useSyncContext

Automatically sync context with the AI:

```typescript
import { useSyncContext } from '@vowel.to/client/react';

function ProductPage({ productId }: { productId: string }) {
  const product = useProduct(productId);
  
  // Automatically sync product context
  useSyncContext({
    page: 'product',
    productId: product.id,
    name: product.name,
    price: product.price
  });
  
  return <div>{product.name}</div>;
}
```

## Web Component

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

## Error Handling

```typescript
try {
  await vowel.startSession();
} catch (error) {
  console.error('Failed to start session:', error);
}

// Listen for errors
vowel.onStateChange((state) => {
  if (state.status.includes('Error')) {
    console.error('Session error:', state.status);
  }
});
```

## Debugging

```typescript
// Enable verbose logging
vowel.setLogLevel('debug');

// Check connection state
const { isConnected, isConnecting, status } = vowel.getState();
console.log({ isConnected, isConnecting, status });

// Check audio state
console.log('Audio initialized:', vowel.audioManager.isInitialized());
console.log('Audio streaming:', vowel.audioManager.isStreaming());
console.log('Audio muted:', vowel.audioManager.isMutedState());
```

## Common Patterns

### LocalStorage Persistence

```typescript
// Save on state change
vowel.onStateChange((state) => {
  if (state.transcripts.length > 0) {
    const exported = vowel.exportState({ maxTurns: 20 });
    localStorage.setItem('vowel-conversation', JSON.stringify(exported));
  }
});

// Restore on page load
const saved = localStorage.getItem('vowel-conversation');
if (saved) {
  await vowel.startSession({ restoreState: JSON.parse(saved) });
} else {
  await vowel.startSession();
}
```

### Session Recovery

```typescript
// Save backup periodically
setInterval(() => {
  const state = vowel.exportState();
  sessionStorage.setItem('vowel-backup', JSON.stringify(state));
}, 30000);

// Recover on error
vowel.onStateChange((state) => {
  if (state.status.includes('Error')) {
    const backup = sessionStorage.getItem('vowel-backup');
    if (backup) {
      setTimeout(async () => {
        await vowel.startSession({ restoreState: JSON.parse(backup) });
      }, 2000);
    }
  }
});
```

### Pause During Phone Calls

```typescript
navigator.mediaDevices.addEventListener('devicechange', async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const phoneConnected = devices.some(d => d.label.includes('Phone'));
  
  if (phoneConnected) {
    await vowel.pauseSession();
  } else {
    await vowel.resumeSession();
  }
});
```

### Cross-Tab Sync

```typescript
const channel = new BroadcastChannel('vowel-sync');

// Share state updates
vowel.onStateChange((state) => {
  channel.postMessage({
    type: 'state-update',
    state: vowel.exportState()
  });
});

// Receive updates from other tabs
channel.onmessage = (event) => {
  if (event.data.type === 'state-update') {
    vowel.importState(event.data.state);
  }
};
```

## TypeScript Types

```typescript
import type {
  VowelClientConfig,
  VowelVoiceConfig,
  VowelAction,
  VowelRoute,
  VoiceSessionState,
  NavigationAdapter,
  AutomationAdapter
} from '@vowel.to/client';
```

## Links

- **Documentation**: [vowel.to/docs](https://vowel.to/docs)
- **GitHub**: [github.com/usevowel/client](https://github.com/usevowel/client)
- **Support**: support@vowel.to
- **Discord**: [discord.gg/vowel](https://discord.gg/vowel)

---

**Version**: 0.1.2-295  
**Last Updated**: November 21, 2025
