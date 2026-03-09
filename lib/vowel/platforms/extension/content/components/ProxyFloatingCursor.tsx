/**
 * Proxy Floating Cursor
 * 
 * Lightweight cursor component for content scripts that displays transcript
 * from the extension background script.
 * 
 * @packageDocumentation
 */

import React, { useState, useEffect } from 'react';
import type { ExtensionContentBridge, TranscriptUpdate } from '../ExtensionContentBridge';

/**
 * Props for ProxyFloatingCursor component
 */
export interface ProxyFloatingCursorProps {
  /** Bridge instance for extension communication */
  bridge: ExtensionContentBridge;
  /** Custom class name */
  className?: string;
}

/**
 * Proxy floating cursor for content script
 * 
 * Displays transcript and cursor effects based on extension state.
 * Follows mouse cursor and shows real-time transcripts.
 * 
 * @example
 * ```tsx
 * <ProxyFloatingCursor bridge={bridge} />
 * ```
 */
export const ProxyFloatingCursor: React.FC<ProxyFloatingCursorProps> = ({
  bridge,
  className,
}) => {
  const [transcript, setTranscript] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [transcriptType, setTranscriptType] = useState<'user' | 'agent'>('user');

  useEffect(() => {
    // Listen to transcript updates
    const unsubscribeTranscript = bridge.onTranscriptUpdate((update: TranscriptUpdate) => {
      setTranscript(update.text);
      setTranscriptType(update.type);
      setIsVisible(true);

      if (update.isFinal) {
        // Hide after delay for final transcripts
        setTimeout(() => {
          setIsVisible(false);
          setTranscript('');
        }, 3000);
      }
    });

    // Listen to state updates for visibility
    const unsubscribeState = bridge.onStateUpdate((state) => {
      if (!state.isListening && !state.isSpeaking) {
        setIsVisible(false);
        setTranscript('');
      }
    });

    // Track mouse position
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      unsubscribeTranscript();
      unsubscribeState();
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [bridge]);

  if (!isVisible || !transcript) {
    return null;
  }

  const bubbleColor = transcriptType === 'user' 
    ? 'rgba(102, 126, 234, 0.95)'  // Blue for user
    : 'rgba(118, 75, 162, 0.95)';  // Purple for agent

  return (
    <div
      className={`vowel-proxy-cursor ${className || ''}`}
      style={{
        position: 'fixed',
        left: cursorPosition.x + 20,
        top: cursorPosition.y + 20,
        zIndex: 999998,
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        className="vowel-proxy-cursor__bubble"
        style={{
          padding: '12px 16px',
          background: bubbleColor,
          color: 'white',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: '300px',
          wordWrap: 'break-word',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          position: 'relative',
        }}
      >
        {/* Transcript type indicator */}
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            left: '12px',
            padding: '2px 8px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}
        >
          {transcriptType === 'user' ? '🎤 You' : '🤖 Agent'}
        </div>

        {/* Transcript text */}
        <div style={{ marginTop: '4px' }}>
          {transcript}
        </div>
      </div>
    </div>
  );
};

