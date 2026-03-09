/**
 * Extension State Sync
 * 
 * Synchronizes Vowel state to all active content scripts.
 * Handles broadcasting state updates, transcript updates, and errors.
 * 
 * @packageDocumentation
 */

import {
  createMessage,
  sendMessageToTab,
  broadcastMessage,
} from './messaging/ExtensionMessageProtocol';
import type {
  StateUpdateMessage,
  TranscriptUpdateMessage,
  ErrorMessage,
  AudioPlaybackMessage,
  ExtensionMessage,
} from './messaging/ExtensionMessageTypes';
import type { ExtensionVowelController } from './ExtensionVowelController';

/**
 * Synchronizes Vowel state to content scripts
 * 
 * @example
 * ```typescript
 * const stateSync = new ExtensionStateSync(controller);
 * await stateSync.broadcastStateUpdate(state);
 * ```
 */
export class ExtensionStateSync {
  private controller: ExtensionVowelController;

  constructor(controller: ExtensionVowelController) {
    this.controller = controller;
  }

  /**
   * Broadcast state update to all content scripts
   * 
   * @param state - Current Vowel state
   */
  async broadcastStateUpdate(state: any): Promise<void> {
    console.log('controller', this.controller);
    const message = createMessage<StateUpdateMessage>('STATE_UPDATE', {
      state: state.state,
      isListening: state.isListening,
      isSpeaking: state.isSpeaking,
      isConnected: state.isConnected,
    });

    await this.sendToAllContentScripts(message);
  }

  /**
   * Broadcast transcript update
   * 
   * @param transcript - Transcript data
   */
  async broadcastTranscriptUpdate(transcript: {
    type: 'user' | 'agent';
    text: string;
    isFinal: boolean;
  }): Promise<void> {
    const message = createMessage<TranscriptUpdateMessage>('TRANSCRIPT_UPDATE', transcript);
    await this.sendToAllContentScripts(message);
  }

  /**
   * Broadcast error
   * 
   * @param error - Error object or message
   */
  async broadcastError(error: Error | string): Promise<void> {
    const message = createMessage<ErrorMessage>('ERROR', {
      error: typeof error === 'string' ? error : error.message,
      details: typeof error === 'object' ? error.stack : undefined,
    });
    await this.sendToAllContentScripts(message);
  }

  /**
   * Broadcast audio playback event
   * 
   * @param event - Playback event type
   */
  async broadcastAudioPlayback(event: 'started' | 'stopped'): Promise<void> {
    const message = createMessage<AudioPlaybackMessage>('AUDIO_PLAYBACK', { event });
    await this.sendToAllContentScripts(message);
  }

  /**
   * Send message to specific tab
   * 
   * @param tabId - Target tab ID
   * @param message - Message to send
   */
  async sendToTab(tabId: number, message: ExtensionMessage): Promise<void> {
    try {
      await sendMessageToTab(tabId, message);
    } catch (error) {
      console.error(`Failed to send message to tab ${tabId}:`, error);
    }
  }

  /**
   * Send message to all tabs with content script
   */
  private async sendToAllContentScripts(message: ExtensionMessage): Promise<void> {
    try {
      await broadcastMessage(message);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }

  /**
   * Get active tab and send message to it
   * 
   * @param message - Message to send
   */
  async sendToActiveTab(message: ExtensionMessage): Promise<void> {
    try {
      const activeTab = await this.getActiveTab();
      if (activeTab?.id) {
        await this.sendToTab(activeTab.id, message);
      }
    } catch (error) {
      console.error('Failed to send message to active tab:', error);
    }
  }

  /**
   * Get the currently active tab
   */
  private async getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      return undefined;
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  /**
   * Get all tabs
   */
  // private async getAllTabs(): Promise<chrome.tabs.Tab[]> {
  //   if (typeof chrome === 'undefined' || !chrome.tabs) {
  //     return [];
  //   }

  //   return await chrome.tabs.query({});
  // }
}

