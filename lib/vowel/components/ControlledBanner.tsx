/**
 * @fileoverview Controlled Banner Component
 * 
 * A banner displayed at the top of controlled tabs to indicate they are being
 * controlled by the Vowel voice agent. Features Paper Design mesh gradient background.
 * 
 * @module @vowel.to/client/components
 * @author vowel.to
 * @license Proprietary
 */

import { useEffect, useState } from 'react';
import { MeshGradient } from './shaders/MeshGradient';

/**
 * Voice session state (for color changes)
 */
export interface VoiceSessionState {
  /** Whether voice session is connected */
  isConnected?: boolean;
  
  /** Whether voice session is connecting */
  isConnecting?: boolean;
  
  /** Whether user is speaking */
  isUserSpeaking?: boolean;
  
  /** Whether AI is speaking */
  isAiSpeaking?: boolean;
  
  /** Whether AI is thinking */
  isAiThinking?: boolean;
  
  /** Whether AI is executing a tool */
  isToolExecuting?: boolean;
  
  /** Whether session is resuming */
  isResuming?: boolean;
}

/**
 * ControlledBanner component props
 */
export interface ControlledBannerProps extends VoiceSessionState {
  /** Custom className */
  className?: string;
  
  /** Z-index for positioning */
  zIndex?: number;
  
  /** Whether to add body padding (to prevent content from being hidden behind banner) */
  addBodyPadding?: boolean;
  
  /** Mesh gradient colors (optional override - auto-selected based on state if not provided) */
  gradientColors?: string[];
  
  /** Gradient distortion (default: 0.8) */
  distortion?: number;
  
  /** Gradient swirl effect (default: 0.1) */
  swirl?: number;
  
  /** Animation speed (default: 1) */
  speed?: number;
  
  /** Banner height (default: "48px") */
  height?: string;
}

/**
 * ControlledBanner Component
 * 
 * Displays a banner at the top of the page to indicate it's controlled by Vowel.
 * Uses Paper Design mesh gradient for the background.
 * 
 * @example
 * ```tsx
 * <ControlledBanner />
 * ```
 */
export function ControlledBanner({
  isConnected = false,
  isConnecting = false,
  isUserSpeaking = false,
  isAiSpeaking = false,
  isAiThinking = false,
  isToolExecuting = false,
  isResuming = false,
  className = '',
  zIndex = 999999,
  addBodyPadding = true,
  gradientColors,
  distortion = 0.8,
  swirl = 0.1,
  speed = 1,
  height = '48px',
}: ControlledBannerProps) {
  // Determine banner state (same priority as button)
  const getBannerState = () => {
    if (isResuming) return 'resuming';
    if (isConnecting) return 'connecting';
    if (isAiSpeaking) return 'ai-speaking';
    if (isToolExecuting) return 'tool-executing';
    if (isAiThinking) return 'ai-thinking';
    if (isUserSpeaking) return 'user-speaking';
    if (isConnected) return 'connected';
    return 'disconnected';
  };

  const bannerState = getBannerState();

  // Get gradient colors based on state (slightly different from button colors)
  const getStateColors = (): string[] => {
    // If colors explicitly provided, use those
    if (gradientColors) return gradientColors;
    
    switch (bannerState) {
      case 'resuming':
        return ['#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6']; // teal-cyan-blue-violet
      case 'connecting':
        return ['#f59e0b', '#eab308', '#fbbf24', '#fcd34d']; // amber-yellow spectrum
      case 'user-speaking':
        return ['#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd']; // sky-blue lighter
      case 'ai-thinking':
        return ['#f97316', '#fb923c', '#fdba74', '#fed7aa']; // orange-amber warm
      case 'ai-speaking':
        return ['#8b5cf6', '#a78bfa', '#c084fc', '#d8b4fe']; // violet-purple softer
      case 'connected':
        return ['#10b981', '#14b8a6', '#06b6d4', '#22d3ee']; // emerald-teal-cyan
      default:
        return ['#64748b', '#6366f1', '#8b5cf6', '#a78bfa']; // slate-indigo
    }
  };

  const activeColors = getStateColors();
  // Track window dimensions for MeshGradient
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: 48, // Banner height in pixels
  });
  
  // Update dimensions on window resize
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: 48,
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <>
      {/* Add custom styles for body padding */}
      {addBodyPadding && (
        <style>
          {`body { padding-top: ${height} !important; }`}
        </style>
      )}
      
      <div
        className={className}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height,
          zIndex,
          overflow: 'hidden',
        }}
      >
        {/* Mesh Gradient Background */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
          }}
        >
          <MeshGradient
            // @ts-ignore - MeshGradient is not typed correctly
            width={dimensions.width}
            height={dimensions.height}
            colors={activeColors}
            distortion={distortion}
            swirl={swirl}
            grainMixer={0}
            grainOverlay={0}
            speed={speed}
          />
        </div>
        
        {/* Banner Text */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255, 255, 255, 0.95)',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '0.875rem',
            letterSpacing: '0.02em',
          }}
        >
          <span style={{ fontWeight: 400 }}>controlled by </span>
          <span style={{ fontWeight: 700, marginLeft: '0.3em' }}>vowel</span>
        </div>
      </div>
    </>
  );
}

