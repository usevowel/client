/**
 * Proxy Floating Button
 * 
 * Uses the real FloatingMicButton component and proxies interactions
 * to the extension's side panel.
 * 
 * @packageDocumentation
 */

import React, { useState, useEffect } from 'react';
import { FloatingMicButton } from '../../../../components/FloatingMicButton';
import type { ExtensionContentBridge, VowelState } from '../ExtensionContentBridge';

/**
 * Props for ProxyFloatingButton component
 */
export interface ProxyFloatingButtonProps {
  /** Bridge instance for extension communication */
  bridge: ExtensionContentBridge;
  /** Button position on screen */
  position?: { x: number; y: number };
  /** Optional configuration */
  config?: any;
  /** Custom class name */
  className?: string;
}

/**
 * Proxy floating button for content script
 * 
 * This uses the real FloatingMicButton component with state from the extension.
 * It forwards all interactions to the extension's side panel via the bridge.
 * 
 * @example
 * ```tsx
 * <ProxyFloatingButton 
 *   bridge={bridge}
 *   position={{ x: 20, y: 20 }}
 * />
 * ```
 */
export const ProxyFloatingButton: React.FC<ProxyFloatingButtonProps> = ({
  bridge,
  position = { x: 20, y: 20 },
  config,
  className,
}) => {
  const [state, setState] = useState<VowelState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check connection status
    setIsConnected(bridge.isExtensionConnected());

    // Load initial state
    if (bridge.isExtensionConnected()) {
      bridge.getState()
        .then(setState)
        .catch(err => {
          console.error('Failed to get initial state:', err);
          setError('Failed to connect');
        });
    }

    // Listen to state updates
    const unsubscribeState = bridge.onStateUpdate((newState) => {
      setState(newState);
      setError(null);
    });

    // Listen to errors
    const unsubscribeError = bridge.onError((err) => {
      console.error('Extension error:', err);
      setError(err.message);
    });

    return () => {
      unsubscribeState();
      unsubscribeError();
    };
  }, [bridge]);

  const handleClick = async () => {
    if (!isConnected) {
      alert('Vowel extension is not connected. Please check your extension.');
      return;
    }

    try {
      if (state?.isListening) {
        await bridge.stopSession();
      } else {
        await bridge.startSession(config);
      }
    } catch (error) {
      console.error('Failed to toggle session:', error);
      setError(error instanceof Error ? error.message : 'Failed to toggle session');
    }
  };

  // Map extension state to FloatingMicButton props
  const isSessionActive = state?.state === 'active';
  const isUserSpeaking = state?.isListening || false;
  const isAiSpeaking = state?.isSpeaking || false;

  // Determine button title
  const getTitle = () => {
    if (!isConnected) return 'Extension not connected';
    if (isAiSpeaking) return 'Agent is speaking';
    if (isUserSpeaking) return 'Stop voice session';
    return 'Start voice session';
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        bottom: position.y,
        zIndex: 999999,
      }}
    >
      <FloatingMicButton
        isConnected={isConnected && isSessionActive}
        isConnecting={false}
        isDisconnecting={false}
        isUserSpeaking={isUserSpeaking}
        isAiSpeaking={isAiSpeaking}
        isAiThinking={false}
        onClick={handleClick}
        title={getTitle()}
        inline={true}
        className={className}
      />

      {/* Error message */}
      {error && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: '#ff4444',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          {error}
        </div>
      )}

      {/* Connection warning */}
      {!isConnected && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            background: '#ff9800',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          }}
        >
          Extension not connected
        </div>
      )}
    </div>
  );
};
