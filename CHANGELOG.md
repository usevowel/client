# Changelog

All notable changes to the Vowel Client library will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Pause/Resume Sessions and State Persistence (v0.1.2-295)

Added comprehensive session control and conversation persistence features for better user experience and session management.

**Pause/Resume Sessions:**
- `pauseSession()` - Temporarily mute microphone while keeping WebSocket connection alive
- `resumeSession()` - Unmute microphone and resume voice input
- Useful for taking phone calls, temporary interruptions, or reducing bandwidth
- No reconnection needed - maintains conversation context

**State Export/Import:**
- `exportState({ maxTurns })` - Export conversation history for persistence
- `importState(savedState)` - Import previously saved conversation state
- `startSession({ restoreState })` - Start session with restored conversation context
- Supports localStorage, sessionStorage, IndexedDB, or any storage mechanism
- Automatic history formatting and token truncation (32k tokens default)

**Server-Side VAD:**
- `useServerVad` configuration option for more accurate speech detection
- Uses server VAD events from AssemblyAI/Fennec STT providers
- Lower CPU usage compared to client-side VAD
- Consistent behavior across devices
- Recommended for Vowel Prime provider

**Technical Details:**
- Added `AudioManager.setMuted()` for audio stream control
- Added `StateManager.exportState()` and `importState()` methods
- Added `historyFormatter.ts` utility for conversation history formatting
- Added `SessionManager.pauseVAD()` and `resumeVAD()` methods
- Added server VAD event handling (`AUDIO_BUFFER_SPEECH_STARTED`, `AUDIO_BUFFER_SPEECH_STOPPED`)
- History injection into system prompt with automatic truncation
- Token limit: 32,000 tokens (~128k characters)

**Developer Experience:**
- Simple API: `await vowel.pauseSession()` / `await vowel.resumeSession()`
- Easy persistence: `localStorage.setItem('state', JSON.stringify(vowel.exportState()))`
- Seamless restoration: `await vowel.startSession({ restoreState: saved })`
- Comprehensive documentation in `PAUSE_RESUME_AND_STATE_RESTORATION.md`

**Use Cases:**
- Persist conversations across page reloads
- Resume conversations after network interruptions
- Implement "conversation history" features
- Cross-tab conversation sync
- Temporary session pausing (phone calls, etc.)

See `docs/guides/PAUSE_RESUME_AND_STATE_RESTORATION.md` for complete guide with examples.

### Added

#### Fixed Floating Cursor Positioning Bug

Fixed critical CSS positioning bug where the floating cursor appeared far from the target element.

**Root Cause:**
The cursor was calculating the center point of the target element correctly, but CSS `left/top` properties position the **top-left corner** of an element, not its center. This caused the cursor to be offset from the target by approximately half its width and height.

**Primary Fix:**
- Added `transform: translate(-50%, -50%)` to FloatingCursorComponent
- This centers the cursor on the calculated target point
- Fixes 90% of positioning issues, especially for navigation elements

**Secondary Improvements:**
- **Multi-factor Scoring System**: Elements are now scored based on multiple criteria:
  - Exact text match: +0.5 score boost
  - Visible in viewport: +0.3 score boost
  - In top 20% of viewport (navigation area): +0.2 score boost
- **Visibility Detection**: Prioritizes visible elements over hidden ones
- **Navigation Preference**: Elements in navigation areas (top of page) get higher priority
- **Enhanced Debug Logging**: Detailed logs show position calculations, element matching, and cursor placement

**Technical Details:**
- Modified `FloatingCursorComponent.tsx` with CSS transform
- Enhanced `FloatingCursorManager.calculateElementPosition()` with detailed logging
- Enhanced `FloatingCursorManager.findElementByVowelId()` with multi-factor scoring
- Added `FloatingCursorManager.isElementVisible()` to check viewport and CSS visibility
- Added `FloatingCursorManager.getElementSelector()` for human-readable element identification

**Developer Experience:**
- Cursor now accurately positions on all elements
- Better element selection when multiple elements have similar text
- Easier debugging with comprehensive console logs showing position calculations
- See `docs/FLOATING_CURSOR_POSITIONING_FIX.md` for detailed diagnostics guide

#### Interrupt Handling and Session Timeout Support (Vowel Prime & OpenAI)

Added comprehensive support for audio interrupts and session timeout management when using providers based on the OpenAI Realtime API protocol (Vowel Prime and OpenAI providers).

**Interrupt Handling:**
- User can speak over AI and audio playback stops immediately
- No overlapping audio or audio artifacts
- Automatic cleanup of audio queues and playback state
- Seamless conversational flow

**Session Timeout Handling:**
- Graceful handling of idle timeouts (no speech detected)
- Graceful handling of max call duration limits
- Friendly disconnect messages (not error messages)
- Automatic resource cleanup

**Technical Details:**
- Added `RealtimeMessageType.AUDIO_INTERRUPTED` message type
- Added `RealtimeMessageType.SESSION_TIMEOUT` message type
- Enhanced `VowelPrimeRealtimeProvider` with interrupt event listener and timeout handling
- Enhanced `OpenAIRealtimeProvider` with interrupt event listener and timeout handling
- Both providers now configure `turnDetection.interruptResponse: true`
- Enhanced error handling to detect session timeout (nested error structure)
- `SessionManager` automatically calls `AudioManager.stopAllAudio()` on interrupt
- Session timeouts handled as graceful disconnects, not errors

**Developer Experience:**
- No configuration required - works automatically
- No additional code needed in applications
- Status updates reflect current state
- Clean audio playback experience
- Comprehensive logging for debugging (see `INTERRUPT_LOGGING_GUIDE.md`)

**Logging & Debugging:**
- Enhanced console logging throughout interrupt/timeout flow
- Detailed state tracking in AudioManager (sources, timing, state)
- Visual separator lines for easy event identification in console
- Timestamps for performance monitoring
- Provider-specific logging (Vowel Prime vs OpenAI)

See `docs/INTERRUPT_AND_TIMEOUT_HANDLING.md` for detailed documentation and `docs/INTERRUPT_LOGGING_GUIDE.md` for debugging guide.

### Changed

#### Default VAD Type Changed to 'simple' (Breaking Change)

**Breaking Change:** The default VAD type has been changed from `'silero'` to `'simple'` for faster initialization and better out-of-the-box user experience.

**Impact:**
- Users will now get instant VAD initialization (no 5-10s model download wait)
- Good accuracy for most scenarios
- If maximum accuracy is needed, explicitly set `vadType: 'silero'`

**Migration:**
```typescript
// To restore previous Silero behavior
const vowel = new Vowel({
  appId: 'your-app-id',
  voiceConfig: {
    vadType: 'silero'  // Explicitly use Silero
  }
});
```

### Added

#### Configurable VAD (Voice Activity Detection) Types

Added support for multiple VAD types to provide flexibility between accuracy and load time.

**New Configuration Option:**
- `voiceConfig.vadType` - Choose VAD implementation type:
  - `'simple'` (default) - Energy-based VAD algorithm (instant load, good accuracy)
  - `'silero'` - ML-based VAD using Silero model (highest accuracy, 5-10s load time)
  - `'none'` - Disable client-side VAD (rely on server-side detection only)

**New Implementation:**
- `SimpleVAD` class - Energy-based VAD using Web Audio API
  - RMS (Root Mean Square) energy analysis
  - Configurable energy threshold and redemption frames
  - No model download required (instant initialization)
- Enhanced `VADManager` - Supports all three VAD types with dynamic loading
  - Lazy loading for SimpleVAD (reduces bundle size)
  - Graceful fallback when VAD initialization fails
  - Unified interface across all VAD types

**Use Cases:**
- **Default (simple)** - Fast initialization with good accuracy for most scenarios
- **High accuracy (silero)** - Maximum accuracy in noisy or challenging environments
- **Development (simple)** - Fast testing and iteration without model downloads
- **Troubleshooting (none)** - Debug issues by disabling client-side VAD

**Example:**
```typescript
const vowel = new Vowel({
  appId: 'your-app-id',
  voiceConfig: {
    vadType: 'simple'  // Use fast energy-based VAD
  }
});
```

**Documentation:**
- Updated README with VAD type comparison table
- Enhanced demo documentation with VAD configuration examples

#### Speaking State Tracking Feature

Real-time tracking of speaking states during voice sessions, enabling responsive UI that reflects who is speaking and what the AI is doing.

**New State Properties:**
- `isUserSpeaking` - User is actively speaking (detected by client-side VAD)
- `isAIThinking` - AI is processing/generating response (tool calls, waiting for first response)
- `isAISpeaking` - AI is delivering audio response

**New Callbacks:**
- `onUserSpeakingChange(isSpeaking: boolean)` - Called when user speaking state changes
- `onAIThinkingChange(isThinking: boolean)` - Called when AI thinking state changes
- `onAISpeakingChange(isSpeaking: boolean)` - Called when AI speaking state changes

**New Methods:**
- `vowel.isUserSpeaking()` - Check if user is currently speaking
- `vowel.isAIThinking()` - Check if AI is currently thinking/processing
- `vowel.isAISpeaking()` - Check if AI is currently speaking

**New Managers:**
- `VADManager` - Client-side voice activity detection using Silero VAD
- Integrated with `@ricky0123/vad-web` for real-time speech detection (<100ms latency)

**Enhanced Components:**
- `VowelAgent` - Visual indicators for all three states (blue/yellow/purple pulsing rings)
- `VowelMicrophone` - State-specific colors and animations
- Status badges showing "🎤 Listening", "🧠 AI Thinking", "🔊 AI Speaking"
- Transcript panel highlighting active speaker with pulsing animations

**Use Cases:**
- Dynamic UI that responds to conversation flow
- Mute notifications during AI speech
- Visual feedback for user speech detection
- Loading indicators during AI processing
- Analytics tracking for conversation metrics
- Context-aware page dimming/highlighting

**Documentation:**
- Complete guide: [SPEAKING_STATE_TRACKING.md](./docs/SPEAKING_STATE_TRACKING.md)
- Architecture documentation with VAD details
- Performance considerations and optimization tips
- Browser compatibility guide
- Troubleshooting section

**Examples:**
- Comprehensive examples: [speaking-state-example.tsx](./examples/speaking-state-example.tsx)
- 10+ usage patterns covering common scenarios
- Integration examples with Redux, Zustand, Context API

**Example Usage:**
```typescript
// Using callbacks
const vowel = new Vowel({
  appId: 'your-app-id',
  router: routerAdapter,
  routes: [...],
  
  onUserSpeakingChange: (isSpeaking) => {
    console.log('User speaking:', isSpeaking);
  },
  
  onAIThinkingChange: (isThinking) => {
    console.log('AI thinking:', isThinking);
  },
  
  onAISpeakingChange: (isSpeaking) => {
    console.log('AI speaking:', isSpeaking);
  },
});

// Using state in React
const { state } = useVowel();
if (state.isUserSpeaking) {
  // User is speaking
}
if (state.isAIThinking) {
  // Show loading indicator
}
if (state.isAISpeaking) {
  // Mute notifications
}
```

**Technical Details:**
- Client-side VAD: Silero model via ONNX Runtime Web (~1-2MB, <100ms latency)
- Server-side VAD: Gemini's built-in VAD remains active for accuracy
- AI thinking detection: Tool calls + 500ms silence timeout
- AI speaking detection: Audio playback tracking + `turnComplete` messages
- Zero breaking changes - fully backward compatible

**Performance:**
- Model loading: ~1-2 seconds on first use (cached thereafter)
- Runtime overhead: <5ms per audio frame
- Memory usage: ~10-20MB additional
- Browser support: Chrome 90+, Firefox 78+, Edge 90+ (WebAssembly required)

## [0.1.2] - 2025-10-24

### Added

#### Event Notifications Feature

Programmatically trigger AI voice responses without requiring user speech input. This enables proactive voice notifications for important app events.

**New Methods:**
- `vowel.notifyEvent(eventDetails, context?)` - Trigger AI voice notification for an event
- `vowel.sendText(text)` - Send raw text to the AI for processing
- React hooks now expose `notifyEvent` and `sendText` via `useVowel()`

**New Types:**
- `VowelEventNotificationOptions` - Event notification parameters
- `VowelEventContext` - Structured event context data

**Use Cases:**
- Timer/countdown completions
- Order status updates
- Shopping cart changes
- Background task completions
- Form submissions
- Real-time alerts and notifications

**Documentation:**
- Complete guide: [EVENT_NOTIFICATIONS.md](./docs/EVENT_NOTIFICATIONS.md)
- Quick start: [EVENT_NOTIFICATIONS_QUICK_START.md](./docs/EVENT_NOTIFICATIONS_QUICK_START.md)

**Examples:**
- React patterns: [event-notifications-example.tsx](./examples/event-notifications-example.tsx)
- Vanilla JS: [event-notifications-vanilla.ts](./examples/event-notifications-vanilla.ts)

**Example Usage:**
```typescript
// Simple notification
await vowel.notifyEvent('Order placed successfully!');

// With context
await vowel.notifyEvent('Download complete', {
  fileName: 'report.pdf',
  size: '2.4 MB'
});

// React hook
const { notifyEvent, state } = useVowel();
if (state.isConnected) {
  await notifyEvent('Event occurred');
}
```

**Breaking Changes:** None - fully backward compatible

**Implementation Details:**
- Leverages Gemini Live API's `sendRealtimeInput()` method
- Text prompts trigger natural language audio responses
- Integrated with existing SessionManager and AudioManager
- Full TypeScript support with comprehensive type definitions
- Zero performance overhead (uses existing WebSocket connection)

## [0.1.1] - 2025-01-XX

### Initial Release

- Core voice agent functionality
- React components and hooks
- Web component support
- Standalone JavaScript bundle
- TanStack Router adapter
- Shopify platform integration
- Custom action registration
- Voice configuration options
- Multi-format distribution (ESM, CJS, UMD)

