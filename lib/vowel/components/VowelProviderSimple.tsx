/**
 * @fileoverview Vowel Provider - React Context wrapper for Vowel client
 * 
 * This file contains the `VowelProvider` React component which wraps the Vowel
 * client in a React Context, making it accessible throughout your React application.
 * It provides hooks for accessing the client, session state, and control functions.
 * 
 * Features:
 * - React Context integration
 * - Automatic state synchronization
 * - Type-safe hooks (useVowel)
 * - Session lifecycle management
 * - Event notification support
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license MIT
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { Vowel } from "../core";
import type { VoiceSessionState } from "../managers";
import { FloatingCursorProvider } from "./FloatingCursorProvider";
import type { FloatingCursorConfig } from "../types";
import "../styles/styles.css";

/**
 * Vowel Context type
 */
export interface VowelContextType {
  /** Vowel client instance (null if not initialized) */
  client: Vowel | null;
  
  /** Current session state */
  state: VoiceSessionState;
  
  /** Start a voice session */
  startSession: () => Promise<void>;
  
  /** Stop the current session */
  stopSession: () => void;
  
  /** Toggle session on/off */
  toggleSession: () => Promise<void>;
  
  /** Clear transcript history */
  clearTranscripts: () => void;
  
  /**
   * Notify the AI about an app event
   * Triggers an AI voice response without requiring user speech input
   * 
   * @param eventDetails - Description of the event
   * @param context - Optional context data
   */
  notifyEvent: (eventDetails: string, context?: Record<string, any>) => Promise<void>;
  
  /**
   * Send text to the AI for processing
   * Lower-level method for custom text interactions
   * 
   * @param text - Text to send to the AI
   */
  sendText: (text: string) => Promise<void>;
  
  /**
   * Update the dynamic context that gets appended to system prompt.
   * Context is stringified, wrapped in `<context>` tags and sent via session.update.
   * 
   * When context changes, a session.update event is automatically sent
   * to update the system prompt so the AI knows about the current context.
   * 
   * @param context - Context object to append to system prompt. Use null to clear.
   * 
   * @example
   * ```tsx
   * const { updateContext } = useVowel();
   * 
   * useEffect(() => {
   *   updateContext({ page: 'product', productId: 'iphone-15-pro' });
   *   return () => updateContext(null); // Clear on unmount
   * }, [product]);
   * ```
   */
  updateContext: (context: Record<string, unknown> | null) => void;
  
  /**
   * Get current context value
   * 
   * @returns Current context object (null if no context set)
   * 
   * @example
   * ```tsx
   * const { getContext } = useVowel();
   * const currentContext = getContext();
   * ```
   */
  getContext: () => Record<string, unknown> | null;
}

const VowelContext = createContext<VowelContextType | null>(null);

/**
 * Props for VowelProvider
 */
export interface VowelProviderProps {
  /** Vowel client instance (can be null if not yet initialized) */
  client: Vowel | null;
  
  /** Children to render */
  children: ReactNode;
  
  /** 
   * Optional: Floating cursor configuration for React mode
   * When enabled, cursor will be rendered as a native React component
   * 
   * @default { enabled: true } (enabled by default)
   * 
   * Set to false to disable:
   * @example
   * ```tsx
   * <VowelProvider client={client} floatingCursor={false}>
   *   <VowelAgent />
   * </VowelProvider>
   * ```
   * 
   * Or customize appearance:
   * @example
   * ```tsx
   * <VowelProvider 
   *   client={client}
   *   floatingCursor={{ 
   *     enabled: true,
   *     appearance: { cursorColor: '#2563eb' }
   *   }}
   * >
   *   <VowelAgent />
   * </VowelProvider>
   * ```
  */
  floatingCursor?: FloatingCursorConfig | false;

  /**
   * How to handle transient null clients.
   *
   * - `sticky` (default): keep the last known good client across transient nulls.
   * - `strict`: immediately clear the active client when prop becomes null.
   */
  clientMode?: "sticky" | "strict";

  /**
   * In sticky mode, how long to wait before releasing an idle client after prop=null.
   *
   * This timeout is ignored while a session is live (connected/connecting/resuming/disconnecting).
   *
   * @default 5000
   */
  nullClientGraceMs?: number;
}

/**
 * Default empty state when no client is available
 */
const defaultEmptyState: VoiceSessionState = {
  isConnecting: false,
  isConnected: false,
  isDisconnecting: false,
  isResuming: false,
  status: "",
  transcripts: [],
  isUserSpeaking: false,
  isAIThinking: false,
  isToolExecuting: false,
  isAISpeaking: false,
  isHibernated: false,
  error: null,
};

/**
 * Provider component for Vowel voice agent
 * Wrap your app with this to enable voice interactions
 * 
 * This is the ONLY provider users need to manage.
 * Floating cursor is enabled by default and automatically wrapped.
 * 
 * @example Basic usage (floating cursor enabled by default)
 * ```tsx
 * import { VowelProvider, VowelAgent } from '@vowel.to/client/react';
 * import { vowel } from './vowel.client';
 * 
 * function App() {
 *   return (
 *     <VowelProvider client={vowel}>
 *       <VowelAgent />
 *     </VowelProvider>
 *   );
 * }
 * ```
 * 
 * @example Disable floating cursor
 * ```tsx
 * <VowelProvider client={vowel} floatingCursor={false}>
 *   <VowelAgent />
 * </VowelProvider>
 * ```
 * 
 * @example Customize floating cursor
 * ```tsx
 * <VowelProvider 
 *   client={vowel}
 *   floatingCursor={{ 
 *     enabled: true,
 *     appearance: { cursorColor: '#2563eb' }
 *   }}
 * >
 *   <VowelAgent />
 * </VowelProvider>
 * ```
 */
export function VowelProvider({
  client,
  children,
  floatingCursor,
  clientMode = "sticky",
  nullClientGraceMs = 5000,
}: VowelProviderProps) {
  // Active client is sticky by default so transient null props do not tear down UI/session state.
  const [activeClient, setActiveClient] = useState<Vowel | null>(client);

  // Use default empty state when no active client is available
  const [state, setState] = useState<VoiceSessionState>(
    activeClient?.state ?? defaultEmptyState
  );

  // Track previous active client for diagnostics.
  const previousClientRef = useRef<Vowel | null>(activeClient);

  // Update active client based on configured null-handling mode.
  useEffect(() => {
    if (client) {
      setActiveClient((previous) => (previous === client ? previous : client));
      return;
    }

    if (clientMode === "strict") {
      setActiveClient(null);
    }
  }, [client, clientMode]);

  // In sticky mode, release idle client after grace period when prop remains null.
  useEffect(() => {
    if (clientMode !== "sticky" || client || !activeClient) {
      return;
    }

    const hasLiveSession =
      state.isConnected ||
      state.isConnecting ||
      state.isResuming ||
      state.isDisconnecting;

    if (hasLiveSession) {
      console.log("🔔 [VowelProvider] Sticky mode retaining live client while prop is null");
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      setActiveClient((current) => (current === activeClient ? null : current));
    }, nullClientGraceMs);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [clientMode, client, activeClient, state.isConnected, state.isConnecting, state.isResuming, state.isDisconnecting, nullClientGraceMs]);

  useEffect(() => {
    // If no active client, nothing to subscribe to
    if (!activeClient) {
      console.log("🔔 [VowelProvider] No client available, using default empty state");
      setState(defaultEmptyState);
      return;
    }

    if (previousClientRef.current !== activeClient) {
      console.log("🔁 [VowelProvider] Active client changed");
      previousClientRef.current = activeClient;
    }

    console.log("🔔 [VowelProvider] Subscribing to state changes from client:", activeClient);

    // Sync immediately in case state changed before subscription mounted.
    setState(activeClient.state ?? defaultEmptyState);
    
    // Subscribe to state changes from the client
    const unsubscribe = activeClient.onStateChange((newState) => {
      console.log("🔔 [VowelProvider] Received state update:", newState);
      setState(newState);
    });

    return () => {
      console.log("🔕 [VowelProvider] Unsubscribing from state changes");
      unsubscribe();
    };
  }, [activeClient]);

  // Memoize functions to prevent unnecessary re-renders
  const startSession = useCallback(() => activeClient?.startSession() ?? Promise.resolve(), [activeClient]);
  const stopSession = useCallback(() => activeClient?.stopSession(), [activeClient]);
  const toggleSession = useCallback(() => activeClient?.toggleSession() ?? Promise.resolve(), [activeClient]);
  const clearTranscripts = useCallback(() => activeClient?.clearTranscripts(), [activeClient]);
  const notifyEvent = useCallback(
    (eventDetails: string, context?: Record<string, any>) => 
      activeClient?.notifyEvent(eventDetails, context) ?? Promise.resolve(),
    [activeClient]
  );
  const sendText = useCallback((text: string) => activeClient?.sendText(text) ?? Promise.resolve(), [activeClient]);
  const updateContext = useCallback(
    (context: Record<string, unknown> | null) => activeClient?.updateContext(context),
    [activeClient]
  );
  const getContext = useCallback(() => activeClient?.getContext() ?? null, [activeClient]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: VowelContextType = useMemo(() => ({
    client: activeClient,
    state,
    startSession,
    stopSession,
    toggleSession,
    clearTranscripts,
    notifyEvent,
    sendText,
    updateContext,
    getContext,
  }), [activeClient, state, startSession, stopSession, toggleSession, clearTranscripts, notifyEvent, sendText, updateContext, getContext]);

  // Main content
  const content = (
    <VowelContext.Provider value={contextValue}>
      {children}
    </VowelContext.Provider>
  );

  // Determine floating cursor config
  // Default: enabled with default settings
  // User can pass false to disable, or config object to customize
  const shouldEnableFloatingCursor = floatingCursor !== false;
  const floatingCursorConfig: FloatingCursorConfig = 
    typeof floatingCursor === 'object' 
      ? floatingCursor 
      : { enabled: true }; // Default config

  // If floating cursor enabled, wrap with FloatingCursorProvider
  if (shouldEnableFloatingCursor && floatingCursorConfig.enabled) {
    console.log('🎯 [VowelProvider] Wrapping with FloatingCursorProvider (React mode)');
    return (
      <FloatingCursorProvider config={floatingCursorConfig}>
        {content}
      </FloatingCursorProvider>
    );
  }

  // No floating cursor - return content directly
  console.log('🎯 [VowelProvider] No floating cursor (disabled or web component mode)');
  return content;
}

/**
 * Hook to access Vowel context
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, toggleSession, client } = useVowel();
 *   
 *   // Don't render if client is not available yet
 *   if (!client) {
 *     return null;
 *   }
 *   
 *   return (
 *     <button onClick={toggleSession}>
 *       {state.isConnected ? 'Stop' : 'Start'} Voice
 *     </button>
 *   );
 * }
 * ```
 */
export function useVowel(): VowelContextType {
  const context = useContext(VowelContext);
  console.log("[useVowel] context", context);

  if (!context) {
    throw new Error("useVowel must be used within a VowelProvider");
  }
  return context;
}
