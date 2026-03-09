/**
 * VowelMicrophone Demo Component
 * 
 * A demo component that simulates different states for Storybook
 */

import { VowelMicrophone } from '../VowelMicrophone';
import { VowelProvider } from '../VowelProviderSimple';
import { Vowel } from '../../core';

interface VowelMicrophoneDemoProps {
  /** Simulated state */
  simulatedState?: {
    isConnected?: boolean;
    isConnecting?: boolean;
    isUserSpeaking?: boolean;
    isAIThinking?: boolean;
    isAISpeaking?: boolean;
    isResuming?: boolean;
    status?: string;
  };
  size?: 'small' | 'default' | 'large';
  showStatus?: boolean;
}

/**
 * Demo component that wraps VowelMicrophone with simulated state
 * 
 * Note: In a real app, state comes from VowelProvider context.
 * This demo shows what the component looks like in different states.
 */
export function VowelMicrophoneDemo({
  simulatedState = {},
  size = 'default',
  showStatus = false,
}: VowelMicrophoneDemoProps) {
  const mockClient = new Vowel({
    appId: 'storybook-demo',
  });

  // In a real implementation, you would need to mock the VowelProvider's state
  // For now, this shows the component structure
  return (
    <VowelProvider client={mockClient}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '1rem',
        padding: '1rem'
      }}>
        <VowelMicrophone size={size} showStatus={showStatus} />
        {simulatedState.status && (
          <div style={{ 
            color: '#94a3b8', 
            fontSize: '12px',
            textAlign: 'center'
          }}>
            {simulatedState.status}
          </div>
        )}
      </div>
    </VowelProvider>
  );
}

