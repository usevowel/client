/**
 * Tailwind CSS v4 configuration for @vowel.to/client.
 *
 * Source scanning is primarily defined in `lib/vowel/styles/styles.css` via `@source`.
 * `content` remains as compatibility fallback for mixed tooling.
 * We omit preflight by not importing `tailwindcss/preflight.css` in the CSS entry.
 */
export default {
  content: [
    './lib/**/*.{ts,tsx}',
    './platforms/**/*.{ts,tsx}',
    './standalone.ts',
    './react.ts',
    './web-component.ts',
  ],

  theme: {
    extend: {
      // Only define custom animations we actually use
      keyframes: {
        'vowel-gradient': {
          '0%, 100%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
        },
        'vowel-breathe': {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '0.4',
          },
          '50%': {
            transform: 'scale(1.05)',
            opacity: '0.6',
          },
        },
      },
      animation: {
        'vowel-gradient': 'vowel-gradient 3s ease infinite',
        'vowel-breathe': 'vowel-breathe 2s ease-in-out infinite',
      },
    },
  },

  plugins: [],
};
