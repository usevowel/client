/**
 * @fileoverview State Manager - Handles voice session state and listener notifications
 * 
 * This file contains the `StateManager` class which provides reactive state management
 * for the Vowel client. It maintains the current session state, tracks speaking states
 * (user, AI thinking, AI speaking), manages transcripts, and notifies subscribers of
 * state changes.
 * 
 * Responsibilities:
 * - Maintaining session connection state
 * - Tracking user and AI speaking states
 * - Managing conversation transcripts
 * - Notifying listeners of state changes
 * - Providing immutable state access
 * 
 * @module @vowel.to/client/managers
 * @author vowel.to
 * @license Proprietary
 */

/**
 * Voice session state
 */
export interface VoiceSessionState {
  isConnecting: boolean;
  isConnected: boolean;
  isDisconnecting: boolean; // True when disconnection process is in progress
  isResuming: boolean; // True when resuming a session from navigation
  status: string;
  transcripts: Array<{
    role: "user" | "assistant";
    text: string;
    timestamp: Date;
  }>;
  // Speaking state tracking
  isUserSpeaking: boolean; // User is actively speaking (detected by client-side VAD)
  isAIThinking: boolean; // AI is processing/generating response (tool calls, waiting for first response)
  isToolExecuting: boolean; // AI is executing a tool (different shade of yellow indicator)
  isAISpeaking: boolean; // AI is delivering audio response
  isHibernated: boolean; // Session is hibernated (STT stream closed, waiting for wake)
  // Error tracking
  error?: {
    message: string;
    details?: string | object;
    timestamp: Date;
  } | null;
}

/**
 * State change listener function
 */
export type StateChangeListener = (state: VoiceSessionState) => void;

/**
 * State Manager class
 * Manages voice session state and notifies listeners of changes
 */
export class StateManager {
  private state: VoiceSessionState;
  private listeners: Set<StateChangeListener> = new Set();

  constructor(initialState?: Partial<VoiceSessionState>) {
    this.state = {
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
      ...initialState,
    };
  }

  /**
   * Get current state (returns a copy)
   */
  getState(): VoiceSessionState {
    return { ...this.state };
  }

  /**
   * Update state and notify listeners
   */
  updateState(updates: Partial<VoiceSessionState>): void {
    console.log("📊 [StateManager] State update:", updates);
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Add a transcript entry
   */
  addTranscript(transcript: {
    role: "user" | "assistant";
    text: string;
    timestamp: Date;
  }): void {
    this.state.transcripts.push(transcript);
    this.notifyListeners();
  }

  /**
   * Clear transcript history
   */
  clearTranscripts(): void {
    this.state.transcripts = [];
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const stateCopy = this.getState();
    this.listeners.forEach((listener) => listener(stateCopy));
  }

  /**
   * Set user speaking state
   */
  setUserSpeaking(isSpeaking: boolean): void {
    if (this.state.isUserSpeaking !== isSpeaking) {
      console.log(`🎤 [StateManager] User speaking: ${isSpeaking}`);
      this.state.isUserSpeaking = isSpeaking;
      this.notifyListeners();
    }
  }

  /**
   * Set AI thinking state
   */
  setAIThinking(isThinking: boolean): void {
    if (this.state.isAIThinking !== isThinking) {
      console.log(`🧠 [StateManager] AI thinking: ${isThinking}`);
      this.state.isAIThinking = isThinking;
      this.notifyListeners();
    }
  }

  /**
   * Set tool executing state
   */
  setToolExecuting(isExecuting: boolean): void {
    if (this.state.isToolExecuting !== isExecuting) {
      console.log(`🔧 [StateManager] Tool executing: ${isExecuting}`);
      this.state.isToolExecuting = isExecuting;
      this.notifyListeners();
    }
  }

  /**
   * Set AI speaking state
   */
  setAISpeaking(isSpeaking: boolean): void {
    if (this.state.isAISpeaking !== isSpeaking) {
      console.log(`🔊 [StateManager] AI speaking: ${isSpeaking}`);
      this.state.isAISpeaking = isSpeaking;
      this.notifyListeners();
    }
  }

  /**
   * Set hibernated state
   */
  setHibernated(isHibernated: boolean): void {
    if (this.state.isHibernated !== isHibernated) {
      console.log(`💤 [StateManager] Hibernated: ${isHibernated}`);
      this.state.isHibernated = isHibernated;
      this.notifyListeners();
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    if (this.state.error !== null) {
      this.state.error = null;
      this.notifyListeners();
    }
  }

  /**
   * Reset state to initial values
   */
  reset(): void {
    this.state = {
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
    this.notifyListeners();
  }

  /**
   * Export conversation state for restoration
   * Returns a serializable object containing transcripts
   * 
   * @param options - Export options
   * @param options.maxTurns - Maximum number of conversation turns to include (default: all)
   * @returns Serializable state object
   * 
   * @example
   * ```ts
   * const state = vowel.exportState({ maxTurns: 10 });
   * localStorage.setItem('vowel-state', JSON.stringify(state));
   * ```
   */
  exportState(options?: { maxTurns?: number }): VoiceSessionState {
    const state = this.getState();
    
    // Truncate transcripts if maxTurns specified
    if (options?.maxTurns && state.transcripts.length > options.maxTurns) {
      const startIndex = state.transcripts.length - options.maxTurns;
      state.transcripts = state.transcripts.slice(startIndex);
    }
    
    return state;
  }

  /**
   * Import conversation state from a previous session
   * Merges transcripts into current state
   * 
   * @param savedState - Previously exported state
   * 
   * @example
   * ```ts
   * const savedState = JSON.parse(localStorage.getItem('vowel-state'));
   * vowel.importState(savedState);
   * ```
   */
  importState(savedState: Partial<VoiceSessionState>): void {
    if (savedState.transcripts) {
      console.log(`📥 [StateManager] Importing ${savedState.transcripts.length} transcript(s)`);
      this.state.transcripts = [...savedState.transcripts];
      this.notifyListeners();
    }
  }
}

