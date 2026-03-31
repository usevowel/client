/**
 * @fileoverview Type definitions for Vowel voice agent
 * 
 * This file contains all TypeScript type definitions, interfaces, and type aliases
 * used throughout the Vowel client library. It defines the contracts for adapters,
 * configuration options, actions, routes, and all other core types.
 * 
 * Key Type Categories:
 * - Adapter interfaces (NavigationAdapter, AutomationAdapter)
 * - Configuration types (VowelClientConfig, VowelVoiceConfig)
 * - Action and route definitions (VowelAction, VowelRoute)
 * - Result and response types
 * - Event notification types
 * 
 * @module @vowel.to/client/types
 * @author vowel.to
 * @license Proprietary
 */

import type { ProviderType } from "./providers";

/**
 * Router adapter interface for navigation
 * @deprecated Use NavigationAdapter instead for the new dual-adapter architecture
 */
export interface RouterAdapter {
  /**
   * Navigate to a path
   */
  navigate(path: string): any;

  /**
   * Get current path
   */
  getCurrentPath(): string;

  /**
   * Optional: Get router-specific context
   */
  getContext?(): any;

  /**
   * Optional: Get available routes from the router
   */
  getRoutes?(): VowelRoute[];
}

/**
 * Navigation adapter interface for voice-controlled routing
 * 
 * Handles WHERE to go in your application. This adapter is responsible for
 * navigating between pages/routes based on voice commands.
 * 
 * @example
 * ```ts
 * // Direct navigation in SPAs
 * const navigationAdapter = new DirectNavigationAdapter({
 *   navigate: (path) => router.push(path),
 *   getCurrentPath: () => router.pathname
 * });
 * 
 * // Controlled navigation for traditional sites
 * const navigationAdapter = new ControlledNavigationAdapter({
 *   channelName: 'vowel-nav'
 * });
 * ```
 */
export interface NavigationAdapter {
  /**
   * Navigate to a specific path
   * @param path - The path to navigate to (e.g., "/products", "/cart")
   */
  navigate(path: string): Promise<void>;

  /**
   * Get the current path
   * @returns Current path (e.g., "/products")
   */
  getCurrentPath(): string;

  /**
   * Optional: Get available routes
   * @returns Array of routes that can be navigated to
   */
  getRoutes?(): Promise<VowelRoute[]>;

  /**
   * Optional: Get additional context about the router
   */
  getContext?(): any;
}

/**
 * Search options for automation adapter
 */
export interface AutomationSearchOptions {
  /** Maximum Levenshtein distance (lower = stricter, default: 3) */
  maxDistance?: number;
  /** Minimum similarity score 0-1 (higher = stricter, default: 0.6) */
  minSimilarity?: number;
  /** Maximum results to return (default: 10) */
  maxResults?: number;
  /** Search in class names (default: true) */
  searchClasses?: boolean;
  /** Search in element IDs (default: true) */
  searchIds?: boolean;
  /** Search in text content (default: true) */
  searchText?: boolean;
  /** Search in placeholders (default: true) */
  searchPlaceholders?: boolean;
  /** Search in aria labels (default: true) */
  searchAriaLabels?: boolean;
  /** Search in element values (default: true) */
  searchValues?: boolean;
  /** Only return interactive elements (default: false) */
  requireInteractive?: boolean;
  /** Only return visible elements (default: true) */
  requireVisible?: boolean;
  /** Filter by tag name (e.g., 'button', 'input') */
  tag?: string;
}

/**
 * Search result from automation adapter
 */
export interface AutomationSearchResult {
  /** Element ID for interaction (e.g., "apple_banana") */
  id: string;
  /** HTML tag name */
  tag: string;
  /** Element type (for inputs) */
  type?: string;
  /** Visible text content */
  text?: string;
  /** Placeholder text */
  placeholder?: string;
  /** ARIA label */
  ariaLabel?: string;
  /** Role */
  role?: string;
  /** Match score (0-1, higher = better) */
  matchScore: number;
  /** Field that matched */
  matchedField?: string;
  /** Value that matched */
  matchedValue?: string;
  /** Whether element is visible */
  visible: boolean;
  /** Whether element is interactive */
  interactive: boolean;
}

/**
 * Search results from automation adapter
 */
export interface AutomationSearchResults {
  /** Search query that was used */
  query: string;
  /** Found elements */
  elements: AutomationSearchResult[];
  /** Total elements searched */
  totalSearched: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Result from automation actions
 */
export interface AutomationActionResult {
  /** Whether the action succeeded */
  success: boolean;
  /** Error message if action failed */
  error?: string;
  /** Additional data from the action */
  data?: any;
}

/**
 * Automation adapter interface for voice-controlled page interaction
 * 
 * Handles WHAT to do on the current page. This adapter is responsible for
 * searching, clicking, typing, and other DOM interactions based on voice commands.
 * 
 * @example
 * ```ts
 * // Direct automation in SPAs
 * const automationAdapter = new DirectAutomationAdapter();
 * 
 * // Controlled automation for traditional sites
 * const automationAdapter = new ControlledAutomationAdapter('vowel-automation');
 * ```
 */
export interface AutomationAdapter {
  /**
   * Search for elements on the page
   * @param query - Search query (e.g., "add to cart button")
   * @param options - Search options
   * @returns Search results with element IDs
   */
  searchElements(query: string, options?: AutomationSearchOptions): Promise<AutomationSearchResults>;

  /**
   * Get a snapshot of the current page structure
   * @returns Page snapshot as text (ARIA tree format)
   */
  getPageSnapshot(): Promise<string>;

  /**
   * Click an element by ID
   * @param id - Element ID from search results
   * @param reason - Optional explanation of why this element is being clicked (shown to user via floating cursor)
   * @returns Action result
   */
  clickElement(id: string, reason?: string): Promise<AutomationActionResult>;

  /**
   * Type text into an input element
   * @param id - Element ID from search results
   * @param text - Text to type
   * @param reason - Optional explanation of why text is being entered (shown to user via floating cursor)
   * @returns Action result
   */
  typeIntoElement(id: string, text: string, reason?: string): Promise<AutomationActionResult>;

  /**
   * Focus an element
   * @param id - Element ID from search results
   * @param reason - Optional explanation of why this element is being focused (shown to user via floating cursor)
   * @returns Action result
   */
  focusElement(id: string, reason?: string): Promise<AutomationActionResult>;

  /**
   * Scroll to an element
   * @param id - Element ID from search results
   * @param reason - Optional explanation of why scrolling to this element (shown to user via floating cursor)
   * @returns Action result
   */
  scrollToElement(id: string, reason?: string): Promise<AutomationActionResult>;

  /**
   * Press a key (e.g., Enter, Escape)
   * @param key - Key name
   * @param reason - Optional explanation of why this key is being pressed (shown to user via floating cursor)
   * @returns Action result
   */
  pressKey(key: string, reason?: string): Promise<AutomationActionResult>;
}

/**
 * Custom action handler function
 */
export type ActionHandler<T = any> = (params: T) => any | Promise<any>;


/**
 * Route definition for voice navigation
 */
export interface VowelRoute {
  /** Route path (e.g., "/products", "/cart") */
  path: string;
  /** Human-readable description for the AI */
  description: string;
  /** Optional query parameters that can be used */
  queryParams?: string[];
  /** Optional metadata for the route */
  metadata?: Record<string, any>;
}

/**
 * Parameter definition for custom actions
 */
export interface VowelActionParameter {
  /** Parameter type (string, number, boolean, array, object) */
  type: "string" | "number" | "boolean" | "array" | "object";
  /** Human-readable description for the AI */
  description: string;
  /** Whether this parameter is optional */
  optional?: boolean;
  /** Enum values if parameter should be restricted to specific values */
  enum?: string[];
}

/**
 * Custom action definition
 */
export interface VowelAction {
  /** Human-readable description of what this action does */
  description: string;
  /** Parameter definitions */
  parameters: Record<string, VowelActionParameter>;
}

/**
 * VAD (Voice Activity Detection) type options
 * @deprecated Use turnDetection.mode instead
 */
export type VADType = "silero" | "simple" | "none";

/**
 * Turn detection mode options
 */
export type TurnDetectionMode = 'server_vad' | 'semantic_vad' | 'client_vad' | 'disabled';

/**
 * Client VAD configuration
 */
export interface ClientVADConfig {
  /**
   * VAD adapter ID (must be registered in VADRegistry)
   */
  adapter: string;
  
  /**
   * Adapter-specific configuration
   */
  config?: Record<string, any>;
  
  /**
   * Whether to automatically commit audio when speech ends
   * @default true
   */
  autoCommit?: boolean;
  
  /**
   * Whether to automatically create response when speech ends
   * @default true
   */
  autoCreateResponse?: boolean;
  
  /**
   * Rolling buffer configuration for capturing audio around VAD segments
   * This ensures we don't miss speech that occurred before or after VAD detection
   */
  rollingBuffer?: {
    /**
     * Duration of audio to capture before speech detection (in milliseconds)
     * @default 3000
     */
    prefixMs?: number;
    
    /**
     * Duration of audio to capture after speech ends (in milliseconds)
     * @default 100
     */
    suffixMs?: number;
  };
}

/**
 * Turn detection configuration
 */
export interface TurnDetectionConfig {
  /**
   * Detection mode
   * @default 'client_vad'
   */
  mode: TurnDetectionMode;
  
  /**
   * Client VAD configuration (for 'client_vad' mode)
   */
  clientVAD?: ClientVADConfig;
  
  /**
   * Server VAD configuration (for 'server_vad' and 'semantic_vad' modes)
   */
  serverVAD?: {
    /**
     * Activation threshold (0 to 1)
     * Higher = more conservative (fewer false positives)
     */
    threshold?: number;
    
    /**
     * Amount of audio (in milliseconds) to include before VAD detected speech
     */
    prefixPaddingMs?: number;
    
    /**
     * Duration of silence (in milliseconds) to detect speech stop
     */
    silenceDurationMs?: number;
    
    /**
     * Eagerness for semantic VAD (low/medium/high/auto)
     */
    eagerness?: 'low' | 'medium' | 'high' | 'auto';
    
    /**
     * Automatically create response when speech ends
     * @default true
     */
    createResponse?: boolean;
    
    /**
     * Allow interruptions during AI response
     * @default true
     */
    interruptResponse?: boolean;
  };
}

/**
 * Tool execution configuration
 * 
 * This configuration controls tool execution limits to prevent infinite loops
 * while allowing the AI to intelligently handle and retry failed tool calls.
 * 
 * **Strategy: AI-Guided Retry**
 * - Tool errors are sent back to the AI as soft failures
 * - AI can analyze the error and retry with corrected parameters
 * - No automatic/hardcoded retries - AI makes intelligent decisions
 * - Failure tracking prevents infinite loops of the same error
 * 
 * @example
 * ```typescript
 * const config = {
 *   _voiceConfig: {
 *     toolRetry: {
 *       maxRetries: 3,       // Max failures per tool before warning
 *       maxSteps: 30         // Max total tool calls per session
 *     }
 *   }
 * };
 * ```
 */
export interface ToolRetryConfig {
  /**
   * Maximum number of consecutive failures allowed per tool
   * 
   * When a tool fails this many times, the AI receives a stern warning
   * to try a different approach or inform the user.
   * 
   * **Note**: This is NOT automatic retry - the AI sees each error and
   * decides whether to retry (possibly with corrected parameters)
   * 
   * @default 3
   */
  maxRetries?: number;
  
  /**
   * Maximum total number of tool execution steps per session
   * 
   * Prevents infinite loops and excessive API usage.
   * When reached, AI is notified and given one final step to ask user how to proceed.
   * 
   * @default 30
   */
  maxSteps?: number;
}

/**
 * Vowel Prime environment names
 */
export type VowelPrimeEnvironment = "local" | "testing" | "dev" | "staging" | "production" | "billing-test";

/**
 * Vowel Prime provider configuration
 * Allows specifying which vowel Prime worker deployment to use
 */
export interface VowelPrimeConfig {
  /** 
   * Full WebSocket URL to vowel Prime worker
   * Example: "wss://testing.prime.vowel.to"
   * If provided, this takes precedence over environment
   */
  workerUrl?: string;
  
  /** 
   * Environment shortcut (auto-maps to correct URL)
   * - "testing": wss://testing.prime.vowel.to
   * - "dev": wss://dev.prime.vowel.to
   * - "staging": wss://staging.prime.vowel.to (default)
   * - "production": wss://prime.vowel.to
   * - "billing-test": wss://billing-test.vowel.to (experimental billing integration)
   */
  environment?: VowelPrimeEnvironment;
}

export type VowelTurnDetectionPreset = 'aggressive' | 'balanced' | 'conservative';

export interface VowelVoiceConfig {
  /** Ephemeral token for direct connections (bypasses token endpoint) */
  token?: string;
  /** Provider to use ("gemini" | "openai" | "grok" | "vowel-core" | "vowel-prime") - determines which realtime voice API to use */
  provider?: ProviderType;
  /** Model to use (e.g., "gemini-live-2.5-flash-preview" or "gemini-2.0-flash-live-001" for Gemini, "gpt-realtime" or "gpt-4o-realtime-preview" for OpenAI) */
  model?: string;
  /** Voice name (e.g., "Puck", "Charon", "Kore", "Fenrir", "Aoede" for Gemini; "alloy", "echo", "fable", "onyx", "nova", "shimmer" for OpenAI) */
  voice?: string;
  /** Language code (e.g., "en-US") */
  language?: string;
  /**
   * Provider audio configuration.
   * Use this to override provider defaults for microphone input and speaker output.
   */
  audioConfig?: {
    input?: {
      sampleRate?: number;
      channels?: number;
      encoding?: string;
      mimeType?: string;
    };
    output?: {
      sampleRate?: number;
      channels?: number;
      encoding?: string;
      mimeType?: string;
    };
  };
  /** Speaking rate for TTS (1.0 = normal, 1.2 = 20% faster, 0.8 = 20% slower, default: 1.2) - for vowel-core/vowel-prime providers only */
  speakingRate?: number;
  /** 
   * VAD type - "simple" uses energy-based detection (fast), "silero" uses ML model (accurate), "none" disables client-side VAD
   * @default undefined (deprecated - use turnDetection.mode instead, which defaults to 'client_vad')
   * @deprecated Use turnDetection instead. The default is now 'client_vad' mode with 'silero-vad' adapter.
   */
  vadType?: VADType;
  /** Use server-side VAD events for UI updates (default: false) - when true, uses server VAD events instead of client-side VAD for speaking state */
  useServerVad?: boolean;
  /**
   * Turn detection configuration
   * Controls how speech is detected and when responses are triggered
   */
  turnDetection?: TurnDetectionConfig;
  /** Tool retry and step limiting configuration */
  toolRetry?: ToolRetryConfig;
  /** Vowel websocket-provider-specific configuration (used by "vowel-core" and "vowel-prime") */
  vowelPrimeConfig?: VowelPrimeConfig;
  /** LLM provider for vowel websocket providers (e.g., "groq", "openrouter") - determines which LLM backend to use */
  llmProvider?: "groq" | "openrouter";
  /** OpenRouter-specific options (only used when llmProvider is "openrouter") */
  openrouterOptions?: {
    /** OpenRouter provider selection (e.g., "anthropic", "openai", "google") */
    provider?: string;
    /** Site URL for OpenRouter analytics */
    siteUrl?: string;
    /** App name for OpenRouter analytics */
    appName?: string;
  };
  /**
   * Initial greeting prompt
   * When provided, the AI will generate an initial response based on this prompt
   * Example: "Introduce yourself as a helpful shopping assistant"
   */
  initialGreetingPrompt?: string;
  /**
   * Force a client-side hibernation after this many milliseconds of inactivity.
   * When the timer elapses, the client disconnects the realtime socket to avoid
   * keeping a billable hosted session open while idle.
   * Example: `10000` disconnects after 10 seconds of idle time.
   */
  clientIdleHibernateTimeoutMs?: number;
  /**
   * Speech turn detection sensitivity preset
   * Controls how quickly the AI responds after you stop speaking
   * - "aggressive": Responds very quickly (best for short, rapid exchanges)
   * - "balanced": Natural middle ground (good for most conversations)
   * - "conservative": Waits longer before responding (best for complex speech, phone numbers, addresses)
   * @default "balanced"
   */
  turnDetectionPreset?: 'aggressive' | 'balanced' | 'conservative';
}

/**
 * Complete Vowel configuration (backend format)
 */
export interface VowelConfig {
  /** App ID */
  appId: string;
  /** Available routes for navigation */
  routes: VowelRoute[];
  /** Custom actions the AI can perform */
  actions: Record<string, VowelAction>;
  /** @deprecated Prefer `_voiceConfig`. */
  voiceConfig?: VowelVoiceConfig;
  _voiceConfig?: VowelVoiceConfig;
  language?: string;
  initialGreetingPrompt?: string;
  turnDetectionPreset?: VowelTurnDetectionPreset;
  /** Custom system instruction (overrides default) */
  systemInstructionOverride?: string;
}

/**
 * Floating cursor appearance configuration
 */
export interface FloatingCursorAppearance {
  /** Cursor color (CSS color value, default: '#2563eb') */
  cursorColor?: string;
  /** Cursor size in pixels (default: 32) */
  cursorSize?: number;
  /** Badge background color (CSS color value, default: '#1e40af') */
  badgeBackground?: string;
  /** Badge text color (CSS color value, default: '#ffffff') */
  badgeTextColor?: string;
  /** Badge font size in pixels (default: 14) */
  badgeFontSize?: number;
  /** Badge padding (CSS padding value, default: '4px 8px') */
  badgePadding?: string;
  /** Badge border radius (CSS value, default: '4px') */
  badgeBorderRadius?: string;
  /** Shadow for cursor (CSS box-shadow, default: '0 4px 6px rgba(0,0,0,0.1)') */
  cursorShadow?: string;
  /** Shadow for badge (CSS box-shadow, default: '0 2px 4px rgba(0,0,0,0.1)') */
  badgeShadow?: string;
}

/**
 * Floating cursor animation configuration
 */
export interface FloatingCursorAnimation {
  /** Enable typing animation for text (default: true) */
  enableTyping?: boolean;
  /** Typing speed in milliseconds per character (default: 50) */
  typingSpeed?: number;
  /** Enable bounce animation when idle (default: true) */
  enableBounce?: boolean;
  /** Transition duration for position changes in ms (default: 1000) */
  transitionDuration?: number;
  /** Transition easing function (default: 'ease-out') */
  transitionEasing?: string;
}

/**
 * Floating cursor behavior configuration
 */
export interface FloatingCursorBehavior {
  /** Auto-hide cursor after delay in ms (0 = never hide, default: 3000) */
  autoHideDelay?: number;
  /** Show cursor during element search (default: true) */
  showDuringSearch?: boolean;
  /** Only show cursor on successful actions (default: false) */
  showOnSuccessOnly?: boolean;
  /** Hide cursor on navigation (default: true) */
  hideOnNavigation?: boolean;
  /** Z-index for cursor element (default: 9999) */
  zIndex?: number;
}

/**
 * Floating cursor configuration
 */
export interface FloatingCursorConfig {
  /** Enable floating cursor feature (default: true) */
  enabled: boolean;
  /** Appearance configuration */
  appearance?: FloatingCursorAppearance;
  /** Animation configuration */
  animation?: FloatingCursorAnimation;
  /** Behavior configuration */
  behavior?: FloatingCursorBehavior;
}

/**
 * Floating cursor update data
 */
export interface FloatingCursorUpdate {
  /** X position as percentage (0-100) */
  x: number;
  /** Y position as percentage (0-100) */
  y: number;
  /** Text to display in badge */
  text: string;
  /** Whether the cursor is idle */
  isIdle?: boolean;
}

/**
 * Vowel client configuration
 */
export interface VowelClientConfig {
  /** App ID for this tenant (string format from Vowel platform) */
  appId?: string;

  /** 
   * Optional: Custom Convex platform URL (base URL)
   * If provided, constructs the token endpoint as `${convexUrl}/vowel/api/generateToken`
   * Useful for pointing to different Convex deployments (dev, staging, production)
   * 
   * @example
   * ```ts
   * const vowel = new Vowel({
   *   appId: 'demo-app',
   *   convexUrl: 'https://my-deployment.convex.site'
   * });
   * ```
   */
  convexUrl?: string;

  /** 
   * Optional: Custom token endpoint URL
   * If provided, overrides the default Vowel platform endpoint
   * Takes precedence over convexUrl if both are provided
   * Useful for self-hosted or proxy token generation
   * 
   * @example
   * ```ts
   * const vowel = new Vowel({
   *   appId: 'demo-app',
   *   tokenEndpoint: 'https://my-server.com/api/token'
   * });
   * ```
   */
  tokenEndpoint?: string;

  /** 
   * Optional: Custom token provider for advanced use cases
   * Allows complete control over token generation (e.g., caching, custom auth)
   * 
   * The token provider should return an object matching this interface:
   * ```ts
   * {
   *   tokenName: string;      // The ephemeral token
   *   model: string;          // AI model name
   *   provider: 'gemini' | 'openai' | 'grok' | 'vowel-prime';
   *   expiresAt: string;      // ISO timestamp
   *   systemInstructions?: string;
   * }
   * ```
   * 
   * @example
   * ```ts
   * const vowel = new Vowel({
   *   appId: 'demo-app',
   *   tokenProvider: async (config) => {
   *     // Custom token generation logic
   *     const response = await fetch('/my-custom-endpoint', {
   *       method: 'POST',
   *       body: JSON.stringify(config)
   *     });
   *     return await response.json();
   *   }
   * });
   * ```
   */
   tokenProvider?: (config: any) => Promise<{
     tokenName: string;
     model: string;
     provider: ProviderType;
     expiresAt: string;
     systemInstructions?: string;
   }>;

  /**
   * Router adapter for navigation (LEGACY - deprecated)
   * @deprecated Use navigationAdapter instead for the new dual-adapter architecture
   */
  router?: RouterAdapter;

  /**
   * Navigation adapter (NEW)
   * Handles WHERE to go (routing)
   * Optional - if not provided, navigation features will be disabled
   */
  navigationAdapter?: NavigationAdapter;

  /**
   * Automation adapter (NEW)
   * Handles WHAT to do (page interaction)
   * Optional - if not provided, page interaction features will be disabled
   */
  automationAdapter?: AutomationAdapter;

  /** Optional: Custom routes (can also be auto-detected from adapters) */
  routes?: VowelRoute[];

  /** @deprecated Prefer `_voiceConfig`. */
  voiceConfig?: VowelVoiceConfig;
  _voiceConfig?: VowelVoiceConfig;
  language?: string;
  initialGreetingPrompt?: string;
  turnDetectionPreset?: VowelTurnDetectionPreset;

  /** Optional: Custom system instructions for the AI agent */
  instructions?: string;
  
  /** 
   * @deprecated Use 'instructions' instead
   * Legacy alias for instructions (from OpenAI SDK compatibility)
   */
  systemInstructionOverride?: string;

  /**
   * Optional: Initial context object to include in system prompt when session starts.
   * This context is automatically sent when the session connects, ensuring the AI
   * has the context available from the start.
   * 
   * You can update context later using `updateContext()` or the `useSyncContext` hook.
   * 
   * @example
   * ```ts
   * const vowel = new Vowel({
   *   appId: 'demo-app',
   *   initialContext: {
   *     page: 'product',
   *     productId: 'iphone-15-pro',
   *     price: 999.99
   *   }
   * });
   * ```
   */
  initialContext?: Record<string, unknown> | null;

  /** Optional: Callback when user speaking state changes */
  onUserSpeakingChange?: (isSpeaking: boolean) => void;

  /** Optional: Callback when AI thinking state changes */
  onAIThinkingChange?: (isThinking: boolean) => void;
  onToolExecutingChange?: (isExecuting: boolean) => void;

  /** Optional: Callback when AI speaking state changes */
  onAISpeakingChange?: (isSpeaking: boolean) => void;

  /** 
   * Optional: Floating cursor configuration
   * By default, floating cursor is enabled. Set enabled: false to disable it.
   * @default { enabled: true }
   */
  floatingCursor?: FloatingCursorConfig;

  /**
   * @internal
   * Optional: Caption system configuration (unofficial dev tool)
   * Enables real-time speech captions displayed as floating toast notifications
   * 
   * @example
   * ```ts
   * const vowel = new Vowel({
   *   appId: 'demo-app',
   *   _caption: {
   *     enabled: true,
   *     position: 'top-center'
   *   }
   * });
   * ```
   */
  _caption?: {
    /** Enable caption display */
    enabled?: boolean;
    /** Caption position */
    position?: 'top-center' | 'bottom-center';
    /** Maximum width of caption */
    maxWidth?: string;
    /** Show role indicator (User/Assistant) */
    showRole?: boolean;
    /** Show captions on mobile devices (default: false) */
    showOnMobile?: boolean;
    /** Show streaming captions as AI responds (default: true) */
    showStreaming?: boolean;
    /** 
     * @internal
     * Debug: Only show accumulated delta sum, ignore final "done" event text
     * Useful for debugging delta accumulation algorithm
     */
    _showDeltaSumOnly?: boolean;
  };

  /** Optional: Border glow configuration */
  borderGlow?: {
    /** Enable border glow feature (default: false) */
    enabled: boolean;
    /** Glow color (CSS color value) */
    color?: string;
    /** Glow intensity (blur radius in pixels) */
    intensity?: number;
    /** Glow width (box-shadow spread in pixels) */
    width?: number;
    /** Animation duration in milliseconds */
    animationDuration?: number;
    /** Z-index for positioning */
    zIndex?: number;
    /** Whether to show pulsing animation */
    pulse?: boolean;
  };

  /** Optional: Floating action pill configuration */
  actionPill?: {
    /** Enable action pill feature (default: false) */
    enabled: boolean;
    /** Position from bottom in pixels */
    bottomOffset?: number;
    /** Auto-hide delay in milliseconds (0 = no auto-hide) */
    autoHideDelay?: number;
    /** Maximum width in pixels */
    maxWidth?: number;
    /** Z-index for positioning */
    zIndex?: number;
    /** Show only on mobile devices */
    mobileOnly?: boolean;
  };

  /** Optional: Typing sound configuration */
  typingSounds?: {
    /** Enable typing sounds (default: true) */
    enabled?: boolean;
    /** Volume multiplier (0.0 to 1.0, default: 0.3) */
    volume?: number;
    /** Custom typing sound URL (default: assets.vowel.to/typing-sound.pcm) */
    typingSoundUrl?: string;
    /** Custom click sound URL (default: assets.vowel.to/mouse-click-sound.pcm) */
    clickSoundUrl?: string;
    /** Minimum segment duration in ms (default: 200) */
    minSegmentDurationMs?: number;
    /** Maximum segment duration in ms (default: 800) */
    maxSegmentDurationMs?: number;
    /** Minimum pause duration in ms (default: 300) */
    minPauseDurationMs?: number;
    /** Maximum pause duration in ms (default: 1500) */
    maxPauseDurationMs?: number;
    /** Probability of click sound vs typing (0.0 to 1.0, default: 0.15) */
    clickSoundProbability?: number;
  };

  /** 
   * Optional: Dark mode configuration
   * Controls the appearance theme of vowel UI components
   * 
   * @example
   * ```ts
   * const vowel = new Vowel({
   *   appId: 'demo-app',
   *   darkMode: {
   *     enabled: true, // Enable dark mode
   *     storageKeyPrefix: 'my-app' // Optional: custom storage key prefix
   *   }
   * });
   * ```
   */
  darkMode?: {
    /** Enable dark mode (default: follows system preference) */
    enabled?: boolean;
    /** Storage key prefix for persisting preference (default: 'vowel') */
    storageKeyPrefix?: string;
  };
}


/**
 * Transcript entry
 */
export interface VowelTranscript {
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

/**
 * Voice session state
 */
export interface VowelLiveState {
  isConnecting: boolean;
  isConnected: boolean;
  status: string;
  transcripts: VowelTranscript[];
  /** User is actively speaking (detected by client-side VAD) */
  isUserSpeaking: boolean;
  /** AI is processing/generating response (tool calls, waiting for first response) */
  isAIThinking: boolean;
  /** AI is executing a tool (different shade of yellow indicator) */
  isToolExecuting: boolean;
  /** AI is delivering audio response */
  isAISpeaking: boolean;
}

/**
 * Tool execution result
 */
export interface VowelToolResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Event notification options for programmatic AI notifications
 */
export interface VowelEventNotificationOptions {
  /** Description of the event that occurred */
  eventDetails: string;
  /** Optional context object with additional information */
  context?: Record<string, any>;
}

/**
 * Event notification context - structured data about an event
 * @example
 * ```ts
 * const context: VowelEventContext = {
 *   type: 'order',
 *   orderId: '12345',
 *   status: 'completed',
 *   total: 99.99,
 *   timestamp: new Date().toISOString()
 * };
 * ```
 */
export type VowelEventContext = Record<string, string | number | boolean | null | undefined>;
