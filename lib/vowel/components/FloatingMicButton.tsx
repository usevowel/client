/**
 * @fileoverview Floating Microphone Button Component
 * 
 * A floating microphone button displayed in controlled tabs, showing the current
 * voice session state with animations and allowing users to stop the session.
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { useState } from 'react';
import { Mic, MicOff, Loader2, Sparkles, Brain, MessageCircle, Settings, Pause, Wrench, Moon } from 'lucide-react';
import { cn, VOWEL_UI_SCOPE_CLASS } from '../utils';
import { VowelSettingsModal, type VowelSettingsModalMock } from './VowelSettingsModal';
import type { Vowel } from '../core/VowelClient';

/**
 * Voice session state (subset used for UI display)
 */
export interface FloatingMicButtonState {
  /** Whether voice session is connected */
  isConnected?: boolean;
  
  /** Whether voice session is connecting */
  isConnecting?: boolean;
  
  /** Whether voice session is disconnecting */
  isDisconnecting?: boolean;
  
  /** Whether user is speaking */
  isUserSpeaking?: boolean;
  
  /** Whether AI is speaking */
  isAiSpeaking?: boolean;
  
  /** Whether AI is thinking */
  isAiThinking?: boolean;
  
  /** Whether AI is executing a tool */
  isToolExecuting?: boolean;
  
  /** Whether session is hibernated (sleeping) */
  isHibernated?: boolean;
  
  /** Whether session is resuming */
  isResuming?: boolean;
  
  /** Whether session is paused */
  isPaused?: boolean;
  
  /** Whether there is an error */
  hasError?: boolean;
}

/**
 * FloatingMicButton component props
 */
export interface FloatingMicButtonProps extends FloatingMicButtonState {
  /** Custom className */
  className?: string;
  
  /** Position (default: bottom-right) */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  
  /** Z-index for positioning */
  zIndex?: number;
  
  /** Click handler */
  onClick?: () => void;
  
  /** Button title/tooltip */
  title?: string;
  
  /** If true, don't apply fixed positioning (for inline use) */
  inline?: boolean;
  
  /** If true, show action icon (what will happen on click) instead of current state */
  showActionIcon?: boolean;
  
  /** If true, show settings button */
  showSettings?: boolean;
  
  /** Settings button click handler (optional - if not provided, modal is managed internally) */
  onSettingsClick?: () => void;
  
  /** Optional Vowel client instance (for settings modal - will use useVowel() hook if not provided) */
  client?: Vowel | null;
  
  /** @internal Mock data for settings modal in Storybook (not part of public API) */
  __mockSettings?: VowelSettingsModalMock;
}

/**
 * FloatingMicButton Component
 * 
 * Displays a floating microphone button that shows voice session state.
 * 
 * @example
 * ```tsx
 * <FloatingMicButton
 *   isConnected={true}
 *   isUserSpeaking={false}
 *   onClick={handleStop}
 * />
 * ```
 */
export function FloatingMicButton({
  isConnected = false,
  isConnecting = false,
  isDisconnecting = false,
  isUserSpeaking = false,
  isAiSpeaking = false,
  isAiThinking = false,
  isToolExecuting = false,
  isHibernated = false,
  isResuming = false,
  isPaused = false,
  hasError = false,
  className,
  position = 'bottom-right',
  zIndex = 999998,
  onClick,
  title = 'Stop voice session & close tab',
  inline = false,
  showActionIcon = false,
  showSettings = false,
  onSettingsClick,
  client,
  __mockSettings,
}: FloatingMicButtonProps) {
  // Debug logging for prop changes (helps verify r2wc is passing updates)
  console.log('[FloatingMicButton] Rendering with props:', {
    isConnected,
    isConnecting,
    isDisconnecting,
    isUserSpeaking,
    isAiSpeaking,
    isAiThinking,
    isResuming,
    hasError
  });
  
  // Internal settings modal state (only used if onSettingsClick is not provided)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Handle settings click - use callback if provided, otherwise manage internally
  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    } else {
      setIsSettingsOpen(true);
    }
  };
  
  // Determine button state and styling
  const getButtonState = () => {
    // Error state takes priority over everything
    if (hasError) return 'error';
    // Disconnecting state takes priority (show immediately when disconnect starts)
    if (isDisconnecting) return 'disconnecting';
    if (isResuming) return 'resuming';
    if (isConnecting) return 'connecting';
    if (isPaused) return 'paused';
    // Hibernation state - show sleeping icon
    if (isHibernated) return 'hibernated';
    if (isAiSpeaking) return 'ai-speaking';
    if (isToolExecuting) return 'tool-executing';
    if (isAiThinking) return 'ai-thinking';
    if (isUserSpeaking) return 'user-speaking';
    if (isConnected) return 'connected';
    return 'disconnected';
  };

  const buttonState = getButtonState();
  
  // Extra logging for AI speaking state
  if (isAiSpeaking) {
    console.log('🔊 [FloatingMicButton] AI IS SPEAKING! Button state:', buttonState);
    console.log('🔊 [FloatingMicButton] Should show purple background and pulse');
  }

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  // Get inline background style for all states (hardcoded gradients)
  const getBackgroundStyle = () => {
    switch (buttonState) {
      case 'error':
        return {
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
        };
      case 'disconnecting':
        return {
          background: 'linear-gradient(135deg, #4a5568 0%, #1a202c 100%)' // Same as disconnected (gray)
        };
      case 'resuming':
        return {
          background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #ec4899 100%)',
          backgroundSize: '400% 400%'
        };
      case 'connecting':
        return {
          background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)'
        };
      case 'paused':
        return {
          background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
        };
      case 'hibernated':
        return {
          background: 'linear-gradient(135deg, #4c51bf 0%, #6b46c1 50%, #805ad5 100%)' // Deep purple/blue for sleeping
        };
      case 'user-speaking':
        return {
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
        };
      case 'tool-executing':
        return {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' // Amber - slightly different shade
        };
      case 'ai-thinking':
        return {
          background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' // Yellow
        };
      case 'ai-speaking':
        return {
          background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)'
        };
      case 'connected':
        return {
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
        };
      default: // disconnected
        return {
          background: 'linear-gradient(135deg, #4a5568 0%, #1a202c 100%)'
        };
    }
  };

  // Additional classes for animations (pulse, gradient shift)
  const getAnimationClass = () => {
    switch (buttonState) {
      case 'error':
        return 'animate-pulse';
      case 'resuming':
        return 'vowel-animate-gradient-shift';
      case 'hibernated':
        return 'animate-pulse';
      case 'user-speaking':
      case 'ai-speaking':
        return 'animate-pulse';
      default:
        return '';
    }
  };

  // Border color based on state
  const getBorderClass = () => {
    switch (buttonState) {
      case 'error':
        return 'border-red-300/50';
      case 'disconnecting':
        return 'border-white/50'; // Same as disconnected
      case 'resuming':
        return 'border-blue-300/50';
      case 'connecting':
        return 'border-yellow-300/50';
      case 'paused':
        return 'border-slate-400/50';
      case 'hibernated':
        return 'border-indigo-300/50';
      case 'user-speaking':
        return 'border-blue-300/50';
      case 'tool-executing':
        return 'border-amber-300/50';
      case 'ai-thinking':
        return 'border-yellow-300/50';
      case 'ai-speaking':
        return 'border-purple-300/50';
      case 'connected':
        return 'border-green-400/50';
      default:
        return 'border-white/50';
    }
  };

  // Shadow based on state
  const getShadowClass = () => {
    switch (buttonState) {
      case 'error':
        return 'shadow-[0_8px_24px_rgba(239,68,68,0.5)]';
      case 'disconnecting':
        return 'shadow-[0_8px_24px_rgba(0,0,0,0.3)]'; // Same as disconnected
      case 'resuming':
      case 'user-speaking':
        return 'shadow-[0_8px_24px_rgba(59,130,246,0.5)]';
      case 'connecting':
      case 'ai-thinking':
        return 'shadow-[0_8px_24px_rgba(234,179,8,0.5)]';
      case 'tool-executing':
        return 'shadow-[0_8px_24px_rgba(245,158,11,0.5)]'; // Amber shadow
      case 'paused':
        return 'shadow-[0_8px_24px_rgba(100,116,139,0.3)]';
      case 'hibernated':
        return 'shadow-[0_8px_24px_rgba(107,70,193,0.4)]';
      case 'ai-speaking':
        return 'shadow-[0_8px_24px_rgba(168,85,247,0.5)]';
      case 'connected':
        return 'shadow-[0_8px_24px_rgba(34,197,94,0.3)]';
      default:
        return 'shadow-[0_8px_24px_rgba(0,0,0,0.3)]';
    }
  };

  // Icon to show based on state
  const getIcon = () => {
    // Error state: MicOff icon (same as disconnected)
    if (hasError) {
      return <MicOff className="w-8 h-8" />;
    }
    
    // Disconnecting state: Spinner (same as connecting)
    if (isDisconnecting) {
      return <Loader2 className="w-8 h-8 animate-spin" />;
    }
    
    // Loading states
    if (isConnecting || isResuming) {
      return <Loader2 className="w-8 h-8 animate-spin" />;
    }
    
    // Paused state: Pause icon
    if (isPaused) {
      return <Pause className="w-8 h-8" />;
    }
    
    // Hibernated state: Moon icon (sleeping)
    if (isHibernated) {
      return <Moon className="w-8 h-8" />;
    }
    
    // AI speaking: Sparkles/stars icon
    if (isAiSpeaking) {
      return <Sparkles className="w-8 h-8" />;
    }
    
    // Tool executing: Wrench icon (different shade of yellow)
    if (isToolExecuting) {
      return <Wrench className="w-8 h-8" />;
    }
    
    // AI thinking: Brain icon
    if (isAiThinking) {
      return <Brain className="w-8 h-8" />;
    }
    
    // User speaking: MessageCircle (speaking head)
    if (isUserSpeaking) {
      return <MessageCircle className="w-8 h-8" />;
    }
    
    // Action icon mode: Show what will happen when clicked
    // - When connected, show Mic (currently on)
    // - When disconnected, show MicOff (currently off)
    if (showActionIcon) {
      return isConnected 
        ? <Mic className="w-8 h-8" />
        : <MicOff className="w-8 h-8" />;
    }
    
    // Current state mode: Show current state
    // - When connected, show Mic (currently on)
    // - When disconnected, show MicOff (currently off)
    return isConnected
      ? <Mic className="w-8 h-8" />
      : <MicOff className="w-8 h-8" />;
  };

  // Show ping effect for speaking states and error state
  const showPing = isUserSpeaking || isAiSpeaking || hasError;
  
  // Hover state for settings button
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Custom animations */}
      <style>
        {`
          @keyframes vowel-gradient-shift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          @keyframes vowel-ping {
            75%, 100% {
              transform: scale(2);
              opacity: 0;
            }
          }
          
          .vowel-animate-gradient-shift {
            animation: vowel-gradient-shift 3s ease infinite;
          }
          
          .vowel-animate-ping-effect {
            animation: vowel-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
          }
          
          /* Show settings button on hover */
          .vowel-mic-button-container:hover .vowel-settings-button {
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          
          /* Also show when hovering over the settings button itself */
          .vowel-settings-button:hover {
            opacity: 1 !important;
            pointer-events: auto !important;
          }
        `}
      </style>

      <div
        className={cn(
          VOWEL_UI_SCOPE_CLASS,
          !inline && "fixed",
          !inline && positionClasses[position],
          className
        )}
        style={!inline ? { zIndex } : undefined}
      >
        {/* Container for button and settings */}
        <div 
          className="vowel-mic-button-container" 
          style={{ padding: '15px', position: 'relative' }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Settings button - top right corner (shown on hover) */}
          {showSettings && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSettingsClick();
              }}
              className={cn(
                "vowel-settings-button absolute top-0 right-0",
                "w-[37.5px] h-[37.5px] rounded-lg",
                "flex items-center justify-center",
                "bg-white dark:bg-gray-800",
                "border-[1.5px] border-blue-400 dark:border-blue-500",
                "shadow-sm",
                "text-blue-600 dark:text-blue-400",
                "cursor-pointer",
                "transition-all duration-200",
                "z-10",
                "hover:bg-blue-50 dark:hover:bg-gray-700",
                isHovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
              )}
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-[17.5px] h-[17.5px]" />
            </button>
          )}
          
          {/* Main microphone button */}
          <button
            onClick={onClick}
            title={title}
            aria-label={title}
            className={cn(
              "relative w-20 h-20 rounded-2xl border-2",
              "flex items-center justify-center",
              "text-white cursor-pointer",
              "transition-all duration-300 ease-in-out",
              "hover:scale-105 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)]",
              "active:scale-95",
              "overflow-hidden backdrop-blur-sm",
              getAnimationClass(),
              getBorderClass(),
              getShadowClass()
            )}
            style={getBackgroundStyle()}
          >
          {/* Ping effect for speaking states */}
          {showPing && (
            <span
              className="absolute inset-0 rounded-2xl bg-current opacity-40 vowel-animate-ping-effect pointer-events-none"
            />
          )}

          {/* Gradient overlay */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl",
              "bg-gradient-to-br from-white/10 to-transparent",
              "transition-opacity duration-300 pointer-events-none",
              "group-hover:opacity-80"
            )}
          />

          {/* Icon */}
          <div className="relative z-10">
            {getIcon()}
          </div>
        </button>
        </div>
      </div>
      
      {/* Settings Modal - only show if managing internally (no onSettingsClick provided) */}
      {showSettings && !onSettingsClick && (
        <VowelSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          client={client}
          __mock={__mockSettings}
        />
      )}
    </>
  );
}
