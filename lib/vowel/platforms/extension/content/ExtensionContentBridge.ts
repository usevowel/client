/**
 * Extension Content Bridge
 * 
 * Main bridge for content script communication with extension background script.
 * Handles sending user actions and receiving state updates from the extension.
 * 
 * @packageDocumentation
 */

import {
  createMessage,
  sendMessageWithResponse,
  isExtensionContext,
} from '../messaging/ExtensionMessageProtocol';
import type {
  StartSessionMessage,
  StopSessionMessage,
  GetStateMessage,
  UpdateConfigMessage,
  InterruptMessage,
  StateUpdateMessage,
  TranscriptUpdateMessage,
  ErrorMessage,
  ExtensionMessage,
  MessageResponse,
} from '../messaging/ExtensionMessageTypes';

/**
 * Vowel state structure
 */
export interface VowelState {
  state: string;
  isListening: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  isAIThinking?: boolean;  // AI is executing tools/actions
  isActiveTab?: boolean;
}

/**
 * Transcript update structure
 */
export interface TranscriptUpdate {
  type: 'user' | 'agent';
  text: string;
  isFinal: boolean;
}

/**
 * Bridge for content script communication with extension
 * 
 * This class:
 * - Sends user actions to extension background script
 * - Receives state updates from extension
 * - Manages local UI state based on extension state
 * - Handles connection/disconnection with extension
 * 
 * @example
 * ```typescript
 * const bridge = new ExtensionContentBridge();
 * 
 * // Listen to state updates
 * bridge.onStateUpdate((state) => {
 *   console.log('New state:', state);
 * });
 * 
 * // Start session
 * await bridge.startSession();
 * ```
 */
export class ExtensionContentBridge {
  private stateListeners: Set<(state: VowelState) => void> = new Set();
  private transcriptListeners: Set<(transcript: TranscriptUpdate) => void> = new Set();
  private errorListeners: Set<(error: Error) => void> = new Set();
  private isConnected: boolean = false;

  constructor() {
    this.setupMessageListener();
    this.checkConnection();
  }

  /**
   * Start a voice session via extension
   * 
   * @param config - Optional configuration overrides
   * @throws Error if extension is not connected or fails to start session
   */
  async startSession(config?: any): Promise<void> {
    // Try to send message - will throw if extension context is invalid
    const message = createMessage<StartSessionMessage>('START_SESSION', { config });
    const response = await sendMessageWithResponse<MessageResponse>(message);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to start session');
    }
  }

  /**
   * Stop the voice session
   * 
   * @throws Error if extension is not connected or fails to stop session
   */
  async stopSession(): Promise<void> {
    // Try to send message - will throw if extension context is invalid
    const message = createMessage<StopSessionMessage>('STOP_SESSION');
    const response = await sendMessageWithResponse<MessageResponse>(message);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to stop session');
    }
  }

  /**
   * Get current state from extension
   * 
   * @returns Current Vowel state
   * @throws Error if extension is not connected or fails to get state
   */
  async getState(): Promise<VowelState> {
    // Don't check isConnected here - we need this to work for the connection check itself
    const message = createMessage<GetStateMessage>('GET_STATE');
    const response = await sendMessageWithResponse<MessageResponse>(message);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to get state');
    }

    return response.state;
  }

  /**
   * Update configuration
   * 
   * @param config - Partial configuration to update
   * @throws Error if extension is not connected or fails to update config
   */
  async updateConfig(config: any): Promise<void> {
    // Try to send message - will throw if extension context is invalid
    const message = createMessage<UpdateConfigMessage>('UPDATE_CONFIG', { config });
    const response = await sendMessageWithResponse<MessageResponse>(message);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to update config');
    }
  }

  /**
   * Interrupt current agent action
   * 
   * @throws Error if extension is not connected or fails to interrupt
   */
  async interrupt(): Promise<void> {
    // Try to send message - will throw if extension context is invalid
    const message = createMessage<InterruptMessage>('INTERRUPT');
    const response = await sendMessageWithResponse<MessageResponse>(message);
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to interrupt');
    }
  }

  /**
   * Listen to state updates
   * 
   * @param listener - Callback function for state updates
   * @returns Unsubscribe function
   * 
   * @example
   * ```typescript
   * const unsubscribe = bridge.onStateUpdate((state) => {
   *   console.log('State:', state);
   * });
   * 
   * // Later: unsubscribe()
   * ```
   */
  onStateUpdate(listener: (state: VowelState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Listen to transcript updates
   * 
   * @param listener - Callback function for transcript updates
   * @returns Unsubscribe function
   */
  onTranscriptUpdate(listener: (transcript: TranscriptUpdate) => void): () => void {
    this.transcriptListeners.add(listener);
    return () => this.transcriptListeners.delete(listener);
  }

  /**
   * Listen to errors
   * 
   * @param listener - Callback function for errors
   * @returns Unsubscribe function
   */
  onError(listener: (error: Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  /**
   * Check if connected to extension
   * 
   * @returns True if connected
   */
  isExtensionConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Setup message listener for extension messages
   */
  private setupMessageListener(): void {
    if (!isExtensionContext()) {
      console.warn('Not in extension context, message listener not available');
      return;
    }

    chrome.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse) => {
        // Only handle messages that are specifically for the proxy UI bridge
        // Messages like GET_PAGE_SNAPSHOT, SEARCH_ELEMENTS, etc. should be handled
        // by the content script's main message listener, not this bridge
        const bridgeMessageTypes = ['STATE_UPDATE', 'CURSOR_UPDATE', 'TRANSCRIPT_UPDATE'];
        
        if (bridgeMessageTypes.includes(message.type)) {
          this.handleMessage(message);
          sendResponse({ received: true });
          return true;
        }
        
        // For other message types, don't respond - let other listeners handle them
        return false;
      }
    );
  }

  /**
   * Handle incoming messages from extension
   */
  private handleMessage(message: ExtensionMessage): void {
    switch (message.type) {
      case 'STATE_UPDATE':
        const stateMsg = message as StateUpdateMessage;
        this.stateListeners.forEach(listener => listener(stateMsg.payload));
        break;

      case 'TRANSCRIPT_UPDATE':
        const transcriptMsg = message as TranscriptUpdateMessage;
        this.transcriptListeners.forEach(listener => listener(transcriptMsg.payload));
        break;

      case 'ERROR':
        const errorMsg = message as ErrorMessage;
        const error = new Error(errorMsg.payload.error);
        this.errorListeners.forEach(listener => listener(error));
        break;

      case 'AUDIO_PLAYBACK':
        // Handle audio playback events if needed
        console.debug('Audio playback event:', message.payload);
        break;

      case 'TOOL_EXECUTION':
        // Handle tool execution updates if needed
        console.debug('Tool execution:', message.payload);
        break;

      default:
        console.debug('Unhandled message type:', message.type);
    }
  }

  /**
   * Check connection with extension
   * More resilient - side panel might not be open yet
   */
  private async checkConnection(): Promise<void> {
    if (!isExtensionContext()) {
      this.isConnected = false;
      console.error('Not in extension context');
      return;
    }

    try {
      await this.getState();
      this.isConnected = true;
      console.log('✅ Connected to Vowel side panel');
    } catch (error) {
      this.isConnected = false;
      console.warn('⚠️ Vowel side panel not responding (may not be open yet):', error);
      console.log('💡 Open the extension side panel to activate voice control');
      
      // Retry connection after a delay
      setTimeout(() => this.checkConnection(), 2000);
    }
  }
}

