/**
 * @fileoverview Action Notifier - Centralized action notification system
 * 
 * Provides a centralized event system for notifying UI components about automation actions.
 * Both the floating cursor and floating action pill subscribe to these notifications.
 * 
 * @module @vowel.to/client/core
 * @author vowel.to
 * @license Proprietary
 */

/**
 * Action notification types
 */
export type ActionType = 
  | 'search' 
  | 'click' 
  | 'type' 
  | 'focus' 
  | 'scroll' 
  | 'navigate'
  | 'custom'
  | 'idle'
  | 'ready';

/**
 * Action notification details
 */
export interface ActionNotification {
  /** Type of action being performed */
  type: ActionType;
  
  /** Human-readable message describing the action */
  message: string;
  
  /** Optional target element ID (for DOM actions) */
  targetElementId?: string;
  
  /** Whether the action is idle/completed */
  isIdle: boolean;
  
  /** Optional position (for cursor positioning) */
  position?: {
    x: number;
    y: number;
  };
  
  /** Timestamp when the notification was created */
  timestamp: number;
}

/**
 * Action notification listener callback
 */
export type ActionNotificationListener = (notification: ActionNotification) => void;

/**
 * Action Notifier
 * 
 * Singleton class that manages action notifications for UI components.
 * Provides a pub-sub pattern for components to subscribe to action updates.
 * 
 * @example
 * ```typescript
 * // Subscribe to notifications
 * const unsubscribe = ActionNotifier.getInstance().subscribe((notification) => {
 *   console.log('Action:', notification.message);
 * });
 * 
 * // Notify about an action
 * ActionNotifier.getInstance().notify({
 *   type: 'click',
 *   message: 'Clicking add to cart button',
 *   targetElementId: 'add_to_cart',
 *   isIdle: false,
 *   timestamp: Date.now()
 * });
 * 
 * // Cleanup
 * unsubscribe();
 * ```
 */
export class ActionNotifier {
  private static instance: ActionNotifier | null = null;
  private listeners: Set<ActionNotificationListener> = new Set();
  private currentNotification: ActionNotification | null = null;
  private enabled: boolean = true;

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    console.log('🔔 [ActionNotifier] Initialized');
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ActionNotifier {
    if (!ActionNotifier.instance) {
      ActionNotifier.instance = new ActionNotifier();
    }
    return ActionNotifier.instance;
  }

  /**
   * Subscribe to action notifications
   * 
   * @param listener - Callback function to receive notifications
   * @returns Unsubscribe function
   */
  public subscribe(listener: ActionNotificationListener): () => void {
    this.listeners.add(listener);
    console.log(`🔔 [ActionNotifier] Listener subscribed (total: ${this.listeners.size})`);
    
    // Send current notification if available
    if (this.currentNotification) {
      listener(this.currentNotification);
    }
    
    return () => {
      this.listeners.delete(listener);
      console.log(`🔔 [ActionNotifier] Listener unsubscribed (total: ${this.listeners.size})`);
    };
  }

  /**
   * Notify all listeners about an action
   * 
   * @param notification - Action notification details
   */
  public notify(notification: ActionNotification): void {
    if (!this.enabled) {
      return;
    }

    this.currentNotification = notification;
    
    console.log(`🔔 [ActionNotifier] Notifying ${this.listeners.size} listeners:`, {
      type: notification.type,
      message: notification.message,
      isIdle: notification.isIdle,
    });

    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.error('🔔 [ActionNotifier] Listener error:', error);
      }
    });
  }

  /**
   * Notify about a search action
   * 
   * @param query - Search query
   */
  public notifySearch(query: string): void {
    this.notify({
      type: 'search',
      message: `Searching: ${query}`,
      isIdle: false,
      timestamp: Date.now(),
    });
  }

  /**
   * Notify about a click action
   * 
   * @param elementId - Target element ID
   * @param message - Optional custom message
   * @param position - Optional position
   */
  public notifyClick(elementId: string, message?: string, position?: { x: number; y: number }): void {
    this.notify({
      type: 'click',
      message: message || 'Clicked element',
      targetElementId: elementId,
      isIdle: true,
      position,
      timestamp: Date.now(),
    });
  }

  /**
   * Notify about a type action
   * 
   * @param elementId - Target element ID
   * @param text - Text being typed
   * @param message - Optional custom message
   * @param position - Optional position
   */
  public notifyType(elementId: string, text: string, message?: string, position?: { x: number; y: number }): void {
    const truncatedText = text.length > 20 ? `${text.substring(0, 20)}...` : text;
    this.notify({
      type: 'type',
      message: message || `Typed: "${truncatedText}"`,
      targetElementId: elementId,
      isIdle: true,
      position,
      timestamp: Date.now(),
    });
  }

  /**
   * Notify about a navigation action
   * 
   * @param path - Target path
   * @param message - Optional custom message
   */
  public notifyNavigate(path: string, message?: string): void {
    this.notify({
      type: 'navigate',
      message: message || `Navigating to ${path}`,
      isIdle: false,
      timestamp: Date.now(),
    });
  }

  /**
   * Notify about idle/ready state
   * 
   * @param message - Status message
   */
  public notifyReady(message: string = 'Ready'): void {
    this.notify({
      type: 'ready',
      message,
      isIdle: true,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear current notification
   */
  public clear(): void {
    console.log('🔔 [ActionNotifier] Clearing notification');
    this.currentNotification = null;
    
    // Notify listeners with a "ready" state
    this.notifyReady();
  }

  /**
   * Get current notification
   */
  public getCurrentNotification(): ActionNotification | null {
    return this.currentNotification;
  }

  /**
   * Enable notifications
   */
  public enable(): void {
    this.enabled = true;
    console.log('🔔 [ActionNotifier] Enabled');
  }

  /**
   * Disable notifications
   */
  public disable(): void {
    this.enabled = false;
    console.log('🔔 [ActionNotifier] Disabled');
  }

  /**
   * Check if notifications are enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get number of active listeners
   */
  public getListenerCount(): number {
    return this.listeners.size;
  }

  /**
   * Clear all listeners (cleanup)
   */
  public clearListeners(): void {
    this.listeners.clear();
    console.log('🔔 [ActionNotifier] All listeners cleared');
  }

  /**
   * Reset singleton instance (for testing)
   */
  public static reset(): void {
    if (ActionNotifier.instance) {
      ActionNotifier.instance.clearListeners();
      ActionNotifier.instance = null;
    }
  }
}

/**
 * Export convenience function for getting instance
 */
export function getActionNotifier(): ActionNotifier {
  return ActionNotifier.getInstance();
}




