/**
 * FloatingMicButton Storybook Stories
 * 
 * Comprehensive stories showing all states of the floating microphone button
 */

import type { Meta, StoryObj } from '@storybook/react';
import { FloatingMicButton } from '../FloatingMicButton';

const meta: Meta<typeof FloatingMicButton> = {
  title: 'Vowel/FloatingMicButton',
  component: FloatingMicButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A floating microphone button that displays voice session state with animations and visual feedback.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['bottom-right', 'bottom-left', 'top-right', 'top-left', 'inline'],
    },
    inline: {
      control: 'boolean',
    },
  } as any,
  render: (args: any) => {
    return (
      <>
        <style>{`
          [data-vowel-floating-cursor],
          .vowel-floating-cursor,
          #vowel-floating-cursor {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }
        `}</style>
        <div style={{
          minHeight: '400px',
          minWidth: '400px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <FloatingMicButton {...args} />
        </div>
      </>
    );
  },
};

export default meta;
type Story = StoryObj<typeof FloatingMicButton>;

/**
 * Disconnected state - microphone is off
 */
export const Disconnected: Story = {
  args: {
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    inline: true,
  },
};

/**
 * Connecting state - establishing connection
 */
export const Connecting: Story = {
  args: {
    isConnected: false,
    isConnecting: true,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    inline: true,
  },
};

/**
 * Disconnecting state - closing connection
 */
export const Disconnecting: Story = {
  args: {
    isConnected: false,
    isConnecting: false,
    isDisconnecting: true,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    inline: true,
  },
};

/**
 * Connected/Idle state - ready to listen
 */
export const ConnectedIdle: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    inline: true,
  },
};

/**
 * User speaking - microphone is actively listening
 */
export const UserSpeaking: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: true,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    inline: true,
  },
};

/**
 * AI thinking - processing user input
 */
export const AIThinking: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: true,
    isResuming: false,
    inline: true,
  },
};

/**
 * AI speaking - AI is responding
 */
export const AISpeaking: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: true,
    isAiThinking: false,
    isResuming: false,
    inline: true,
  },
};

/**
 * Resuming state - reconnecting after pause
 */
export const Resuming: Story = {
  args: {
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: true,
    inline: true,
  },
};

/**
 * Paused state - session is paused (microphone muted, connection maintained)
 */
export const Paused: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    isPaused: true,
    inline: true,
  },
};

/**
 * With action icon - shows what will happen on click
 */
export const WithActionIcon: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    inline: true,
  },
};

/**
 * Positioned in bottom-right corner (real app positioning)
 */
export const PositionedBottomRight: Story = {
  name: 'Positioned: Bottom Right',
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    position: 'bottom-right',
    inline: false,
  },
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story: React.FC) => {
      // Disable floating cursor globally for these stories
      if (typeof window !== 'undefined') {
        (window as any).__vowelFloatingCursorContext = null;
        if ((window as any).__vowelFloatingCursorManager) {
          try {
            (window as any).__vowelFloatingCursorManager.destroy?.();
          } catch (e) {
            // Ignore errors
          }
          (window as any).__vowelFloatingCursorManager = null;
        }
      }

      return (
        <>
          <style>{`
            [data-vowel-floating-cursor],
            .vowel-floating-cursor,
            #vowel-floating-cursor {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
            }
          `}</style>
          <div style={{
            minHeight: '600px',
            minWidth: '800px',
            position: 'relative',
            padding: '20px'
          }}>
            <div style={{
              textAlign: 'center',
              color: '#94a3b8',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              Floating button positioned in bottom-right corner
            </div>
            <Story />
          </div>
        </>
      );
    },
  ],
};

/**
 * Positioned in bottom-left corner
 */
export const PositionedBottomLeft: Story = {
  name: 'Positioned: Bottom Left',
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    position: 'bottom-left',
    inline: false,
  },
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story: React.FC) => {
      // Disable floating cursor globally for these stories
      if (typeof window !== 'undefined') {
        (window as any).__vowelFloatingCursorContext = null;
        if ((window as any).__vowelFloatingCursorManager) {
          try {
            (window as any).__vowelFloatingCursorManager.destroy?.();
          } catch (e) {
            // Ignore errors
          }
          (window as any).__vowelFloatingCursorManager = null;
        }
      }

      return (
        <div style={{
          minHeight: '600px',
          minWidth: '800px',
          position: 'relative',
          padding: '20px'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#94a3b8',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            Floating button positioned in bottom-left corner
          </div>
          <Story />
        </div>
      );
    },
  ],
};

/**
 * Positioned in top-right corner
 */
export const PositionedTopRight: Story = {
  name: 'Positioned: Top Right',
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    position: 'top-right',
    inline: false,
  },
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story: React.FC) => {
      // Disable floating cursor globally for these stories
      if (typeof window !== 'undefined') {
        (window as any).__vowelFloatingCursorContext = null;
        if ((window as any).__vowelFloatingCursorManager) {
          try {
            (window as any).__vowelFloatingCursorManager.destroy?.();
          } catch (e) {
            // Ignore errors
          }
          (window as any).__vowelFloatingCursorManager = null;
        }
      }

      return (
        <div style={{
          minHeight: '600px',
          minWidth: '800px',
          position: 'relative',
          padding: '20px'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#94a3b8',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            Floating button positioned in top-right corner
          </div>
          <Story />
        </div>
      );
    },
  ],
};

/**
 * Positioned in top-left corner
 */
export const PositionedTopLeft: Story = {
  name: 'Positioned: Top Left',
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    position: 'top-left',
    inline: false,
  },
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story: React.FC) => {
      // Disable floating cursor globally for these stories
      if (typeof window !== 'undefined') {
        (window as any).__vowelFloatingCursorContext = null;
        if ((window as any).__vowelFloatingCursorManager) {
          try {
            (window as any).__vowelFloatingCursorManager.destroy?.();
          } catch (e) {
            // Ignore errors
          }
          (window as any).__vowelFloatingCursorManager = null;
        }
      }

      return (
        <div style={{
          minHeight: '600px',
          minWidth: '800px',
          position: 'relative',
          padding: '20px'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#94a3b8',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            Floating button positioned in top-left corner
          </div>
          <Story />
        </div>
      );
    },
  ],
};

