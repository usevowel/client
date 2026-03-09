/**
 * PostCSS Configuration for @vowel.to/client
 * 
 * Purpose: Process Tailwind CSS v4 and optimize output
 * 
 * Pipeline:
 * 1. @tailwindcss/postcss - Tailwind CSS v4 PostCSS plugin
 * 2. cssnano - Minify and clean up unused/empty rules
 * 3. Autoprefixer - Add vendor prefixes for browser compatibility
 */

module.exports = {
  plugins: [
    // Tailwind CSS v4 - generates utilities
    require('@tailwindcss/postcss'),
    // Unwrap @layer rules so consuming Tailwind v3 apps can ingest library CSS safely
    require('./postcss-strip-layers.cjs'),
    
    // Minify and remove empty rules
    // TEMPORARILY DISABLED: cssnano causing build errors with css-tree
    // require('cssnano')({
    //   preset: ['default', {
    //     discardUnused: {
    //       keyframes: false,
    //       fontFace: false,
    //     },
    //     discardComments: {
    //       removeAll: false,
    //     },
    //     mergeRules: true,
    //     discardEmpty: true,
    //     normalizeWhitespace: true,
    //   }],
    // }),
    
    // Add vendor prefixes last
    require('autoprefixer'),
  ],
};
