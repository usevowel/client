# Pause/Resume and State Restoration Guide

This guide explains how to use the pause/resume and state restoration features in the Vowel client library.

## Table of Contents

- [Pause/Resume Sessions](#pauseresume-sessions)
- [State Export/Import](#state-exportimport)
- [Server-Side VAD](#server-side-vad)
- [Complete Examples](#complete-examples)

---

## Pause/Resume Sessions

The pause/resume feature allows you to temporarily mute the microphone while keeping the WebSocket connection alive. This is useful for:

- Taking phone calls during a voice session
- Temporarily stopping voice input without losing context
- Reducing bandwidth usage during idle periods

### API

```typescript
// Pause the session (mutes microphone, keeps connection)
await vowel.pauseSession();

// Resume the session (unmutes microphone)
await vowel.resumeSession();
```

### How It Works

When you pause a session:
1. **Audio input is muted** - The `AudioManager` stops sending audio chunks to the server
2. **VAD is paused** - Client-side voice activity detection stops updating UI
3. **Connection stays alive** - WebSocket remains open, no reconnection needed
4. **State is preserved** - Conversation history and context are maintained

### Example

```typescript
import { createVowel } from '@vowel.to/client';

const vowel = createVowel({
  appId: 'your-app-id',
  // ... other config
});

// Start session
await vowel.startSession();

// User needs to take a phone call
await vowel.pauseSession();
console.log('Session paused - microphone muted');

// After the call
await vowel.resumeSession();
console.log('Session resumed - microphone active');
```

---

## State Export/Import

The state export/import feature allows you to save conversation history and restore it in a new session. This enables:

- Persisting conversations across page reloads
- Resuming conversations after network interruptions
- Implementing "conversation history" features

### API

```typescript
// Export current state
const state = vowel.exportState({ maxTurns: 20 });

// Import previously saved state
vowel.importState(savedState);

// Start session with restored context
await vowel.startSession({ restoreState: savedState });
```

### How It Works

**Export:**
- Captures conversation transcripts (user and assistant messages)
- Optionally truncates to last N turns
- Returns a serializable JSON object

**Import:**
- Merges saved transcripts into current state
- When used with `startSession()`, injects history into system prompt
- AI continues conversation naturally from restored context

**Format:**
```typescript
interface ExportedState {
  transcripts: Array<{
    role: "user" | "assistant";
    text: string;
    timestamp: Date;
  }>;
  // Other state fields...
}
```

### Example: LocalStorage Persistence

```typescript
import { createVowel } from '@vowel.to/client';

const vowel = createVowel({
  appId: 'your-app-id',
  // ... other config
});

// Save state before page unload
window.addEventListener('beforeunload', () => {
  const state = vowel.exportState({ maxTurns: 20 });
  localStorage.setItem('vowel-conversation', JSON.stringify(state));
});

// Restore state on page load
const savedState = localStorage.getItem('vowel-conversation');
if (savedState) {
  await vowel.startSession({ restoreState: JSON.parse(savedState) });
} else {
  await vowel.startSession();
}
```

### Example: Session Recovery

```typescript
// Save state periodically
setInterval(() => {
  const state = vowel.exportState();
  sessionStorage.setItem('vowel-backup', JSON.stringify(state));
}, 30000); // Every 30 seconds

// Recover from network error
vowel.onStateChange((state) => {
  if (state.status.includes('Error')) {
    const backup = sessionStorage.getItem('vowel-backup');
    if (backup) {
      console.log('Recovering from error...');
      setTimeout(async () => {
        await vowel.startSession({ restoreState: JSON.parse(backup) });
      }, 2000);
    }
  }
});
```

---

## Server-Side VAD

Server-side VAD (Voice Activity Detection) uses the server's speech detection events instead of client-side processing. This provides:

- **More accurate** speech detection (especially for Vowel Prime with AssemblyAI/Fennec)
- **Lower client CPU usage** (no local VAD processing)
- **Consistent behavior** across devices

### Configuration

```typescript
const vowel = createVowel({
  appId: 'your-app-id',
  voiceConfig: {
    provider: 'vowel-prime', // Server VAD works with vowel-prime
    vadType: 'none', // Disable client-side VAD
    useServerVad: true, // Enable server VAD events
  },
});
```

### How It Works

1. **Server detects speech** - AssemblyAI or Fennec STT providers detect when user starts/stops speaking
2. **Events sent to client** - `input_audio_buffer.speech_started` and `speech_stopped` events
3. **UI updates** - Client updates speaking state based on server events

### Supported Providers

- ✅ **Vowel Prime** (with AssemblyAI or Fennec STT)
- ⚠️ **OpenAI Realtime API** (has built-in server VAD)
- ❌ **Gemini Live** (uses client-side VAD only)

---

## Complete Examples

### Example 1: Pause During Phone Calls

```typescript
import { createVowel } from '@vowel.to/client';

const vowel = createVowel({
  appId: 'your-app-id',
  voiceConfig: {
    provider: 'vowel-prime',
    useServerVad: true,
  },
});

// Start session
await vowel.startSession();

// Listen for phone call events (example)
navigator.mediaDevices.addEventListener('devicechange', async () => {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const phoneConnected = devices.some(d => d.label.includes('Phone'));
  
  if (phoneConnected) {
    await vowel.pauseSession();
    console.log('📞 Phone call detected - session paused');
  } else {
    await vowel.resumeSession();
    console.log('✅ Phone call ended - session resumed');
  }
});
```

### Example 2: Conversation Persistence with IndexedDB

```typescript
import { createVowel } from '@vowel.to/client';
import { openDB } from 'idb';

// Open IndexedDB
const db = await openDB('vowel-db', 1, {
  upgrade(db) {
    db.createObjectStore('conversations');
  },
});

const vowel = createVowel({
  appId: 'your-app-id',
});

// Load conversation on start
const conversationId = 'user-123-session';
const saved = await db.get('conversations', conversationId);

if (saved) {
  console.log('📥 Restoring conversation...');
  await vowel.startSession({ restoreState: saved });
} else {
  await vowel.startSession();
}

// Save on transcript updates
vowel.onStateChange((state) => {
  if (state.transcripts.length > 0) {
    const exported = vowel.exportState({ maxTurns: 50 });
    db.put('conversations', exported, conversationId);
  }
});
```

### Example 3: Multi-Tab Sync with BroadcastChannel

```typescript
import { createVowel } from '@vowel.to/client';

const vowel = createVowel({
  appId: 'your-app-id',
});

// Create broadcast channel for cross-tab communication
const channel = new BroadcastChannel('vowel-sync');

// Share state updates across tabs
vowel.onStateChange((state) => {
  channel.postMessage({
    type: 'state-update',
    state: vowel.exportState(),
  });
});

// Receive state updates from other tabs
channel.onmessage = (event) => {
  if (event.data.type === 'state-update') {
    vowel.importState(event.data.state);
  }
};

// Start session
await vowel.startSession();
```

### Example 4: Token-Limited History

```typescript
import { createVowel } from '@vowel.to/client';
import { truncateHistory } from '@vowel.to/client/utils/historyFormatter';

const vowel = createVowel({
  appId: 'your-app-id',
});

// Export with custom token limit
const state = vowel.exportState();
const truncated = truncateHistory(state.transcripts, 16000); // Max 16000 tokens

// Save truncated version
localStorage.setItem('vowel-conversation', JSON.stringify({
  ...state,
  transcripts: truncated,
}));
```

---

## Best Practices

### Pause/Resume

1. **Always check connection state** before pausing/resuming
2. **Provide UI feedback** when paused (e.g., "Microphone muted")
3. **Consider auto-resume** after a timeout to prevent forgotten pauses

### State Restoration

1. **Truncate history** to avoid token limits (use `maxTurns` or `truncateHistory()`)
2. **Validate saved state** before importing (check for corruption)
3. **Clear old sessions** to avoid storage bloat
4. **Encrypt sensitive data** if storing conversations

### Server-Side VAD

1. **Use with Vowel Prime** for best results
2. **Disable client VAD** (`vadType: 'none'`) to save CPU
3. **Test on various devices** to ensure consistent behavior

---

## API Reference

### VowelClient Methods

```typescript
// Pause/Resume
await vowel.pauseSession(): Promise<void>
await vowel.resumeSession(): Promise<void>

// State Management
vowel.exportState(options?: { maxTurns?: number }): VoiceSessionState
vowel.importState(savedState: Partial<VoiceSessionState>): void

// Session Start with Restoration
await vowel.startSession(options?: { restoreState?: Partial<VoiceSessionState> }): Promise<void>
```

### Configuration Options

```typescript
interface VowelVoiceConfig {
  // ... other options
  
  /** Use server-side VAD events for UI updates (default: false) */
  useServerVad?: boolean;
  
  /** VAD type - use "none" when useServerVad is true */
  vadType?: "simple" | "silero" | "none";
}
```

### Utility Functions

```typescript
import { formatHistoryForPrompt, truncateHistory } from '@vowel.to/client/utils/historyFormatter';

// Format history for system prompt injection (all turns by default)
const historyBlock = formatHistoryForPrompt(transcripts, {
  includeTimestamps: false,
});

// Truncate to token limit
const truncated = truncateHistory(transcripts, 32000);
```

---

## Troubleshooting

### Pause doesn't stop audio

**Problem:** Audio continues to be sent after calling `pauseSession()`

**Solution:** Ensure you're awaiting the pause call and check that the session is connected:

```typescript
const { isConnected } = vowel.getState();
if (isConnected) {
  await vowel.pauseSession();
}
```

### State restoration doesn't work

**Problem:** Restored conversation context is not visible to AI

**Solution:** Make sure to pass `restoreState` to `startSession()`, not just `importState()`:

```typescript
// ❌ Wrong - only updates UI
vowel.importState(savedState);
await vowel.startSession();

// ✅ Correct - injects into system prompt
await vowel.startSession({ restoreState: savedState });
```

### Server VAD events not firing

**Problem:** `useServerVad: true` but no speaking state updates

**Solution:** Verify provider and STT configuration:

```typescript
voiceConfig: {
  provider: 'vowel-prime', // Required
  useServerVad: true,
  vadType: 'none', // Disable client VAD
  vowelPrimeConfig: {
    sttProvider: 'assemblyai', // or 'fennec'
  },
}
```

---

## Migration Guide

### From Client VAD to Server VAD

```typescript
// Before (client-side VAD)
const vowel = createVowel({
  voiceConfig: {
    vadType: 'silero', // CPU-intensive
  },
});

// After (server-side VAD)
const vowel = createVowel({
  voiceConfig: {
    provider: 'vowel-prime',
    vadType: 'none', // Disable client VAD
    useServerVad: true, // Use server events
  },
});
```

### Adding State Persistence to Existing App

```typescript
// 1. Export state before disconnect
vowel.onStateChange((state) => {
  if (!state.isConnected && state.transcripts.length > 0) {
    const exported = vowel.exportState({ maxTurns: 20 });
    localStorage.setItem('vowel-last-session', JSON.stringify(exported));
  }
});

// 2. Restore on next session
const lastSession = localStorage.getItem('vowel-last-session');
if (lastSession) {
  await vowel.startSession({ restoreState: JSON.parse(lastSession) });
}
```

---

## Version History

- **v0.1.2-294** - Initial release of pause/resume and state restoration features
  - Added `pauseSession()` and `resumeSession()` methods
  - Added `exportState()` and `importState()` methods
  - Added `useServerVad` configuration option
  - Added history formatting utilities
  - Added state restoration via `startSession({ restoreState })`

---

## See Also

- [API Reference](./API_REFERENCE.md)
- [Voice Configuration Guide](./VOICE_CONFIG.md)
- [Architecture Documentation](../../docs/architecture/)

