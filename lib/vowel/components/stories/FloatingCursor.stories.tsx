/**
 * FloatingCursor Storybook Stories
 * 
 * Stories for the floating cursor component that shows AI actions
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { FloatingCursorComponent } from '../FloatingCursorComponent';
import { FloatingCursorProvider } from '../FloatingCursorProvider';
import { useState } from 'react';

const meta: Meta<typeof FloatingCursorComponent> = {
  title: 'Vowel/FloatingCursor',
  component: FloatingCursorComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A floating cursor component that visualizes AI actions and movements on the page.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    x: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    y: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
    text: {
      control: 'text',
    },
    isIdle: {
      control: 'boolean',
    },
    visible: {
      control: 'boolean',
    },
    cursorColor: {
      control: 'color',
    },
    cursorSize: {
      control: { type: 'range', min: 16, max: 48, step: 2 },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ 
        minHeight: '600px', 
        minWidth: '800px', 
        position: 'relative',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>Page Content</h2>
          <p style={{ color: '#666' }}>The floating cursor appears over this content to show AI actions.</p>
        </div>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FloatingCursorComponent>;

/**
 * Default cursor position
 */
export const Default: Story = {
  args: {
    x: 50,
    y: 50,
    text: 'Clicking button',
    isIdle: false,
    visible: true,
    cursorColor: '#000000',
    cursorSize: 24,
  },
};

/**
 * Idle/resting position
 */
export const Idle: Story = {
  args: {
    x: 50,
    y: 91,
    text: 'Ready',
    isIdle: true,
    visible: true,
    cursorColor: '#000000',
    cursorSize: 24,
  },
};

/**
 * Moving to click a button
 */
export const ClickingButton: Story = {
  args: {
    x: 30,
    y: 40,
    text: 'Clicking button',
    isIdle: false,
    visible: true,
    cursorColor: '#2563eb',
    cursorSize: 24,
  },
};

/**
 * Typing in an input
 */
export const Typing: Story = {
  args: {
    x: 45,
    y: 35,
    text: 'Typing...',
    isIdle: false,
    visible: true,
    cursorColor: '#16a34a',
    cursorSize: 24,
  },
};

/**
 * Hovering over element
 */
export const Hovering: Story = {
  args: {
    x: 60,
    y: 55,
    text: 'Hovering',
    isIdle: false,
    visible: true,
    cursorColor: '#dc2626',
    cursorSize: 24,
  },
};

/**
 * Custom colors
 */
export const CustomColors: Story = {
  args: {
    x: 50,
    y: 50,
    text: 'Custom Style',
    isIdle: false,
    visible: true,
    cursorColor: '#a855f7',
    cursorSize: 32,
    badgeBackground: '#9333ea',
    badgeTextColor: '#ffffff',
  },
};

/**
 * Large cursor
 */
export const LargeCursor: Story = {
  args: {
    x: 50,
    y: 50,
    text: 'Large Cursor',
    isIdle: false,
    visible: true,
    cursorColor: '#000000',
    cursorSize: 40,
  },
};

/**
 * Small cursor
 */
export const SmallCursor: Story = {
  args: {
    x: 50,
    y: 50,
    text: 'Small Cursor',
    isIdle: false,
    visible: true,
    cursorColor: '#000000',
    cursorSize: 16,
  },
};

/**
 * Interactive demo with FloatingCursorProvider
 */
export const WithProvider: Story = {
  render: () => {
    const [x, setX] = useState(50);
    const [y, setY] = useState(50);
    const [text, setText] = useState('Moving cursor');
    const [isIdle, setIsIdle] = useState(false);

    return (
      <FloatingCursorProvider config={{ enabled: true }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
          <div style={{ 
            background: 'white', 
            borderRadius: '8px', 
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <h3 style={{ margin: 0 }}>Interactive Controls</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => { setX(30); setY(40); setText('Clicking button'); setIsIdle(false); }}
                style={{ padding: '8px 16px', cursor: 'pointer' }}
              >
                Move to Button
              </button>
              <button 
                onClick={() => { setX(45); setY(35); setText('Typing...'); setIsIdle(false); }}
                style={{ padding: '8px 16px', cursor: 'pointer' }}
              >
                Move to Input
              </button>
              <button 
                onClick={() => { setX(50); setY(91); setText('Ready'); setIsIdle(true); }}
                style={{ padding: '8px 16px', cursor: 'pointer' }}
              >
                Idle Position
              </button>
            </div>
          </div>
          <FloatingCursorComponent
            x={x}
            y={y}
            text={text}
            isIdle={isIdle}
            visible={true}
          />
        </div>
      </FloatingCursorProvider>
    );
  },
};

