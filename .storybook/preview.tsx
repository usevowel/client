import type { Preview } from '@storybook/react-vite';
import React from 'react';
import { themes } from '@storybook/theming';
import '../lib/vowel/styles/styles.css';

const preview: Preview = {
  parameters: {
    darkMode: {
      // Override the default dark theme
      dark: { ...themes.dark },
      // Override the default light theme
      light: { ...themes.light },
      // Set the initial theme
      current: 'dark',
      // Provide your own CSS class name
      darkClass: 'dark',
      lightClass: 'light',
      // Apply the class to the preview iframe's body
      classTarget: 'html',
      // Override the default Storybook UI theme
      stylePreview: true,
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#0f172a',
        },
        {
          name: 'light',
          value: '#ffffff',
        },
      ],
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
};

export default preview;

