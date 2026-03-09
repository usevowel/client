/**
 * @fileoverview Floating Action Pill - Mobile-friendly action notification
 * 
 * A horizontal pill component that displays action messages at the bottom of the screen.
 * Designed for mobile environments where the floating cursor might be difficult to read.
 * Mirrors action messages from the floating cursor system.
 * 
 * @module @vowel.to/client/ui
 * @author vowel.to
 * @license Proprietary
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '../utils';
import type { ActionNotification, ActionType } from '../core/action-notifier';

/**
 * Floating Action Pill configuration
 */
export interface FloatingActionPillConfig {
  /** Whether the pill is enabled */
  enabled: boolean;
  
  /** Position from bottom in pixels */
  bottomOffset?: number;
  
  /** Auto-hide delay in milliseconds (0 = no auto-hide) */
  autoHideDelay?: number;
  
  /** Maximum width in pixels */
  maxWidth?: number;
  
  /** Z-index for positioning */
  zIndex?: number;
  
  /** Show only on mobile devices */
  mobileOnly?: boolean;
}

/**
 * Floating Action Pill component props
 */
export interface FloatingActionPillProps {
  /** Current action notification */
  notification: ActionNotification | null;
  
  /** Whether the pill is visible */
  visible?: boolean;
  
  /** Configuration options */
  config?: Partial<FloatingActionPillConfig>;
  
  /** Custom className */
  className?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<FloatingActionPillConfig> = {
  enabled: true,
  bottomOffset: 24,
  autoHideDelay: 3000,
  maxWidth: 400,
  zIndex: 9998,
  mobileOnly: false,
};

/**
 * Get icon for action type
 */
function getActionIcon(type: ActionType): string {
  switch (type) {
    case 'search':
      return '🔍';
    case 'click':
      return '👆';
    case 'type':
      return '⌨️';
    case 'focus':
      return '🎯';
    case 'scroll':
      return '📜';
    case 'navigate':
      return '🧭';
    case 'ready':
      return '✅';
    case 'idle':
      return '⏸️';
    case 'custom':
    default:
      return '⚡';
  }
}

/**
 * Get background color for action type
 */
function getActionColor(type: ActionType, isIdle: boolean): string {
  if (isIdle || type === 'ready') {
    return 'bg-green-600';
  }
  
  switch (type) {
    case 'search':
      return 'bg-blue-600';
    case 'click':
      return 'bg-purple-600';
    case 'type':
      return 'bg-indigo-600';
    case 'focus':
      return 'bg-pink-600';
    case 'scroll':
      return 'bg-orange-600';
    case 'navigate':
      return 'bg-cyan-600';
    default:
      return 'bg-gray-600';
  }
}

/**
 * Floating Action Pill Component
 * 
 * Displays action notifications at the bottom center of the screen.
 * Provides visual feedback for AI actions, especially useful on mobile.
 * 
 * @example
 * ```tsx
 * import { FloatingActionPill } from '@vowel.to/client/ui';
 * 
 * function MyApp() {
 *   const [notification, setNotification] = useState(null);
 *   
 *   return (
 *     <FloatingActionPill
 *       notification={notification}
 *       visible={true}
 *       config={{ bottomOffset: 30, mobileOnly: true }}
 *     />
 *   );
 * }
 * ```
 */
export function FloatingActionPill({
  notification,
  visible = true,
  config: configProp,
  className,
}: FloatingActionPillProps) {
  const config = { ...DEFAULT_CONFIG, ...configProp };
  const [isVisible, setIsVisible] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<ActionNotification | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  // Update visibility and notification
  useEffect(() => {
    if (!config.enabled || !visible) {
      setIsVisible(false);
      return;
    }

    if (notification) {
      setCurrentNotification(notification);
      setIsVisible(true);

      // Clear existing timeout
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      // Auto-hide after delay (if configured)
      if (config.autoHideDelay > 0 && notification.isIdle) {
        hideTimeoutRef.current = window.setTimeout(() => {
          setIsVisible(false);
        }, config.autoHideDelay);
      }
    }

    return () => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [notification, visible, config.enabled, config.autoHideDelay]);

  // Don't render if not visible or no notification
  if (!isVisible || !currentNotification) {
    return null;
  }

  const icon = getActionIcon(currentNotification.type);
  const bgColor = getActionColor(currentNotification.type, currentNotification.isIdle);

  return (
    <div
      className={cn(
        "fixed left-1/2 -translate-x-1/2 pointer-events-none",
        "transition-all duration-300 ease-out",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        className
      )}
      style={{
        bottom: `${config.bottomOffset}px`,
        maxWidth: `${config.maxWidth}px`,
        zIndex: config.zIndex,
      }}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-full",
          "shadow-lg backdrop-blur-md",
          "text-white font-medium text-sm",
          bgColor
        )}
      >
        {/* Icon */}
        <span className="text-lg" role="img" aria-hidden="true">
          {icon}
        </span>

        {/* Message */}
        <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]">
          {currentNotification.message}
        </span>

        {/* Loading indicator for non-idle actions */}
        {!currentNotification.isIdle && (
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
        )}
      </div>
    </div>
  );
}

/**
 * Floating Action Pill Manager (Non-React)
 * 
 * Manages the pill's lifecycle in non-React environments.
 * Uses DOM manipulation directly.
 */
export class FloatingActionPillManager {
  private config: Required<FloatingActionPillConfig>;
  private element: HTMLDivElement | null = null;
  private isVisible: boolean = false;
  private currentNotification: ActionNotification | null = null;
  private hideTimeout: number | null = null;

  constructor(config: FloatingActionPillConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.enabled) {
      this.initialize();
    }
    
    console.log('💊 [FloatingActionPillManager] Initialized:', { enabled: this.config.enabled });
  }

  /**
   * Initialize the pill element
   */
  private initialize(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('💊 [FloatingActionPillManager] Cannot initialize - window/document not available');
      return;
    }

    // Create the pill element
    this.element = document.createElement('div');
    this.element.id = 'vowel-action-pill';
    this.element.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: ${this.config.bottomOffset}px;
      transform: translateX(-50%) translateY(100%);
      max-width: ${this.config.maxWidth}px;
      z-index: ${this.config.zIndex};
      pointer-events: none;
      opacity: 0;
      transition: opacity 300ms ease-out, transform 300ms ease-out;
    `;

    document.body.appendChild(this.element);
    console.log('💊 [FloatingActionPillManager] Element created');
  }

  /**
   * Show a notification
   */
  public show(notification: ActionNotification): void {
    if (!this.config.enabled || !this.element) {
      return;
    }

    this.currentNotification = notification;
    
    // Clear existing hide timeout
    if (this.hideTimeout) {
      window.clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Update content
    const icon = getActionIcon(notification.type);
    const bgColor = getActionColor(notification.type, notification.isIdle);
    const loadingDot = !notification.isIdle 
      ? '<span style="display: inline-block; width: 8px; height: 8px; background: white; border-radius: 50%; animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></span>'
      : '';

    this.element.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        border-radius: 9999px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        backdrop-filter: blur(12px);
        color: white;
        font-weight: 500;
        font-size: 14px;
      " class="${bgColor}">
        <span style="font-size: 18px;">${icon}</span>
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px;">
          ${notification.message}
        </span>
        ${loadingDot}
      </div>
    `;

    // Show with animation
    requestAnimationFrame(() => {
      if (this.element) {
        this.element.style.opacity = '1';
        this.element.style.transform = 'translateX(-50%) translateY(0)';
      }
    });

    this.isVisible = true;

    // Auto-hide after delay (if configured and action is idle)
    if (this.config.autoHideDelay > 0 && notification.isIdle) {
      this.hideTimeout = window.setTimeout(() => {
        this.hide();
      }, this.config.autoHideDelay);
    }

    console.log('💊 [FloatingActionPillManager] Showing:', notification.message);
  }

  /**
   * Hide the pill
   */
  public hide(): void {
    if (!this.element || !this.isVisible) {
      return;
    }

    this.element.style.opacity = '0';
    this.element.style.transform = 'translateX(-50%) translateY(100%)';
    this.isVisible = false;

    if (this.hideTimeout) {
      window.clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    console.log('💊 [FloatingActionPillManager] Hidden');
  }

  /**
   * Check if the pill is currently visible
   */
  public isActive(): boolean {
    return this.isVisible;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<FloatingActionPillConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.enabled !== undefined) {
      if (config.enabled && !this.element) {
        this.initialize();
      } else if (!config.enabled && this.element) {
        this.destroy();
      }
    }

    // Update element styles if it exists
    if (this.element) {
      this.element.style.bottom = `${this.config.bottomOffset}px`;
      this.element.style.maxWidth = `${this.config.maxWidth}px`;
      this.element.style.zIndex = String(this.config.zIndex);
    }

    console.log('💊 [FloatingActionPillManager] Configuration updated:', config);
  }

  /**
   * Get current notification
   */
  public getCurrentNotification(): ActionNotification | null {
    return this.currentNotification;
  }

  /**
   * Cleanup and remove the pill
   */
  public destroy(): void {
    console.log('💊 [FloatingActionPillManager] Destroying');

    if (this.hideTimeout) {
      window.clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    this.isVisible = false;
    this.currentNotification = null;
  }
}

/**
 * Create a floating action pill instance
 */
export function createFloatingActionPill(config?: Partial<FloatingActionPillConfig>): FloatingActionPillManager {
  return new FloatingActionPillManager({
    enabled: true,
    ...config,
  });
}




