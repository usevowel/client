# @vowel.to/client

Add a voice agent to your web app with top-level `apiKey`/`appId` token-issuer identifiers, backend-issued tokens, and router-aware navigation.

[![npm version](https://img.shields.io/npm/v/@vowel.to/client.svg)](https://www.npmjs.com/package/@vowel.to/client)

> **⚠️ Beta Release** — This open-source release is in beta. You may encounter rough edges, incomplete features, or breaking changes. We are actively reviewing and merging community PRs, but please expect some instability as we iterate toward a stable release. Your feedback and contributions are welcome.
>
> **SaaS coming soon** — Currently requires the self-hosted Vowel stack. See [github.com/usevowel/vowel/stack](https://github.com/usevowel/vowel/tree/main/stack) for setup instructions.

## Links

- [vowel.to](https://vowel.to)
- [Self-Host](https://docs.vowel.to/self-hosted/)
- [Agent Skills](https://github.com/usevowel/skills)
- [demos](https://github.com/usevowel/demos)
- [vowelbot](https://add.vowel.to)
- [Community](https://discord.gg/3gpfZsCm)
- [Videos](https://www.youtube.com/@voweldotto)

## Core features

- **Realtime voice** — Gemini Live–compatible sessions with mic, playback, and tool use.
- **Router-aware adapters** — Navigation and optional DOM automation so the agent can move through your app like a user.
- **Client-side actions** — `registerAction()` runs your app code when the model calls a tool (low latency, no server round-trip for business logic).
- **WebMCP (Web Model Context Protocol)** — First-class bridge between vowel and the browser’s Model Context surfaces: **expose** your vowel actions as WebMCP tools, and **discover** tools the host page (or browser) already registered so the voice agent can call them. See [WebMCP](#webmcp-web-model-context-protocol) below.

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
  apiKey: 'your-api-key',
  navigationAdapter,
  automationAdapter,
  language: 'en-US',
  initialGreetingPrompt:
    'Introduce yourself as a helpful assistant for this store and ask how you can help.',
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

Register actions **before** calling `startSession()`. See [Connection Paradigms](https://docs.vowel.to/recipes/connection-paradigms) for token flows and backend-issued tokens.

## WebMCP (Web Model Context Protocol)

WebMCP is a **core part of the client**: the same `registerAction` tools your voice agent uses can participate in the browser’s WebMCP ecosystem, and tools registered elsewhere on the page can be pulled into the session as vowel actions.

- **`enableExposure`** (default: `true`) — After you `registerAction`, vowel also registers that tool with `navigator.modelContext.registerTool` when the native WebMCP API is available, so MCP-compatible agents in the browser can invoke your app logic.
- **`enableDiscovery`** (default: `false`) — On startup (and when you call `rediscoverWebMCPTools()`), vowel discovers tools from the host (testing API or a `window.__webmcp_tools` registry) and registers them as vowel actions the model can call over voice.

Native availability depends on the browser (experimental flags may apply); if WebMCP is not present, voice sessions and `registerAction` behave as usual—WebMCP is an additive layer.

```ts
import { Vowel, createNextJSAdapters } from '@vowel.to/client';
import { useRouter } from 'next/navigation';

const router = useRouter();
const { navigationAdapter, automationAdapter } = createNextJSAdapters(router, {
  routes: [
    { path: '/', description: 'Home page' },
    { path: '/settings', description: 'Account settings' },
  ],
  enableAutomation: true,
});

const vowel = new Vowel({
  apiKey: 'your-api-key',
  navigationAdapter,
  automationAdapter,
  language: 'en-US',
  initialGreetingPrompt:
    'You can use voice to navigate and run tools exposed via WebMCP on this page.',
  webMCP: {
    enableExposure: true, // expose registerAction tools to WebMCP (default)
    enableDiscovery: true, // ingest host WebMCP tools as vowel actions
  },
});

vowel.registerAction(
  'summarizePage',
  {
    description: 'Summarize the visible page for the user',
    parameters: {},
  },
  async () => ({ success: true, summary: '…' })
);

await vowel.startSession();

// After the host registers new WebMCP tools dynamically (e.g. route change):
await vowel.rediscoverWebMCPTools();
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

See [Pause, Resume & State Restoration](https://docs.vowel.to/client/pause-resume-and-state-restoration) for details.

## Web Component

CDN (no build step):

```html
<script src="https://unpkg.com/@vowel.to/client/standalone/vowel-voice-widget.min.js"></script>

<vowel-voice-widget
  api-key="your-api-key"
  position="bottom-right">
</vowel-voice-widget>
```

Import (with build step):

```ts
import '@vowel.to/client/standalone';

// Then use in HTML or JSX
<vowel-voice-widget
  api-key="your-api-key"
  position="bottom-right">
</vowel-voice-widget>
```

## Vanilla JS

CDN (no build step):

```html
<script src="https://unpkg.com/@vowel.to/client/dist/client/index.mjs"></script>
<script type="module">
  const { Vowel, createControlledAdapters } = vowel;

  const { navigationAdapter, automationAdapter } = createControlledAdapters({
    enableAutomation: true,
  });

  const vowelClient = new Vowel({
    apiKey: 'your-api-key',
    navigationAdapter,
    automationAdapter,
    language: 'en-US',
    initialGreetingPrompt: 'Welcome! Ask me anything.',
  });

  document.getElementById('mic-button').addEventListener('click', () => {
    vowelClient.startSession();
  });
</script>
```

Import (with build step):

```ts
import { Vowel, createControlledAdapters } from '@vowel.to/client';

const { navigationAdapter, automationAdapter } = createControlledAdapters({
  enableAutomation: true,
});

const vowel = new Vowel({
  apiKey: 'your-api-key',
  navigationAdapter,
  automationAdapter,
  language: 'en-US',
  initialGreetingPrompt: 'Welcome! Ask me anything.',
});

vowel.startSession();
```

See [Vanilla JS Integration](https://docs.vowel.to/client/vanilla-js) for adapters and configuration.

## Requirements

- Node.js 18+ or Bun
- A modern browser with microphone access
- HTTPS for microphone access outside localhost

## License

MIT. See [LICENSE](./LICENSE) for details.
