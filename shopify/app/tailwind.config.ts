import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS configuration for Shopify Vowel Voice Widget
 * Scans all relevant source files to include necessary utilities
 */
export default {
  content: [
    // Scan all source files in the main library
    '../../src/**/*.{ts,tsx,js,jsx}',
    // Specifically include component files
    '../../src/lib/vowel/components/**/*.{ts,tsx}',
    // Include local extension files if any
    './extensions/**/*.{liquid,html}',
  ],
  theme: {
    extend: {
      // Extend theme if needed
      animation: {
        'gradient': 'gradient 3s ease infinite',
        'breathe': 'breathe 2s ease-in-out infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.4' },
          '50%': { transform: 'scale(1.05)', opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

