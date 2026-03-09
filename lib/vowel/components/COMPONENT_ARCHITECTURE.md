# Voice Nag & Terms Modal - Component Architecture

## Component Hierarchy

```
VowelAgent (Main Container)
│
├── TermsPrivacyModal (Optional, z-index: 9999)
│   ├── Backdrop (Semi-transparent overlay)
│   └── Modal Content
│       ├── Header (Title, Close button)
│       ├── Tabs (If both terms & privacy provided)
│       ├── Content Area (Scrollable)
│       └── Footer (Accept/Decline buttons)
│
├── Main Voice Agent UI (z-index: 50)
│   ├── Transcript Panel (Optional)
│   │   ├── Header with Clear button
│   │   └── Scrollable transcript list
│   │
│   ├── VoiceNagWrapper (Optional wrapper)
│   │   ├── Nag Content Box
│   │   │   ├── Icon + Title
│   │   │   ├── Description text
│   │   │   └── "Got it" button + X button
│   │   │
│   │   └── FloatingMicButton (wrapped)
│   │       └── Mic icon with state animations
│   │
│   └── Transcript Toggle Button (Optional)
│
```

## Data Flow

```
User Action Flow:

1. Page Load
   ├─> Check localStorage for nag dismissal
   ├─> Check localStorage for terms acceptance
   └─> Render components accordingly

2. User Clicks Mic Button (First Time)
   ├─> If enableTermsModal === true
   │   ├─> Check localStorage for acceptance
   │   ├─> If not accepted:
   │   │   ├─> Show TermsPrivacyModal
   │   │   └─> Block connection
   │   └─> If accepted:
   │       └─> Proceed with connection
   │
   └─> If enableNag === true
       ├─> Auto-dismiss nag
       └─> Store usage in localStorage

3. User Accepts Terms
   ├─> Store acceptance in localStorage
   ├─> Store timestamp in localStorage
   ├─> Close modal
   └─> Trigger voice connection

4. User Dismisses Nag
   ├─> Store dismissal in localStorage
   └─> Hide nag wrapper
```

## State Management

```typescript
// VowelAgent State
const [showPanel, setShowPanel] = useState(false);
const [isAttemptingConnection, setIsAttemptingConnection] = useState(false);
const connectionBlockedRef = useRef(false);

// VoiceNagWrapper State (Internal)
const [showNag, setShowNag] = useState(false);
const [hasUsedVoiceAgent, setHasUsedVoiceAgent] = useState(false);

// TermsPrivacyModal State (Internal)
const [isOpen, setIsOpen] = useState(false);
const [hasAccepted, setHasAccepted] = useState(false);
const [activeTab, setActiveTab] = useState<"terms" | "privacy">("terms");
```

## LocalStorage Schema

```javascript
// Voice Nag Storage Keys
{
  "{prefix}-dismissed": "true" | null,  // Manual dismissal
  "{prefix}-used": "true" | null        // Auto-dismiss via usage
}

// Terms & Privacy Storage Keys
{
  "{prefix}-accepted": "true" | null,           // Acceptance state
  "{prefix}-timestamp": "2025-10-30T12:34:56Z" | null  // ISO timestamp
}
```

## Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        User Visits Page                      │
└───────────────────────────────┬─────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Load VowelAgent     │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼────────────┐
                    │  Check localStorage    │
                    │  - Nag dismissed?      │
                    │  - Terms accepted?     │
                    └───────────┬────────────┘
                                │
                ┌───────────────┴────────────────┐
                │                                │
    ┌───────────▼────────────┐      ┌──────────▼──────────┐
    │  Nag not dismissed     │      │  Terms not accepted │
    │  Show nag wrapper      │      │  Prepare modal      │
    └───────────┬────────────┘      └──────────┬──────────┘
                │                                │
                │                                │
    ┌───────────▼────────────────────────────────▼──────────┐
    │              User Clicks Mic Button                    │
    └───────────┬────────────────────────────────┬──────────┘
                │                                │
    ┌───────────▼────────────┐      ┌──────────▼──────────┐
    │  Terms modal enabled?  │      │  Nag wrapper shown? │
    └───────────┬────────────┘      └──────────┬──────────┘
                │                                │
        ┌───────┴───────┐                ┌──────┴──────┐
        │               │                │             │
    ┌───▼──────┐  ┌────▼────────┐  ┌───▼───────┐ ┌──▼────────┐
    │  Terms   │  │  Terms      │  │  Auto-    │ │  Already  │
    │  not     │  │  already    │  │  dismiss  │ │  dismissed│
    │  accepted│  │  accepted   │  │  nag      │ │           │
    └───┬──────┘  └────┬────────┘  └───┬───────┘ └──┬────────┘
        │              │                │             │
    ┌───▼──────────┐   │            ┌───▼─────────────▼────────┐
    │  Show Modal  │   │            │  Store in localStorage  │
    │  Block       │   │            └───┬─────────────────────┘
    │  Connection  │   │                │
    └───┬──────────┘   │                │
        │              │                │
    ┌───▼──────────┐   │                │
    │  User        │   │                │
    │  Accepts     │   │                │
    └───┬──────────┘   │                │
        │              │                │
    ┌───▼──────────────▼────────────────▼────────────┐
    │         Proceed with Voice Connection           │
    │         - Open content window (Shopify)         │
    │         - Initialize voice session              │
    └─────────────────────────────────────────────────┘
```

## Component Communication

```typescript
// Parent -> Child Communication (Props)
VowelAgent
  ↓ [Props: enabled, title, description, etc.]
  ├→ VoiceNagWrapper
  │   ↓ [Props: isConnected]
  │   └→ Monitors connection state for auto-dismiss
  │
  └→ TermsPrivacyModal
      ↓ [Props: isAttemptingConnection, blockConnection]
      └→ Blocks connection when not accepted

// Child -> Parent Communication (Callbacks)
VoiceNagWrapper
  ↑ [onDismiss callback]
  ├→ VowelAgent
  └→ Logs dismissal event

TermsPrivacyModal
  ↑ [onAccept / onDecline callbacks]
  ├→ VowelAgent
  └→ Triggers connection or blocks

// Sibling Communication (Via Parent State)
VoiceNagWrapper state.isConnected
  ↑ [monitored]
  ├→ useVowel() context
  └→ Triggers auto-dismiss
```

## Z-Index Layers

```
Layer 5 (z-index: 9999)  TermsPrivacyModal (top)
                          └─ Backdrop (z-index: 9998)

Layer 4 (z-index: 999998) FloatingMicButton (standalone mode)

Layer 3 (z-index: 50)     VowelAgent main container
                          ├─ VoiceNagWrapper
                          ├─ Transcript panel
                          └─ Toggle button

Layer 2                   VowelProvider context

Layer 1                   Application content
```

## Positioning Logic

```typescript
// VoiceNagWrapper Layout
position: "bottom-right" → Button on right, content on left
position: "bottom-left"  → Button on left, content on right
position: "top-right"    → Button on right, content on left
position: "top-left"     → Button on left, content on right

// TermsPrivacyModal
Always centered on screen, responsive max-width
```

## Styling Architecture

```
Tailwind CSS Classes
├─ Base styles (from styles.css)
├─ Component-specific classes
│  ├─ VoiceNagWrapper
│  │  ├─ bg-white/95 dark:bg-gray-900/95
│  │  ├─ backdrop-blur-xl
│  │  └─ animate-in slide-in-from-bottom-4
│  │
│  └─ TermsPrivacyModal
│     ├─ bg-black/50 (backdrop)
│     ├─ animate-in zoom-in-95
│     └─ max-h-[90vh] (responsive)
│
└─ Dark mode support
   └─ All components use dark: variants
```

## Accessibility Features

```
ARIA Labels
├─ VoiceNagWrapper
│  └─ aria-label="Dismiss" on close button
│
└─ TermsPrivacyModal
   ├─ aria-label="Close" on close button
   └─ role="dialog" (implicit via modal structure)

Keyboard Navigation
├─ Tab order follows logical flow
├─ ESC key closes modal (when decline allowed)
└─ Enter key on buttons

Screen Reader Support
├─ Semantic HTML structure
├─ Heading hierarchy (h2, h3)
└─ Descriptive button text
```

## Performance Considerations

```
Optimization Strategies
├─ Conditional rendering (only when enabled)
├─ useState for local state (not global)
├─ useEffect with proper dependencies
├─ localStorage access is synchronous (fast)
├─ No unnecessary re-renders
└─ Lightweight bundle size (~15KB gzipped)

Lazy Loading
├─ Components only load when enabled
├─ No impact when features disabled
└─ Tree-shakeable exports
```

## Integration Points

```
Web Component (vowel-voice-widget)
    ↓
VowelWebComponentWrapper
    ↓ [passes all props]
VowelProvider
    ↓
VowelAgent
    ↓ [wraps with optional features]
    ├→ VoiceNagWrapper
    │   └→ FloatingMicButton
    │
    └→ TermsPrivacyModal
```

## State Persistence Strategy

```
localStorage Read/Write Pattern:

1. Component Mount
   ├─> useEffect(() => {
   │     const stored = localStorage.getItem(key);
   │     setState(stored === "true");
   │   }, []);
   │
2. User Interaction
   └─> handler() => {
         localStorage.setItem(key, "true");
         setState(true);
       }

Error Handling:
├─ try/catch around localStorage access
├─ Graceful fallback to default state
└─ Console warnings for debugging
```

## Testing Strategy

```
Unit Tests (Potential)
├─ VoiceNagWrapper
│  ├─ Renders when enabled
│  ├─ Dismisses on button click
│  ├─ Auto-dismisses on connection
│  └─ Persists to localStorage
│
└─ TermsPrivacyModal
   ├─ Blocks connection when not accepted
   ├─ Shows tabs when both terms & privacy
   ├─ Persists acceptance to localStorage
   └─ Triggers callbacks correctly

Integration Tests
├─ Full user flow (nag → terms → connect)
├─ LocalStorage persistence across reloads
└─ Web component attribute binding
```

---

**This architecture provides**:
- ✅ Clear separation of concerns
- ✅ Minimal coupling between components
- ✅ Type-safe prop passing
- ✅ Flexible configuration
- ✅ Maintainable code structure
- ✅ Production-ready implementation

