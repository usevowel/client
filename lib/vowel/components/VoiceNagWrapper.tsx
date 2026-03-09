/**
 * @fileoverview VoiceNagWrapper Component - Promotional wrapper for voice agent button
 * 
 * This component wraps the floating agent button with an optional "nag" message that
 * introduces users to the voice agent feature. The nag appears once and can be dismissed
 * either by clicking the acknowledge button or by using the voice agent. State is persisted
 * to localStorage so it doesn't reappear after dismissal.
 * 
 * Features:
 * - Optional nag message with customizable content
 * - Auto-dismisses on first voice agent use
 * - Manual dismiss with acknowledge button
 * - LocalStorage persistence
 * - Smooth animations
 * - Responsive positioning based on button position
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { useState, useEffect, type ReactNode } from "react";
import { X, Mic } from "lucide-react";
import { cn } from "../utils";
import type { VowelPosition } from "./types";

/**
 * Props for VoiceNagWrapper
 */
export interface VoiceNagWrapperProps {
  /** Whether to show the nag (if not already dismissed) */
  enabled?: boolean;

  /** Position of the floating button (affects nag layout) */
  position?: VowelPosition;

  /** Custom className for the wrapper */
  className?: string;

  /** Custom title for the nag message */
  nagTitle?: string;

  /** Custom description for the nag message */
  nagDescription?: string;

  /** Custom acknowledge button text */
  nagButtonText?: string;

  /** LocalStorage key prefix for storing dismissed state */
  storageKeyPrefix?: string;

  /** Children (typically the FloatingMicButton) */
  children: ReactNode;

  /** Callback when nag is dismissed */
  onDismiss?: () => void;

  /** Whether the voice agent is currently connected (auto-dismiss on first use) */
  isConnected?: boolean;
}

/**
 * Default nag content
 */
const DEFAULT_NAG_TITLE = "Try Voice Shopping! 🎤";
const DEFAULT_NAG_DESCRIPTION = "Get personalized help finding products, checking out, and more—all hands-free with our voice assistant.";
const DEFAULT_NAG_BUTTON_TEXT = "Got it";
const DEFAULT_STORAGE_KEY_PREFIX = "vowel-voice-nag";

/**
 * VoiceNagWrapper Component
 * 
 * Wraps the voice agent button with an optional promotional message that introduces
 * the feature to users. The message is shown once and persisted to localStorage.
 * 
 * @example
 * ```tsx
 * <VoiceNagWrapper
 *   enabled={true}
 *   position="bottom-right"
 *   isConnected={state.isConnected}
 *   onDismiss={() => console.log('Nag dismissed')}
 * >
 *   <FloatingMicButton {...buttonProps} />
 * </VoiceNagWrapper>
 * ```
 */
export function VoiceNagWrapper({
  enabled = false,
  position = "bottom-right",
  className,
  nagTitle = DEFAULT_NAG_TITLE,
  nagDescription = DEFAULT_NAG_DESCRIPTION,
  nagButtonText = DEFAULT_NAG_BUTTON_TEXT,
  storageKeyPrefix = DEFAULT_STORAGE_KEY_PREFIX,
  children,
  onDismiss,
  isConnected = false,
}: VoiceNagWrapperProps) {
  const [showNag, setShowNag] = useState(false);
  const [hasUsedVoiceAgent, setHasUsedVoiceAgent] = useState(false);

  // Storage keys
  const dismissedKey = `${storageKeyPrefix}-dismissed`;
  const usedKey = `${storageKeyPrefix}-used`;

  // Initialize nag visibility from localStorage
  useEffect(() => {
    if (!enabled) {
      setShowNag(false);
      return;
    }

    try {
      const isDismissed = localStorage.getItem(dismissedKey) === "true";
      const isUsed = localStorage.getItem(usedKey) === "true";

      // Show nag if it hasn't been dismissed and voice agent hasn't been used
      setShowNag(!isDismissed && !isUsed);
      setHasUsedVoiceAgent(isUsed);
    } catch (error) {
      console.error("[VoiceNagWrapper] Error reading localStorage:", error);
      setShowNag(false);
    }
  }, [enabled, dismissedKey, usedKey]);

  // Auto-dismiss on first voice agent use
  useEffect(() => {
    if (isConnected && !hasUsedVoiceAgent && showNag) {
      console.log("[VoiceNagWrapper] Voice agent used for first time - dismissing nag");
      handleDismiss(true);
    }
  }, [isConnected, hasUsedVoiceAgent, showNag]);

  /**
   * Handle nag dismissal
   * @param viaUsage - True if dismissed via voice agent usage, false if manual dismiss
   */
  const handleDismiss = (viaUsage = false) => {
    try {
      // Mark as dismissed
      localStorage.setItem(dismissedKey, "true");
      
      // If dismissed via usage, also mark as used
      if (viaUsage) {
        localStorage.setItem(usedKey, "true");
        setHasUsedVoiceAgent(true);
      }

      setShowNag(false);
      onDismiss?.();
    } catch (error) {
      console.error("[VoiceNagWrapper] Error writing to localStorage:", error);
      setShowNag(false);
    }
  };

  // If nag is disabled or not showing, render children only
  if (!enabled || !showNag) {
    return <>{children}</>;
  }

  // Determine layout direction based on position
  const isRight = position.includes("right");

  // Layout classes based on position
  const containerClasses = cn(
    "flex items-center gap-3 p-3 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50",
    "bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl",
    "animate-in slide-in-from-bottom-4 fade-in duration-500",
    isRight ? "flex-row-reverse" : "flex-row",
    className
  );

  const nagContentClasses = cn(
    "flex flex-col gap-2 max-w-xs",
    isRight ? "text-right" : "text-left"
  );

  return (
    <div className={containerClasses}>
      {/* Nag Message Content */}
      <div className={nagContentClasses}>
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
            {nagTitle}
          </h4>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          {nagDescription}
        </p>

        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => handleDismiss(false)}
            className="flex-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            {nagButtonText}
          </button>
          <button
            onClick={() => handleDismiss(false)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Voice Agent Button */}
      <div className="flex-shrink-0">
        {children}
      </div>
    </div>
  );
}

