/**
 * @fileoverview Controlled Navigation Adapter - Cross-tab navigation for traditional sites
 * 
 * This file contains the `ControlledNavigationAdapter` class which enables voice-controlled
 * navigation across browser tabs using the BroadcastChannel API. This is designed for
 * traditional multi-page applications (Shopify, WordPress, etc.) where the voice agent
 * runs in one tab and controls navigation in another tab.
 * 
 * Use Cases:
 * - Shopify stores with voice navigation
 * - WordPress sites with voice control
 * - Traditional multi-page applications
 * - Any site where voice agent and content are in separate tabs
 * 
 * Architecture:
 * - Tab A (Voice Agent): Sends navigation commands via BroadcastChannel
 * - Tab B (Controlled): Receives commands and performs page navigation
 * 
 * Key Features:
 * - Cross-tab communication via BroadcastChannel
 * - Full page navigation support
 * - Configurable channel names
 * - Route configuration support
 * 
 * @module @vowel.to/client/adapters/navigation
 * @author vowel.to
 * @license Proprietary
 * 
 * @example
 * ```ts
 * // Voice agent tab
 * import { ControlledNavigationAdapter } from '@vowel.to/client/adapters/navigation';
 * 
 * const navigationAdapter = new ControlledNavigationAdapter({
 *   channelName: 'vowel-shopify-nav'
 * });
 * 
 * // Controlled tab (receives navigation commands)
 * const channel = new BroadcastChannel('vowel-shopify-nav');
 * channel.onmessage = (event) => {
 *   if (event.data.type === 'navigate') {
 *     window.location.href = event.data.url;
 *   }
 * };
 * ```
 */

import type { NavigationAdapter, VowelRoute } from '../../types';

/**
 * Configuration options for ControlledNavigationAdapter
 */
export interface ControlledNavigationAdapterOptions {
  /**
   * BroadcastChannel name for communication
   * Default: 'vowel-navigation'
   */
  channelName?: string;

  /**
   * Optional: Array of routes
   * Can also be provided via Vowel config
   */
  routes?: VowelRoute[];
  
  /**
   * Optional: Callback to stop voice session (called when controlled tab requests stop)
   */
  onStopVoiceSession?: () => void;
  
  /**
   * Optional: Callback to get current voice state (called when controlled tab requests it)
   */
  onRequestVoiceState?: () => any;
}

/**
 * Navigation command message
 */
interface NavigationMessage {
  type: 'navigate';
  path: string;
  url: string;
  timestamp: number;
}

/**
 * Controlled Navigation Adapter
 * 
 * Handles cross-tab navigation for traditional sites with page reloads.
 * Perfect for Shopify, WordPress, and other server-rendered platforms.
 */
export class ControlledNavigationAdapter implements NavigationAdapter {
  private channel: BroadcastChannel;
  private channelName: string;
  private routes: VowelRoute[] = [];
  private currentPath: string = '';
  private onStopVoiceSession?: () => void;
  private onRequestVoiceState?: () => any;

  constructor(options: ControlledNavigationAdapterOptions = {}) {
    this.channelName = options.channelName || 'vowel-navigation';
    this.channel = new BroadcastChannel(this.channelName);
    this.routes = options.routes || [];
    this.currentPath = window.location.pathname;
    this.onStopVoiceSession = options.onStopVoiceSession;
    this.onRequestVoiceState = options.onRequestVoiceState;

    // Listen for messages from controlled tabs
    this.channel.onmessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.type === 'init') {
        console.log(`📨 [ControlledNavigationAdapter] Received init message from controlled tab`);
        console.log(`   URL: ${message.url}`);
        console.log(`   Detected via: ${message.detectedVia}`);
        console.log(`   Timestamp: ${message.timestamp}`);
        
        // Send acknowledgment back to controlled tab
        const response = {
          type: 'config',
          config: {
            routes: this.routes,
            channelName: this.channelName
          },
          timestamp: Date.now()
        };
        
        this.channel.postMessage(response);
        console.log(`📡 [ControlledNavigationAdapter] Sent config response to controlled tab`);
        console.log(`   ✅ Handshake complete`);
      }
      
      // Handle stop voice session request from controlled tab
      if (message.type === 'stopVoiceSession') {
        console.log(`🛑 [ControlledNavigationAdapter] Stop voice session request from controlled tab`);
        console.log(`   ⏱️  Timestamp: ${message.timestamp}`);
        
        if (this.onStopVoiceSession) {
          console.log(`   🎤 Stopping voice session...`);
          this.onStopVoiceSession();
        } else {
          console.warn(`   ⚠️  No onStopVoiceSession callback registered`);
        }
      }
      
      // Handle request for current voice state from controlled tab
      if (message.type === 'requestVoiceState') {
        console.log(`🎤 [ControlledNavigationAdapter] Voice state request from controlled tab`);
        
        if (this.onRequestVoiceState) {
          const currentState = this.onRequestVoiceState();
          console.log(`   📡 Sending current voice state:`, currentState);
          
          // Broadcast the current state
          this.channel.postMessage({
            type: 'voiceStateUpdate',
            state: currentState,
            timestamp: Date.now()
          });
        } else {
          console.warn(`   ⚠️  No onRequestVoiceState callback registered`);
        }
      }
    };

    // Signal that this adapter needs a content window opened synchronously on session start
    // VowelAgent checks this flag to open a controlled tab when user clicks the microphone
    if (typeof window !== 'undefined') {
      (window as any).__vowelNeedsContentWindow = true;
      console.log(`🧭 [ControlledNavigationAdapter] Set __vowelNeedsContentWindow flag`);
      console.log(`   ℹ️  VowelAgent will open controlled tab on session start`);
    }

    console.log(`🧭 [ControlledNavigationAdapter] Initialized on channel: ${this.channelName}`);
    console.log(`   Mode: Cross-tab navigation (controlled tab mode)`);
    console.log(`   👂 Listening for init and stopVoiceSession messages from controlled tabs`);
  }

  /**
   * Navigate to a path by sending command via BroadcastChannel
   */
  async navigate(path: string): Promise<void> {
    console.log(`🧭 [ControlledNavigationAdapter] Broadcasting navigation command: ${path}`);
    
    // Construct full URL
    const url = new URL(path, window.location.origin).href;

    // Send navigation command
    const message: NavigationMessage = {
      type: 'navigate',
      path,
      url,
      timestamp: Date.now()
    };

    this.channel.postMessage(message);
    
    // Update internal state
    this.currentPath = path;
    
    console.log(`   ✅ Navigation command sent to channel: ${this.channelName}`);
    console.log(`   URL: ${url}`);
  }

  /**
   * Get current path
   */
  getCurrentPath(): string {
    return this.currentPath;
  }

  /**
   * Get available routes
   */
  async getRoutes(): Promise<VowelRoute[]> {
    return this.routes;
  }

  /**
   * Set routes (useful for dynamic route updates)
   */
  setRoutes(routes: VowelRoute[]): void {
    this.routes = routes;
    console.log(`🧭 [ControlledNavigationAdapter] Routes updated: ${routes.length} routes`);
  }
  
  /**
   * Broadcast voice session state to controlled tabs
   * This allows the controlled tab's microphone button to mirror the main tab's state
   */
  broadcastVoiceState(state: {
    isConnected: boolean;
    isConnecting: boolean;
    isUserSpeaking: boolean;
    isAISpeaking: boolean;
    isAIThinking: boolean;
    isResuming: boolean;
  }): void {
    const message = {
      type: 'voiceStateUpdate',
      state,
      timestamp: Date.now()
    };
    
    this.channel.postMessage(message);
    
    console.log(`📡 [ControlledNavigationAdapter] Broadcasted voice state to controlled tabs:`, state);
  }
  
  /**
   * Set the callback for stop voice session requests from controlled tabs
   */
  setStopVoiceSessionCallback(callback: () => void): void {
    this.onStopVoiceSession = callback;
    console.log(`🎤 [ControlledNavigationAdapter] Stop voice session callback registered`);
  }
  
  /**
   * Set the callback for voice state requests from controlled tabs
   */
  setRequestVoiceStateCallback(callback: () => any): void {
    this.onRequestVoiceState = callback;
    console.log(`🎤 [ControlledNavigationAdapter] Request voice state callback registered`);
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.channel.close();
    console.log(`🧭 [ControlledNavigationAdapter] Channel closed: ${this.channelName}`);
  }
}

