/**
 * Extension Message Protocol
 * 
 * Utility functions for creating, sending, and handling extension messages.
 * 
 * @packageDocumentation
 */

import type { ExtensionMessage, MessageResponse } from './ExtensionMessageTypes';

/**
 * Generate unique message ID
 * 
 * @returns Unique message ID string
 */
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create message with standard structure
 * 
 * @param type - Message type
 * @param payload - Optional message payload
 * @param tabId - Optional tab identifier
 * @returns Structured message object
 * 
 * @example
 * ```typescript
 * const message = createMessage('START_SESSION', { config: { appId: 'test' } });
 * ```
 */
export function createMessage<T extends ExtensionMessage>(
  type: string,
  payload?: any,
  tabId?: number
): T {
  return {
    type,
    id: generateMessageId(),
    timestamp: Date.now(),
    tabId,
    payload,
  } as T;
}

/**
 * Send message with promise-based response
 * 
 * Uses chrome.runtime.sendMessage with async/await pattern.
 * 
 * @param message - Message to send
 * @returns Promise resolving to response
 * @throws Error if message sending fails or extension context is invalid
 * 
 * @example
 * ```typescript
 * const response = await sendMessageWithResponse(message);
 * if (response.success) {
 *   console.log('Success:', response.data);
 * }
 * ```
 */
export async function sendMessageWithResponse<T = any>(
  message: ExtensionMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    // Check if chrome/browser runtime is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      reject(new Error('Chrome runtime not available'));
      return;
    }

    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Send message to specific tab
 * 
 * @param tabId - Target tab ID
 * @param message - Message to send
 * @returns Promise resolving to response
 * @throws Error if tab is invalid or message fails
 * 
 * @example
 * ```typescript
 * await sendMessageToTab(123, message);
 * ```
 */
export async function sendMessageToTab<T = any>(
  tabId: number,
  message: ExtensionMessage
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      reject(new Error('Chrome tabs API not available'));
      return;
    }

    try {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Broadcast message to all tabs
 * 
 * @param message - Message to broadcast
 * @returns Promise resolving when all messages sent
 * 
 * @example
 * ```typescript
 * await broadcastMessage(stateUpdate);
 * ```
 */
export async function broadcastMessage(message: ExtensionMessage): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    throw new Error('Chrome tabs API not available');
  }

  const tabs = await chrome.tabs.query({});
  
  const sendPromises = tabs.map(async (tab) => {
    if (tab.id) {
      try {
        await sendMessageToTab(tab.id, message);
      } catch (error) {
        // Content script might not be injected in this tab, ignore
        console.debug(`Could not send message to tab ${tab.id}:`, error);
      }
    }
  });

  await Promise.all(sendPromises);
}

/**
 * Create success response
 * 
 * @param data - Optional response data
 * @returns Success response object
 */
export function createSuccessResponse(data?: any): MessageResponse {
  return {
    success: true,
    data,
  };
}

/**
 * Create error response
 * 
 * @param error - Error message or Error object
 * @returns Error response object
 */
export function createErrorResponse(error: string | Error): MessageResponse {
  return {
    success: false,
    error: typeof error === 'string' ? error : error.message,
  };
}

/**
 * Validate message structure
 * 
 * @param message - Message to validate
 * @returns True if message is valid
 */
export function isValidMessage(message: any): message is ExtensionMessage {
  return (
    message &&
    typeof message === 'object' &&
    typeof message.type === 'string' &&
    typeof message.id === 'string' &&
    typeof message.timestamp === 'number'
  );
}

/**
 * Check if running in extension context
 * 
 * @returns True if in extension context (has chrome.runtime)
 */
export function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

/**
 * Check if running in content script context
 * 
 * @returns True if in content script (has chrome.runtime but not in background)
 */
export function isContentScriptContext(): boolean {
  return (
    isExtensionContext() &&
    typeof window !== 'undefined' &&
    window.location.protocol !== 'chrome-extension:'
  );
}

/**
 * Check if running in background script context
 * 
 * @returns True if in background script
 */
export function isBackgroundScriptContext(): boolean {
  return (
    isExtensionContext() &&
    typeof chrome.tabs !== 'undefined' &&
    typeof chrome.runtime.getBackgroundPage !== 'undefined'
  );
}

