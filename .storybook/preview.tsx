import { definePreview } from '@storybook/react-vite';
import addonPerformancePanel from '@github-ui/storybook-addon-performance-panel';
import React from 'react';
import '../lib/vowel/styles/styles.css';

const preview = definePreview({
  addons: [addonPerformancePanel()],
  parameters: {
    backgrounds: {
      options: {
        dark: {
          name: 'dark',
          value: '#0f172a',
        },

        light: {
          name: 'light',
          value: '#ffffff',
        }
      }
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    actions: { argTypesRegex: '^on[A-Z].*' },
    docs: {
      toc: true,
    },
    options: {
      storySort: {
        order: ['Introduction', 'Vowel', '*'],
      },
    },
  },

  initialGlobals: {
    backgrounds: {
      value: 'dark'
    }
  }
});

export default preview;
