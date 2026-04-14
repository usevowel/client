/**
 * FloatingAgentPill Storybook Stories
 *
 * Comprehensive stories showing all states of the floating agent pill
 * with the new speaking face icon and 3-mode mute button.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { FloatingAgentPill, type MuteMode } from '../FloatingAgentPill';
import { useState } from 'react';

const meta: Meta<typeof FloatingAgentPill> = {
  title: 'Vowel/FloatingAgentPill',
  component: FloatingAgentPill,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A floating pill-shaped voice agent interface with speaking face icon, 3-mode mute button, and settings.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['bottom-right', 'bottom-left', 'top-right', 'top-left'],
    },
    inline: {
      control: 'boolean',
    },
    muteMode: {
      control: 'select',
      options: ['active', 'ai-muted', 'user-muted'],
      description: 'Current mute mode (cycles on click)',
    },
  },
  render: (args) => {
    // Interactive wrapper to handle mute mode cycling
    const [muteMode, setMuteMode] = useState<MuteMode>(args.muteMode || 'active');

    const handleMuteCycle = () => {
      const nextMode: Record<MuteMode, MuteMode> = {
        'active': 'ai-muted',
        'ai-muted': 'user-muted',
        'user-muted': 'active',
      };
      setMuteMode(nextMode[muteMode]);
    };

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
          <FloatingAgentPill
            {...args}
            muteMode={muteMode}
            onMuteClick={handleMuteCycle}
          />
        </div>
      </>
    );
  },
};

export default meta;
type Story = StoryObj<typeof FloatingAgentPill>;

/**
 * Disconnected state - agent is inactive
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
    isPaused: false,
    hasError: false,
    muteMode: 'active',
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
    isPaused: false,
    hasError: false,
    muteMode: 'active',
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
    isPaused: false,
    hasError: false,
    muteMode: 'active',
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
    isPaused: false,
    hasError: false,
    muteMode: 'active',
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
    isPaused: false,
    hasError: false,
    muteMode: 'active',
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
    isPaused: false,
    hasError: false,
    muteMode: 'active',
    inline: true,
  },
};

/**
 * Tool executing - AI is performing an action
 */
export const ToolExecuting: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isToolExecuting: true,
    isResuming: false,
    isPaused: false,
    hasError: false,
    muteMode: 'active',
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
    isPaused: false,
    hasError: false,
    muteMode: 'active',
    inline: true,
  },
};

/**
 * Paused state - session is paused
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
    hasError: false,
    muteMode: 'active',
    inline: true,
  },
};

/**
 * Error state - something went wrong
 */
export const Error: Story = {
  args: {
    isConnected: false,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    isPaused: false,
    hasError: true,
    muteMode: 'active',
    inline: true,
  },
};

/**
 * Mute Mode: AI Audio Muted - captions visible but no sound
 */
export const AIMuted: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: true,
    isAiThinking: false,
    isResuming: false,
    isPaused: false,
    hasError: false,
    muteMode: 'ai-muted',
    inline: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'AI is speaking but audio output is muted. Captions remain visible. Click the mute button to cycle modes.',
      },
    },
  },
};

/**
 * Mute Mode: User Microphone Muted - AI can hear/be heard
 */
export const UserMuted: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    isPaused: false,
    hasError: false,
    muteMode: 'user-muted',
    inline: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'User microphone is muted. AI can still speak and be heard. Click the mute button to cycle modes.',
      },
    },
  },
};

/**
 * Hibernated state - session is sleeping
 */
export const Hibernated: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    isPaused: false,
    isHibernated: true,
    hasError: false,
    muteMode: 'active',
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
    isPaused: false,
    hasError: false,
    muteMode: 'active',
    position: 'bottom-right',
    inline: false,
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story: 'Shows the pill positioned in the bottom-right corner as it appears in a real application.',
      },
    },
  },
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
    isPaused: false,
    hasError: false,
    muteMode: 'active',
    position: 'bottom-left',
    inline: false,
  },
  parameters: {
    layout: 'fullscreen',
  },
};

/**
 * Interactive - cycle through mute modes
 * This story demonstrates the mute button cycling through all three modes
 */
export const InteractiveMuteModes: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: true,
    isAiThinking: false,
    isResuming: false,
    isPaused: false,
    hasError: false,
    muteMode: 'active',
    inline: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing mute mode cycling. Click the mute button (volume icon) to cycle: Active → AI Muted → User Muted → Active.',
      },
    },
  },
};

/**
 * All States Gallery
 * Shows all visual states side by side
 */
export const AllStatesGallery: Story = {
  args: {
    isConnected: true,
    isConnecting: false,
    isDisconnecting: false,
    isUserSpeaking: false,
    isAiSpeaking: false,
    isAiThinking: false,
    isResuming: false,
    isPaused: false,
    hasError: false,
    muteMode: 'active',
    inline: true,
  },
  render: () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px',
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 600 }}>FloatingAgentPill States</h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FloatingAgentPill {...Disconnected.args} inline />
        <span>Disconnected</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FloatingAgentPill {...Connecting.args} inline />
        <span>Connecting</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FloatingAgentPill {...ConnectedIdle.args} inline />
        <span>Connected/Idle</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FloatingAgentPill {...UserSpeaking.args} inline />
        <span>User Speaking</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FloatingAgentPill {...AIThinking.args} inline />
        <span>AI Thinking</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FloatingAgentPill {...AISpeaking.args} inline />
        <span>AI Speaking</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FloatingAgentPill {...ToolExecuting.args} inline />
        <span>Tool Executing</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FloatingAgentPill {...Error.args} inline />
        <span>Error</span>
      </div>

      <h3 style={{ margin: '20px 0 10px 0', fontSize: '16px', fontWeight: 600 }}>Mute Modes (while AI speaking)</h3>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FloatingAgentPill {...AISpeaking.args} inline muteMode="active" />
        <span>Active (both on)</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FloatingAgentPill {...AISpeaking.args} inline muteMode="ai-muted" />
        <span>AI Audio Muted</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FloatingAgentPill {...AISpeaking.args} inline muteMode="user-muted" />
        <span>User Mic Muted</span>
      </div>
    </div>
  ),
};
