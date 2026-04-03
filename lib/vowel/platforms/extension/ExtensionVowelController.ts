/**
 * Extension Vowel Controller
 * 
 * Main controller that manages the Vowel client instance in the extension background script.
 * Handles initialization, message routing, and state synchronization to content scripts.
 * 
 * @packageDocumentation
 */

import { Vowel } from '../../core/VowelClient';
import type { VowelClientConfig } from '../../types';
import { ExtensionMessageRouter } from './ExtensionMessageRouter';
import { ExtensionStateSync } from './ExtensionStateSync';
import { ExtensionNavigationAdapter } from './adapters/ExtensionNavigationAdapter';
import { ExtensionAutomationAdapter } from './adapters/ExtensionAutomationAdapter';

/**
 * Main controller for Vowel instance in extension background script
 * 
 * This controller:
 * - Manages a single Vowel client instance
 * - Routes messages from content scripts to appropriate handlers
 * - Broadcasts state updates to all listening content scripts
 * - Handles extension lifecycle (install, update, suspend)
 * 
 * @example
 * ```typescript
 * const controller = new ExtensionVowelController({
 *   apiKey: 'vkey_public_xxx',
 *   systemInstruction: 'Custom instructions...',
 * });
 * 
 * await controller.initialize();
 * ```
 */
export class ExtensionVowelController {
  private vowelClient: Vowel | null = null;
  private messageRouter: ExtensionMessageRouter;
  private stateSync: ExtensionStateSync;
  private config: VowelClientConfig;

  constructor(config: VowelClientConfig) {
    this.config = config;
    this.messageRouter = new ExtensionMessageRouter(this);
    this.stateSync = new ExtensionStateSync(this);
    this.setupMessageListeners();
    this.setupLifecycleHandlers();
  }

  /**
   * Initialize the Vowel client with extension-specific adapters
   */
  async initialize(): Promise<void> {
    console.log('🎤 Initializing Vowel controller in extension background');

    const navigationAdapter = new ExtensionNavigationAdapter();
    const automationAdapter = new ExtensionAutomationAdapter();

    this.vowelClient = new Vowel({
      ...this.config,
      navigationAdapter,
      automationAdapter,
    });

    // Subscribe to Vowel state changes and broadcast to content scripts
    this.vowelClient.onStateChange((state) => {
      // Broadcast state update (includes isListening, isSpeaking, isAIThinking, etc.)
      this.stateSync.broadcastStateUpdate(this.getState());
      
      // Broadcast transcript updates if available
      if (state.transcripts && state.transcripts.length > 0) {
        const lastTranscript = state.transcripts[state.transcripts.length - 1];
        this.stateSync.broadcastTranscriptUpdate({
          type: lastTranscript.role === 'user' ? 'user' : 'agent',
          text: lastTranscript.text,
          isFinal: true,  // Transcripts in the state are final
        });
      }
    });

    console.log('✅ Vowel controller initialized successfully (with state sync)');
  }

  /**
   * Start a voice session
   * 
   * @param tabId - Optional tab ID to associate with session
   */
  async startSession(tabId?: number): Promise<void> {
    if (!this.vowelClient) {
      throw new Error('Vowel client not initialized');
    }

    console.log('Starting Vowel session' + (tabId ? ` for tab ${tabId}` : ''));
    await this.vowelClient.startSession();

    // Broadcast state update
    await this.stateSync.broadcastStateUpdate(this.getState());
  }

  /**
   * Stop the current voice session
   */
  async stopSession(): Promise<void> {
    if (!this.vowelClient) {
      console.warn('Vowel client not initialized, cannot stop session');
      return;
    }

    console.log('Stopping Vowel session');
    await this.vowelClient.stopSession();

    // Broadcast state update
    await this.stateSync.broadcastStateUpdate(this.getState());
  }

  /**
   * Get current Vowel state
   * 
   * @returns Current state object
   */
  getState(): any {
    if (!this.vowelClient) {
      return {
        state: 'idle',
        isListening: false,
        isSpeaking: false,
        isAIThinking: false,
        isConnected: false,
      };
    }

    // Get state from Vowel client's state manager
    const clientState = this.vowelClient.state;
    
    return {
      state: clientState.isConnected ? 'active' : 'idle',
      isListening: clientState.isUserSpeaking || false,
      isSpeaking: clientState.isAISpeaking || false,
      isAIThinking: clientState.isAIThinking || false,  // AI executing tools/actions
      isConnected: clientState.isConnected || false,
    };
  }

  /**
   * Update configuration
   * 
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<VowelClientConfig>): void {
    this.config = { ...this.config, ...config };
    
    // If Vowel client exists, we might need to reinitialize or update it
    // For now, just update our config
    console.log('Configuration updated:', config);
  }

  /**
   * Register a custom action that the AI can perform
   * 
   * Forwards to the internal Vowel client's registerAction method
   * 
   * @param name - Action name (will be used as tool name)
   * @param definition - Action definition with parameters
   * @param handler - Function to execute when action is called
   * 
   * @example
   * ```ts
   * controller.registerAction('goToSite', {
   *   description: 'Navigate to a website',
   *   parameters: {
   *     url: { type: 'string', description: 'URL to navigate to' }
   *   }
   * }, async ({ url }) => {
   *   // Implementation
   * });
   * ```
   */
  registerAction<T = any>(
    name: string,
    definition: any,
    handler: (params: T) => Promise<any>
  ): void {
    if (!this.vowelClient) {
      console.error('❌ Cannot register action: Vowel client not initialized');
      return;
    }

    this.vowelClient.registerAction(name, definition, handler);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('Cleaning up Vowel controller');
    await this.stopSession();
    this.vowelClient = null;
  }

  /**
   * Get the Vowel client instance (for direct access if needed)
   * 
   * @returns Vowel client instance or null
   */
  getVowelClient(): Vowel | null {
    return this.vowelClient;
  }

  /**
   * Setup message listeners from content scripts
   */
  private setupMessageListeners(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.warn('Chrome runtime not available, cannot setup message listeners');
      return;
    }

    chrome.runtime.onMessage.addListener(
      (message, sender, sendResponse) => {
        this.messageRouter.route(message, sender, sendResponse);
        return true; // Keep channel open for async response
      }
    );

    console.log('✅ Message listeners set up');
  }

  /**
   * Setup extension lifecycle handlers
   */
  private setupLifecycleHandlers(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return;
    }

    // Handle extension install/update
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        console.log('Vowel extension installed');
      } else if (details.reason === 'update') {
        console.log('Vowel extension updated');
      }
    });

    // Handle extension suspension (for MV3 service workers)
    if ('onSuspend' in chrome.runtime) {
      chrome.runtime.onSuspend.addListener(() => {
        console.log('Extension suspending, cleaning up');
        this.cleanup();
      });
    }

    console.log('✅ Lifecycle handlers set up');
  }
}
