/**
 * Extension Message Router
 * 
 * Routes messages from content scripts to appropriate handlers in the background script.
 * 
 * @packageDocumentation
 */

import type {
  ExtensionMessage,
  StartSessionMessage,
  StopSessionMessage,
  // GetStateMessage,
  UpdateConfigMessage,
  SendUserMessageMessage,
  // InterruptMessage,
  // MessageResponse,
} from './messaging/ExtensionMessageTypes';
import {
  createSuccessResponse,
  createErrorResponse,
} from './messaging/ExtensionMessageProtocol';
import type { ExtensionVowelController } from './ExtensionVowelController';

/**
 * Routes messages from content scripts to appropriate handlers
 * 
 * @example
 * ```typescript
 * const router = new ExtensionMessageRouter(controller);
 * 
 * chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
 *   router.route(message, sender, sendResponse);
 *   return true;
 * });
 * ```
 */
export class ExtensionMessageRouter {
  private controller: ExtensionVowelController;

  constructor(controller: ExtensionVowelController) {
    this.controller = controller;
  }

  /**
   * Route incoming message to appropriate handler
   * 
   * @param message - Incoming message
   * @param sender - Message sender information
   * @param sendResponse - Response callback function
   */
  async route(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'START_SESSION':
          await this.handleStartSession(message as StartSessionMessage, sender);
          sendResponse(createSuccessResponse());
          break;

        case 'STOP_SESSION':
          await this.handleStopSession(message as StopSessionMessage);
          sendResponse(createSuccessResponse());
          break;

        case 'GET_STATE':
          const state = this.handleGetState();
          sendResponse(createSuccessResponse(state));
          break;

        case 'UPDATE_CONFIG':
          await this.handleUpdateConfig(message as UpdateConfigMessage);
          sendResponse(createSuccessResponse());
          break;

        case 'SEND_USER_MESSAGE':
          await this.handleSendUserMessage(message as SendUserMessageMessage);
          sendResponse(createSuccessResponse());
          break;

        case 'INTERRUPT':
          await this.handleInterrupt();
          sendResponse(createSuccessResponse());
          break;

        default:
          console.warn('Unknown message type:', message.type);
          sendResponse(createErrorResponse(`Unknown message type: ${message.type}`));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse(createErrorResponse(error as Error));
    }
  }

  /**
   * Handle START_SESSION message
   */
  private async handleStartSession(
    message: StartSessionMessage,
    sender: chrome.runtime.MessageSender
  ): Promise<void> {
    if (message.payload?.config) {
      this.controller.updateConfig(message.payload.config);
    }
    await this.controller.startSession(sender.tab?.id);
  }

  /**
   * Handle STOP_SESSION message
   */
  private async handleStopSession(_message: StopSessionMessage): Promise<void> {
    await this.controller.stopSession();
  }

  /**
   * Handle GET_STATE message
   */
  private handleGetState(): any {
    return this.controller.getState();
  }

  /**
   * Handle UPDATE_CONFIG message
   */
  private async handleUpdateConfig(message: UpdateConfigMessage): Promise<void> {
    this.controller.updateConfig(message.payload.config);
  }

  /**
   * Handle SEND_USER_MESSAGE message
   */
  private async handleSendUserMessage(
    message: SendUserMessageMessage
  ): Promise<void> {
    // TODO: Implement if VowelClient supports sending text messages
    console.log('Send user message:', message.payload.text);
  }

  /**
   * Handle INTERRUPT message
   */
  private async handleInterrupt(): Promise<void> {
    // TODO: Implement interrupt functionality in VowelClient
    console.log('Interrupt requested');
  }
}

