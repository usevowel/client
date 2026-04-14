/**
 * @fileoverview Floating Agent Pill Component
 *
 * A floating pill-shaped interface for the voice agent that displays session state
 * and provides controls including a 3-mode mute button and settings.
 * Replaces the microphone-focused FloatingMicButton with a speaking face icon.
 *
 * Features:
 * - Pill-shaped floating design (more modern than square button)
 * - Speaking face icon (instead of microphone)
 * - 3-mode mute button: Active → AI Muted → User Muted
 * - Settings button
 * - State-based gradient backgrounds
 * - Smooth animations and transitions
 *
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { useState } from 'react';
import { User, Volume2, VolumeX, MicOff, Settings, Loader2, Sparkles, Brain, Wrench, Moon, Pause } from 'lucide-react';
import { cn, VOWEL_UI_SCOPE_CLASS } from '../utils';
import { VowelSettingsModal, type VowelSettingsModalMock } from './VowelSettingsModal';
import type { Vowel } from '../core/VowelClient';

/**
 * Mute mode for the pill
 */
export type MuteMode = 'active' | 'ai-muted' | 'user-muted';

/**
 * Voice session state (subset used for UI display)
 */
export interface FloatingAgentPillState {
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
 * FloatingAgentPill component props
 */
export interface FloatingAgentPillProps extends FloatingAgentPillState {
  /** Custom className */
  className?: string;

  /** Position (default: bottom-right) */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

  /** Z-index for positioning */
  zIndex?: number;

  /** If true, don't apply fixed positioning (for inline use) */
  inline?: boolean;

  /** Current mute mode */
  muteMode?: MuteMode;

  /** Click handler for main button (toggles session) */
  onMainClick?: () => void;

  /** Click handler for mute button (cycles mute modes) */
  onMuteClick?: () => void;

  /** Click handler for settings button (optional - if not provided, modal is managed internally) */
  onSettingsClick?: () => void;

  /** Button title/tooltip for main button */
  mainButtonTitle?: string;

  /** Optional Vowel client instance (for settings modal - will use useVowel() hook if not provided) */
  client?: Vowel | null;

  /** @internal Mock data for settings modal in Storybook (not part of public API) */
  __mockSettings?: VowelSettingsModalMock;
}

/**
 * FloatingAgentPill Component
 *
 * Displays a floating pill interface for voice session control with:
 * - Speaking face icon showing current state
 * - 3-mode mute button (Active → AI Muted → User Muted)
 * - Settings button
 *
 * @example
 * ```tsx
 * <FloatingAgentPill
 *   isConnected={true}
 *   isUserSpeaking={false}
 *   muteMode="active"
 *   onMainClick={handleToggleSession}
 *   onMuteClick={handleMuteCycle}
 * />
 * ```
 */
export function FloatingAgentPill({
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
  inline = false,
  muteMode = 'active',
  onMainClick,
  onMuteClick,
  onSettingsClick,
  mainButtonTitle = 'Toggle voice session',
  client,
  __mockSettings,
}: FloatingAgentPillProps) {
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
    // Disconnecting state takes priority
    if (isDisconnecting) return 'disconnecting';
    if (isResuming) return 'resuming';
    if (isConnecting) return 'connecting';
    if (isPaused) return 'paused';
    // Hibernation state
    if (isHibernated) return 'hibernated';
    if (isAiSpeaking) return 'ai-speaking';
    if (isToolExecuting) return 'tool-executing';
    if (isAiThinking) return 'ai-thinking';
    if (isUserSpeaking) return 'user-speaking';
    if (isConnected) return 'connected';
    return 'disconnected';
  };

  const buttonState = getButtonState();

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  // Get background style based on state
  const getBackgroundStyle = () => {
    switch (buttonState) {
      case 'error':
        return { background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' };
      case 'disconnecting':
        return { background: 'linear-gradient(135deg, #4a5568 0%, #1a202c 100%)' };
      case 'resuming':
        return {
          background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #ec4899 100%)',
          backgroundSize: '400% 400%',
        };
      case 'connecting':
        return { background: 'linear-gradient(135deg, #fbbf24 0%, #f97316 100%)' };
      case 'paused':
        return { background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' };
      case 'hibernated':
        return { background: 'linear-gradient(135deg, #4c51bf 0%, #6b46c1 50%, #805ad5 100%)' };
      case 'user-speaking':
        return { background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' };
      case 'tool-executing':
        return { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' };
      case 'ai-thinking':
        return { background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' };
      case 'ai-speaking':
        return { background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' };
      case 'connected':
        return { background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' };
      default: // disconnected
        return { background: 'linear-gradient(135deg, #4a5568 0%, #1a202c 100%)' };
    }
  };

  // Animation class based on state
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
      case 'resuming':
      case 'user-speaking':
        return 'shadow-[0_8px_24px_rgba(59,130,246,0.5)]';
      case 'connecting':
      case 'ai-thinking':
        return 'shadow-[0_8px_24px_rgba(234,179,8,0.5)]';
      case 'tool-executing':
        return 'shadow-[0_8px_24px_rgba(245,158,11,0.5)]';
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

  // Get main icon based on state (user/speaking variations)
  const getMainIcon = () => {
    // Error state
    if (hasError) {
      return <User className="w-6 h-6 opacity-50" />;
    }

    // Loading states
    if (isConnecting || isDisconnecting || isResuming) {
      return <Loader2 className="w-6 h-6 animate-spin" />;
    }

    // Paused state
    if (isPaused) {
      return <Pause className="w-6 h-6" />;
    }

    // Hibernated state
    if (isHibernated) {
      return <Moon className="w-6 h-6" />;
    }

    // AI speaking: animated/sparkly user
    if (isAiSpeaking) {
      return <Sparkles className="w-6 h-6" />;
    }

    // Tool executing: wrench
    if (isToolExecuting) {
      return <Wrench className="w-6 h-6" />;
    }

    // AI thinking: brain
    if (isAiThinking) {
      return <Brain className="w-6 h-6" />;
    }

    // User speaking: active user icon
    if (isUserSpeaking) {
      return <User className="w-6 h-6" />;
    }

    // Default user icon
    return <User className="w-6 h-6" />;
  };

  // Get mute icon based on mode
  const getMuteIcon = () => {
    switch (muteMode) {
      case 'ai-muted':
        return <VolumeX className="w-4 h-4" />;
      case 'user-muted':
        return <MicOff className="w-4 h-4" />;
      case 'active':
      default:
        return <Volume2 className="w-4 h-4" />;
    }
  };

  // Get mute button tooltip
  const getMuteTooltip = () => {
    switch (muteMode) {
      case 'ai-muted':
        return 'AI audio muted (click to cycle)';
      case 'user-muted':
        return 'Microphone muted (click to cycle)';
      case 'active':
      default:
        return 'Audio active (click to cycle mute modes)';
    }
  };

  // Show ping effect for speaking states and error
  const showPing = isUserSpeaking || isAiSpeaking || hasError;

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
        `}
      </style>

      <div
        className={cn(
          VOWEL_UI_SCOPE_CLASS,
          !inline && 'fixed',
          !inline && positionClasses[position],
          className
        )}
        style={!inline ? { zIndex } : undefined}
      >
        {/* Main pill container */}
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-full border-2',
            'text-white cursor-pointer',
            'transition-all duration-300 ease-in-out',
            'hover:scale-105 hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)]',
            'active:scale-95',
            'overflow-hidden backdrop-blur-sm',
            getAnimationClass(),
            getBorderClass(),
            getShadowClass()
          )}
          style={getBackgroundStyle()}
        >
          {/* Ping effect for speaking states */}
          {showPing && (
            <span
              className="absolute inset-0 rounded-full bg-current opacity-40 vowel-animate-ping-effect pointer-events-none"
            />
          )}

          {/* Gradient overlay */}
          <div
            className={cn(
              'absolute inset-0 rounded-full',
              'bg-gradient-to-br from-white/10 to-transparent',
              'transition-opacity duration-300 pointer-events-none'
            )}
          />

          {/* Main button (face icon) */}
          <button
            onClick={onMainClick}
            title={mainButtonTitle}
            aria-label={mainButtonTitle}
            className="relative z-10 flex items-center justify-center w-8 h-8"
          >
            {getMainIcon()}
          </button>

          {/* Divider */}
          <div className="relative z-10 w-px h-6 bg-white/30" />

          {/* Mute button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMuteClick?.();
            }}
            title={getMuteTooltip()}
            aria-label={getMuteTooltip()}
            className={cn(
              'relative z-10 flex items-center justify-center w-8 h-8 rounded-full',
              'transition-all duration-200',
              'hover:bg-white/20',
              muteMode !== 'active' && 'bg-white/20'
            )}
          >
            {getMuteIcon()}
          </button>

          {/* Settings button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSettingsClick();
            }}
            title="Settings"
            aria-label="Settings"
            className={cn(
              'relative z-10 flex items-center justify-center w-8 h-8 rounded-full',
              'transition-all duration-200',
              'hover:bg-white/20'
            )}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Modal - only show if managing internally (no onSettingsClick provided) */}
      {!onSettingsClick && (
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
