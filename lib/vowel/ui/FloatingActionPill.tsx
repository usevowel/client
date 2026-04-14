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
import type { ActionNotification } from '../core/action-notifier';
import {
  getActionColor,
  getActionIcon,
  type FloatingActionPillConfig,
} from './FloatingActionPillManager';

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

export {
  FloatingActionPillManager,
  createFloatingActionPill,
  type FloatingActionPillConfig,
} from './FloatingActionPillManager';
