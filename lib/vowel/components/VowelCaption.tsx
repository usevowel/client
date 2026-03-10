/**
 * @fileoverview VowelCaption Component - Real-time speech captions
 * 
 * This component displays real-time speech captions as floating toast notifications.
 * Shows both user and AI speech transcripts (complete transcripts only, no streaming).
 * 
 * @internal
 * Unofficial dev tool for testing speech transcription
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { useEffect, useState } from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';
import { useCaptionManager } from './hooks/useCaptionManager';
import { useVowel } from './VowelProviderSimple';
import { cn, VOWEL_UI_SCOPE_CLASS } from '../utils';
import { isMobile } from '../utils/device-detection';

/**
 * Props for VowelCaption component
 */
export interface VowelCaptionProps {
  /** Position of caption */
  position?: 'top-center' | 'bottom-center';
  /** Maximum width of caption */
  maxWidth?: string;
  /** Show role indicator (User/Assistant) - deprecated, kept for API compatibility */
  showRole?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * VowelCaption Component
 * 
 * Displays real-time speech captions as floating toast notifications.
 * Shows complete transcripts only (no streaming accumulation).
 * Integrated into VowelAgent component.
 * 
 * @internal
 * Unofficial dev tool - prefixed with underscore in config
 */
export function VowelCaption({
  position = 'top-center',
  maxWidth = '600px',
  showRole: _showRole = true, // Kept for API compatibility but not used
  className,
}: VowelCaptionProps) {
  const { caption, dismissCaption } = useCaptionManager();
  const { state, client } = useVowel();
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    setIsMobileDevice(isMobile());
    
    // Listen for resize events to update mobile detection
    const handleResize = () => {
      setIsMobileDevice(isMobile());
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if captions should be shown on mobile
  const captionConfig = client?.getConfig()._caption;
  const showOnMobile = captionConfig?.showOnMobile ?? false;
  
  // Hide on mobile if not enabled
  const shouldShow = !isMobileDevice || showOnMobile;

  // Handle visibility animation
  useEffect(() => {
    if (caption?.isVisible) {
      setIsVisible(true);
    } else {
      // Delay hiding for animation
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [caption?.isVisible]);

  // Dismiss captions when agent disconnects
  useEffect(() => {
    if (!state.isConnected && caption?.isVisible) {
      dismissCaption();
    }
  }, [state.isConnected, caption?.isVisible, dismissCaption]);

  if (!caption || !isVisible || !shouldShow) {
    return null;
  }

  const positionClasses = {
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={cn(
        VOWEL_UI_SCOPE_CLASS,
        'fixed z-[100] px-4 py-3 rounded-md shadow-2xl backdrop-blur-xl border',
        'transition-all duration-300 ease-in-out',
        'cursor-pointer hover:scale-[1.02] active:scale-[0.98]',
        // Dark mode colors - consistent for both user and assistant
        'bg-gray-900/95 text-gray-100 border-gray-700/50',
        'dark:bg-gray-800/95 dark:text-gray-100 dark:border-gray-600/50',
        positionClasses[position],
        className
      )}
      style={{ maxWidth }}
      onClick={dismissCaption}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        {/* Icon indicator */}
        <div className="flex-shrink-0 mt-0.5 relative">
          {caption.role === 'user' ? (
            <MessageCircle className="w-4 h-4 text-gray-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-gray-400" />
          )}
          {/* Streaming indicator */}
          {caption.isStreaming && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
          )}
        </div>
        {/* Caption text */}
        <div className="flex-1 text-sm leading-relaxed break-words">
          {caption.text}
        </div>
      </div>
    </div>
  );
}
