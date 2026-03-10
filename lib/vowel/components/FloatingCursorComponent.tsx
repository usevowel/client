/**
 * @fileoverview FloatingCursor React Component - Visual indicator for AI automation
 * 
 * A React component that displays an animated cursor with a text badge to show where the AI
 * is interacting with the page during voice-controlled automation.
 * 
 * Features:
 * - Smooth position transitions
 * - Typing animation for text labels
 * - Bounce animation when idle
 * - Smart badge positioning (flips to right edge if needed)
 * - Fully styled with Tailwind CSS
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { useEffect, useState, useRef } from 'react';
import { cn, VOWEL_UI_SCOPE_CLASS } from '../utils';

/**
 * FloatingCursor component props
 */
export interface FloatingCursorComponentProps {
  /** X position as percentage (0-100) */
  x?: number;
  
  /** Y position as percentage (0-100) */
  y?: number;
  
  /** Text to display in badge */
  text?: string;
  
  /** Whether cursor is idle (shows bounce animation) */
  isIdle?: boolean;
  
  /** Whether cursor is visible */
  visible?: boolean;
  
  /** Cursor color (hex) */
  cursorColor?: string;
  
  /** Cursor size in pixels */
  cursorSize?: number;
  
  /** Badge background color (hex) */
  badgeBackground?: string;
  
  /** Badge text color (hex) */
  badgeTextColor?: string;
  
  /** Enable typing animation */
  enableTyping?: boolean;
  
  /** Typing speed in milliseconds */
  typingSpeed?: number;
  
  /** Enable bounce animation when idle */
  enableBounce?: boolean;
  
  /** Transition duration in milliseconds */
  transitionDuration?: number;
  
  /** Z-index for positioning */
  zIndex?: number;
  
  /** Callback when typing animation completes */
  onTypingComplete?: () => void;
}

/**
 * FloatingCursor Component
 * 
 * Displays an animated cursor with text badge to visualize AI automation actions.
 * 
 * @example
 * ```tsx
 * <FloatingCursorComponent
 *   x={50}
 *   y={50}
 *   text="Clicking button"
 *   visible={true}
 *   isIdle={false}
 * />
 * ```
 */
export function FloatingCursorComponent({
  x = 50,
  y = 50,
  text = '',
  isIdle = false,
  visible = false,
  cursorColor = '#000000',
  cursorSize = 24,
  badgeBackground = '#000000',
  badgeTextColor = '#ffffff',
  enableTyping = true,
  typingSpeed = 50,
  enableBounce = true,
  transitionDuration = 1000,
  zIndex = 9999,
  onTypingComplete,
}: FloatingCursorComponentProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [showBadge, setShowBadge] = useState(false);
  const [badgePosition, setBadgePosition] = useState<'left' | 'right'>('left');
  const typingIntervalRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate if badge should be positioned on right (when cursor is near right edge)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cursorX = (x / 100) * window.innerWidth;
      const viewportWidth = window.innerWidth;
      const distanceFromRightEdge = viewportWidth - cursorX;
      const edgeThreshold = 200; // Flip if within 200px of right edge
      
      setBadgePosition(distanceFromRightEdge < edgeThreshold ? 'right' : 'left');
    }
  }, [x]);

  // Typing animation effect
  useEffect(() => {
    // Clear any existing interval
    if (typingIntervalRef.current !== null) {
      window.clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    if (!text) {
      setDisplayedText('');
      setShowBadge(false);
      return;
    }

    // Show badge
    setShowBadge(true);

    if (!enableTyping) {
      // No typing animation - show text immediately
      setDisplayedText(text);
      onTypingComplete?.();
      return;
    }

    // Reset displayed text and start typing
    setDisplayedText('');
    let currentIndex = 0;

    const typeNextChar = () => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        // Typing complete
        if (typingIntervalRef.current !== null) {
          window.clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        onTypingComplete?.();
      }
    };

    // Start typing
    typeNextChar(); // Type first character immediately
    typingIntervalRef.current = window.setInterval(typeNextChar, typingSpeed);

    return () => {
      if (typingIntervalRef.current !== null) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [text, enableTyping, typingSpeed, onTypingComplete]);

  // Cursor SVG
  const cursorSvg = (
    <svg 
      viewBox="0 0 24 24" 
      fill={cursorColor} 
      width={cursorSize} 
      height={cursorSize}
      className="drop-shadow-md"
    >
      <path d="M7.4 2.5l-.9 15.9 3.9-4.2 3.7 6.8 2.5-1.3-3.7-6.8 5.4-1.6L7.4 2.5z"/>
    </svg>
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        VOWEL_UI_SCOPE_CLASS,
        "fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
      style={{ zIndex }}
    >
      <div
        className="absolute transition-all ease-out"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)', // Center cursor on target point
          transitionDuration: `${transitionDuration}ms`,
        }}
      >
        {/* Cursor icon */}
        <div
          className={cn(
            "relative",
            enableBounce && isIdle && "animate-bounce"
          )}
          style={{
            width: `${cursorSize}px`,
            height: `${cursorSize}px`,
          }}
        >
          {cursorSvg}
          
          {/* Badge (pill label below cursor) */}
          <div
            className={cn(
              "absolute top-full mt-1 px-3 py-1.5 rounded-xl shadow-lg",
              "font-sans text-sm font-medium whitespace-nowrap",
              "transition-all duration-200 backdrop-blur-sm",
              showBadge ? "opacity-100" : "opacity-0",
              badgePosition === 'right' ? "right-0" : "left-0"
            )}
            style={{
              backgroundColor: badgeBackground,
              color: badgeTextColor,
            }}
          >
            {displayedText}
            {enableTyping && displayedText.length < text.length && (
              <span className="inline-block ml-0.5 animate-pulse">|</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
