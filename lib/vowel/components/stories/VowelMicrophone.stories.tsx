/**
 * VowelMicrophone Storybook Stories
 * 
 * Comprehensive stories showing all states of the embedded microphone button
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { VowelMicrophone } from '../VowelMicrophone';
import { VowelProvider } from '../VowelProviderSimple';
import { Vowel } from '../../core';

// Create a mock client for Storybook
const createMockClient = () => {
  return new Vowel({
    appId: 'storybook-demo',
  });
};

const meta: Meta<typeof VowelMicrophone> = {
  title: 'Vowel/VowelMicrophone',
  component: VowelMicrophone,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An embedded microphone button component for voice interaction. Can be placed anywhere in your app.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'default', 'large'],
    },
    showStatus: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => {
      const mockClient = createMockClient();
      return (
        <VowelProvider client={mockClient}>
          <div style={{ 
            padding: '2rem', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            minWidth: '300px',
          }}>
            <Story />
          </div>
        </VowelProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof VowelMicrophone>;

/**
 * Default size - disconnected state
 */
export const Default: Story = {
  args: {
    size: 'default',
    showStatus: false,
  },
};

/**
 * Small size
 */
export const Small: Story = {
  args: {
    size: 'small',
    showStatus: false,
  },
};

/**
 * Large size
 */
export const Large: Story = {
  args: {
    size: 'large',
    showStatus: false,
  },
};

/**
 * With status text displayed
 */
export const WithStatus: Story = {
  args: {
    size: 'default',
    showStatus: true,
  },
};

/**
 * Mock state stories - These show different visual states
 * Note: In a real app, these states come from the VowelProvider context
 */

/**
 * Disconnected state (gray)
 */
export const StateDisconnected: Story = {
  name: 'State: Disconnected',
  render: () => {
    const mockClient = createMockClient();
    // Mock the state to be disconnected
    return (
      <VowelProvider client={mockClient}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>Disconnected State</div>
          <VowelMicrophone size="default" showStatus={true} />
          <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', maxWidth: '200px' }}>
            Gray background, MicOff icon. Click to start voice session.
          </div>
        </div>
      </VowelProvider>
    );
  },
};

/**
 * Connecting state (spinner)
 */
export const StateConnecting: Story = {
  name: 'State: Connecting',
  render: () => {
    const mockClient = createMockClient();
    return (
      <VowelProvider client={mockClient}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>Connecting State</div>
          <VowelMicrophone size="default" showStatus={true} />
          <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', maxWidth: '200px' }}>
            Shows spinner animation while connecting. Button is disabled.
          </div>
        </div>
      </VowelProvider>
    );
  },
};

/**
 * Connected/Idle state (green)
 */
export const StateConnectedIdle: Story = {
  name: 'State: Connected (Idle)',
  render: () => {
    const mockClient = createMockClient();
    return (
      <VowelProvider client={mockClient}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>Connected & Idle State</div>
          <VowelMicrophone size="default" showStatus={true} />
          <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', maxWidth: '200px' }}>
            Green background, Mic icon. Ready to listen. Green ring around button.
          </div>
        </div>
      </VowelProvider>
    );
  },
};

/**
 * User speaking state (blue)
 */
export const StateUserSpeaking: Story = {
  name: 'State: User Speaking',
  render: () => {
    const mockClient = createMockClient();
    return (
      <VowelProvider client={mockClient}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>User Speaking State</div>
          <VowelMicrophone size="default" showStatus={true} />
          <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', maxWidth: '200px' }}>
            Blue background, Mic icon. Pulse animation. Blue ring. Status: "🎤 Listening"
          </div>
        </div>
      </VowelProvider>
    );
  },
};

/**
 * AI thinking state (yellow)
 */
export const StateAIThinking: Story = {
  name: 'State: AI Thinking',
  render: () => {
    const mockClient = createMockClient();
    return (
      <VowelProvider client={mockClient}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>AI Thinking State</div>
          <VowelMicrophone size="default" showStatus={true} />
          <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', maxWidth: '200px' }}>
            Yellow background, Mic icon. Yellow ring. Status: "🧠 AI Thinking"
          </div>
        </div>
      </VowelProvider>
    );
  },
};

/**
 * AI speaking state (purple)
 */
export const StateAISpeaking: Story = {
  name: 'State: AI Speaking',
  render: () => {
    const mockClient = createMockClient();
    return (
      <VowelProvider client={mockClient}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: '#94a3b8', fontSize: '14px' }}>AI Speaking State</div>
          <VowelMicrophone size="default" showStatus={true} />
          <div style={{ color: '#64748b', fontSize: '12px', textAlign: 'center', maxWidth: '200px' }}>
            Purple background, Mic icon. Pulse animation. Purple ring. Status: "🔊 AI Speaking"
          </div>
        </div>
      </VowelProvider>
    );
  },
};

/**
 * All sizes comparison
 */
export const AllSizes: Story = {
  name: 'All Sizes Comparison',
  render: () => {
    const mockClient = createMockClient();
    return (
      <VowelProvider client={mockClient}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '2rem',
          padding: '2rem'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '16px', fontWeight: 'bold' }}>Size Comparison</div>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <VowelMicrophone size="small" />
              <div style={{ color: '#64748b', fontSize: '12px' }}>Small</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <VowelMicrophone size="default" />
              <div style={{ color: '#64748b', fontSize: '12px' }}>Default</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <VowelMicrophone size="large" />
              <div style={{ color: '#64748b', fontSize: '12px' }}>Large</div>
            </div>
          </div>
        </div>
      </VowelProvider>
    );
  },
};
