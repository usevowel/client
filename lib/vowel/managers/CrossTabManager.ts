/**
 * Cross-Tab Communication Manager
 * Handles communication between main page (with voice agent) and navigation tab
 * Uses BroadcastChannel API for reliable cross-tab messaging
 */

/**
 * Message types for cross-tab communication
 */
export type CrossTabMessageType = 
  | 'addToCart'
  | 'removeFromCart'
  | 'updateQuantity'
  | 'navigate'
  | 'getContext'
  | 'contextResponse'
  // Smart DOM Tools (Levenshtein Search with Spoken IDs)
  | 'searchElements'           // Search by term (text, classes, aria-labels, values, etc.)
  | 'searchElementsResponse'   // Response with spoken IDs (e.g., "apple_banana")
  | 'getPageSnapshot'           // Get compressed view of all elements
  | 'pageSnapshotResponse'     // Response with compressed snapshot
  // DOM Interaction Tools (use spoken IDs from search)
  | 'clickElement'
  | 'typeIntoElement'
  | 'pressKey'
  | 'focusElement'
  | 'scrollToElement'
  | 'domActionResponse';

/**
 * Cross-tab message structure
 */
export interface CrossTabMessage {
  type: CrossTabMessageType;
  payload: any;
  timestamp: number;
  messageId: string;
}

/**
 * Cross-tab communication manager
 * Manages BroadcastChannel for communication between main tab and navigation tab
 * 
 * @example
 * ```ts
 * // On main page (with voice agent)
 * const manager = CrossTabManager.getInstance();
 * manager.sendMessage('addToCart', { productId: '123', quantity: 1 });
 * 
 * // On navigation tab
 * const manager = CrossTabManager.getInstance();
 * manager.onMessage((message) => {
 *   if (message.type === 'addToCart') {
 *     // Add item to cart
 *   }
 * });
 * ```
 */
export class CrossTabManager {
  private static instance: CrossTabManager | null = null;
  private channel: BroadcastChannel | null = null;
  private messageHandlers: Map<CrossTabMessageType, Set<(payload: any) => void>> = new Map();
  private readonly channelName = 'vowel-navigation';

  private constructor() {
    this.initChannel();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CrossTabManager {
    if (!CrossTabManager.instance) {
      CrossTabManager.instance = new CrossTabManager();
    }
    return CrossTabManager.instance;
  }

  /**
   * Initialize BroadcastChannel
   */
  private initChannel(): void {
    if (typeof window === 'undefined' || !window.BroadcastChannel) {
      console.warn('⚠️ BroadcastChannel not supported in this browser');
      return;
    }

    try {
      this.channel = new BroadcastChannel(this.channelName);
      
      this.channel.onmessage = (event: MessageEvent<CrossTabMessage>) => {
        const message = event.data;
        console.log('📨 Received cross-tab message:', message.type, message.payload);
        
        // Call registered handlers for this message type
        const handlers = this.messageHandlers.get(message.type);
        if (handlers) {
          handlers.forEach(handler => {
            try {
              handler(message.payload);
            } catch (error) {
              console.error('❌ Error in message handler:', error);
            }
          });
        }
      };

      console.log('✅ CrossTabManager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize BroadcastChannel:', error);
    }
  }

  /**
   * Send a message to all tabs
   */
  sendMessage(type: CrossTabMessageType, payload: any): void {
    if (!this.channel) {
      console.warn('⚠️ BroadcastChannel not available');
      return;
    }

    const message: CrossTabMessage = {
      type,
      payload,
      timestamp: Date.now(),
      messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    try {
      this.channel.postMessage(message);
      console.log('📤 Sent cross-tab message:', type, payload);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    }
  }

  /**
   * Register a message handler for a specific message type
   * 
   * @param type - Message type to listen for
   * @param handler - Callback function
   * @returns Unsubscribe function
   */
  onMessage(type: CrossTabMessageType, handler: (payload: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    const handlers = this.messageHandlers.get(type)!;
    handlers.add(handler);

    console.log(`👂 Registered handler for message type: ${type}`);

    // Return unsubscribe function
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }
    };
  }

  /**
   * Register a global message handler (receives all messages)
   * 
   * @param handler - Callback function that receives the full message
   * @returns Unsubscribe function
   */
  onAnyMessage(handler: (message: CrossTabMessage) => void): () => void {
    if (!this.channel) {
      console.warn('⚠️ BroadcastChannel not available');
      return () => {};
    }

    const listener = (event: MessageEvent<CrossTabMessage>) => {
      try {
        handler(event.data);
      } catch (error) {
        console.error('❌ Error in global message handler:', error);
      }
    };

    this.channel.addEventListener('message', listener);

    // Return unsubscribe function
    return () => {
      if (this.channel) {
        this.channel.removeEventListener('message', listener);
      }
    };
  }

  /**
   * Send a request and wait for a response
   * Useful for getting data from the navigation tab
   * 
   * @param type - Request message type
   * @param payload - Request payload
   * @param responseType - Expected response message type
   * @param timeout - Timeout in milliseconds (default: 5000)
   * @returns Promise that resolves with response payload
   */
  async request(
    type: CrossTabMessageType,
    payload: any,
    responseType: CrossTabMessageType,
    timeout: number = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      const unsubscribe = this.onMessage(responseType, (responsePayload) => {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(responsePayload);
      });

      this.sendMessage(type, payload);
    });
  }

  /**
   * Close the channel (cleanup)
   */
  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
      console.log('🔌 CrossTabManager closed');
    }
  }

  /**
   * Check if BroadcastChannel is supported
   */
  static isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.BroadcastChannel;
  }
}

