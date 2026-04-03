# @vowel.to/client

Add a voice agent to your web app with top-level `apiKey`/`appId` token-issuer identifiers, backend-issued tokens, router-aware navigation, and optional page automation.

[![npm version](https://img.shields.io/npm/v/@vowel.to/client.svg)](https://www.npmjs.com/package/@vowel.to/client)

> **⚠️ Beta Release** — This open-source release is in beta. You may encounter rough edges, incomplete features, or breaking changes. We are actively reviewing and merging community PRs, but please expect some instability as we iterate toward a stable release. Your feedback and contributions are welcome.

## What ships in this package

- Realtime browser client for voice sessions
- Router adapters for Next.js, TanStack Router, React Router, Vue Router, and custom navigation
- Optional automation adapter for DOM interaction
- React bindings via `@vowel.to/client/react`
- Web component and standalone bundle via `@vowel.to/client/standalone`

## Install

```bash
npm install @vowel.to/client
```

## Quick start

```ts
import { Vowel, createNextJSAdapters } from '@vowel.to/client';
import { useRouter } from 'next/navigation';

const router = useRouter();

const { navigationAdapter, automationAdapter } = createNextJSAdapters(router, {
  routes: [
    { path: '/', description: 'Home page' },
    { path: '/products', description: 'Product catalog' },
    { path: '/cart', description: 'Shopping cart' },
  ],
  enableAutomation: true,
});

const vowel = new Vowel({
  apiKey: 'vkey_public_xxx',
  navigationAdapter,
  automationAdapter,
  language: 'en-US',
  turnDetectionPreset: 'balanced',
  initialGreetingPrompt:
    'Introduce yourself as a helpful assistant for this store and ask how you can help.',
  instructions: `
You are a helpful shopping assistant.
- Keep spoken responses concise and conversational.
- Do not use markdown in spoken responses.
- Translate non-English requests before calling tools if needed.
`,
});

vowel.registerAction(
  'searchProducts',
  {
    description: 'Search for products in the catalog',
    parameters: {
      query: { type: 'string', description: 'Search query in English' },
    },
  },
  async ({ query }) => {
    return { success: true, query };
  }
);

await vowel.startSession();
```

Register actions before calling `startSession()`.

## Connection models

### Token-issued flow

Prefer `apiKey` at the top level. During the transition away from hosted `appId` auth, `apiKey` and `appId` are aliases and either field may contain either a publishable API key or a legacy appId.

```ts
const vowel = new Vowel({
  apiKey: 'vkey_public_xxx',
  language: 'en-US',
  initialGreetingPrompt: 'Welcome the user and ask how you can help.',
  turnDetectionPreset: 'balanced',
});
```

### Backend-issued token flow

Use `tokenProvider` when your backend or self-hosted token service decides whether a browser session can start.

```ts
const vowel = new Vowel({
  apiKey: 'vkey_public_xxx',
  tokenProvider: async ({ apiKey, origin, config }) => {
    const response = await fetch('/api/vowel/token', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ origin, config }),
    });

    if (!response.ok) {
      throw new Error('Unable to fetch session token');
    }

    return response.json();
  },
  language: 'en-US',
  initialGreetingPrompt: 'Welcome the user and ask what they want to do next.',
  turnDetectionPreset: 'balanced',
  _voiceConfig: {
    provider: 'vowel-prime',
    vowelPrimeConfig: {
      endpointPreset: 'staging',
    },
  },
});
```

### Direct token compatibility

Direct tokens are still supported for migration and advanced setups via `_voiceConfig.token`, but new examples should prefer `tokenProvider`.

```ts
const vowel = new Vowel({
  language: 'en-US',
  _voiceConfig: {
    provider: 'vowel-prime',
    token: 'your-ephemeral-token',
  },
});
```

## Config shape

Use top-level fields for the public browser-facing config:

```ts
const vowel = new Vowel({
  apiKey: 'vkey_public_xxx',
  language: 'en-US',
  initialGreetingPrompt: 'Welcome the user and ask how you can help.',
  turnDetectionPreset: 'balanced',
  instructions: 'Keep answers brief and conversational.',
});
```

Use `_voiceConfig` for backend/runtime overrides such as provider, model, voice, token, and advanced turn detection:

```ts
const vowel = new Vowel({
  apiKey: 'vkey_public_xxx',
  language: 'en-US',
  initialGreetingPrompt: 'Welcome the user and ask how you can help.',
  turnDetectionPreset: 'balanced',
  _voiceConfig: {
    provider: 'vowel-prime',
    llmProvider: 'groq',
    model: 'openai/gpt-oss-120b',
    voice: 'Timothy',
    vowelPrimeConfig: {
      environment: 'staging',
    },
    turnDetection: {
      mode: 'client_vad',
    },
  },
});
```

Notes:

- `voiceConfig` still exists for legacy compatibility, but `_voiceConfig` is the preferred field.
- Hosted apps should not hardcode hosted preset internals in the client; select managed presets in hosted vowel.
- Self-hosted `core` deployments can own the full runtime JSON and issue tokens from their own service.

## Adapters

Vowel separates navigation from page automation.

- `navigationAdapter`: where to go
- `automationAdapter`: what to do on the page

Helper factories:

```ts
import {
  createDirectAdapters,
  createControlledAdapters,
  createTanStackAdapters,
  createNextJSAdapters,
  createVueRouterAdapters,
  createReactRouterAdapters,
} from '@vowel.to/client';
```

Common usage:

- `createTanStackAdapters(...)` for TanStack Router apps
- `createNextJSAdapters(...)` for Next.js apps
- `createReactRouterAdapters(...)` for React Router apps
- `createControlledAdapters(...)` for traditional multi-page sites

If you omit `automationAdapter`, navigation and custom actions still work.

## React integration

```tsx
import { VowelProvider, VowelAgent } from '@vowel.to/client/react';

export function App() {
  return (
    <VowelProvider client={vowel}>
      <YourRoutes />
      <VowelAgent position="bottom-right" />
    </VowelProvider>
  );
}
```

## Session APIs

```ts
await vowel.startSession();
await vowel.pauseSession();
await vowel.resumeSession();

await vowel.sendText('What can I do on this page?');
await vowel.notifyEvent('Order placed successfully!', { orderId: '12345' });

const state = vowel.exportState({ maxTurns: 20 });
await vowel.startSession({ restoreState: state });
```

## Web component

```html
<script src="https://cdn.vowel.to/vowel-voice-widget.min.js"></script>

<vowel-voice-widget
  app-id="your-app-id"
  preset="controlled"
  position="bottom-right"
  show-transcripts="true">
</vowel-voice-widget>
```

Use the `config` attribute for JSON configuration overrides when embedding the widget.

## Docs

Documentation is now hosted at [docs.vowel.to](https://docs.vowel.to):

- [Client Quick Reference](https://docs.vowel.to/client/quick-reference)
- [Pause, Resume & State Restoration](https://docs.vowel.to/client/pause-resume-and-state-restoration)
- [Connection Paradigms](https://docs.vowel.to/recipes/connection-paradigms)
- [Demo Example (React)](https://github.com/usevowel/vowel/blob/main/demos/demo/src/vowel.client.ts)
- [Demo Example (Next.js)](https://github.com/usevowel/vowel/blob/main/demos/demo-next/src/lib/vowel.client.ts)

## Requirements

- Node.js 18+ or Bun
- A modern browser with microphone access
- HTTPS for microphone access outside localhost

## License

Proprietary. See `client/package.json` for package metadata.
