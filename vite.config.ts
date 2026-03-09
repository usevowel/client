import { join, resolve } from 'node:path';
import react from '@vitejs/plugin-react-swc';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import dts from 'unplugin-dts/vite';
import { libInjectCss } from 'vite-plugin-lib-inject-css';

import { peerDependencies } from './package.json';

//@ts-ignore - mode is not defined in the type ConfigEnv
export default defineConfig(({ mode }) => {
  const isStandalone = mode === 'standalone';
  const isBundled = isStandalone;

  // Use different output directory for standalone builds
  const outDir = isStandalone ? 'dist/standalone' : 'dist/client';

  return {
    optimizeDeps: {
      include: ['path-browserify'],
    },
    resolve: {
      alias: isBundled ? {
        // For standalone builds: alias React to Preact for smaller bundle size
        'react': 'preact/compat',
        'react-dom': 'preact/compat',
        'react/jsx-runtime': 'preact/jsx-runtime',
      } : {
        // For library builds: no aliases, use real React (peer dependency)
      },
    },
    // SSR configuration for Remix and other SSR frameworks
    ssr: {
      noExternal: !isStandalone ? ['path-browserify'] : undefined,
      external: [],
    },
    plugins: [
      // Use Preact for standalone builds (smaller bundle), React for library builds
      isBundled ? preact() : react(),
      // Tailwind CSS v4 is handled via PostCSS (see postcss.config.cjs)
      // Inject CSS into JS for library builds (also emits separate CSS file)
      // For standalone builds, CSS is bundled directly into the IIFE
      ...(!isStandalone ? [libInjectCss()] : []),
      // Only generate types for library builds, not standalone
      ...(!isStandalone ? [dts({
        tsconfigPath: './tsconfig.json',
        compilerOptions: {
          rootDir: '.',
        },
      })] : []), // Output .d.ts files
      // Note: R2 deployment moved to separate script (scripts/deploy-r2.ts)
      // Run with: bun run deploy:r2
    ],
    // Define globals for browser environment (standalone bundle)
    define: isStandalone ? {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'import.meta.env.MODE': JSON.stringify('production'),
      'global': 'globalThis',
      // Set build time during build
      'VOWEL_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    } : {
      'process.env.NODE_ENV': JSON.stringify('development'),
      // Set build time during build
      'VOWEL_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
    build: {
      outDir: outDir,
      target: 'esnext',
      minify: isStandalone ? 'terser' : false,
      lib: isStandalone ? {
        // ========================================================================
        // STANDALONE BUILD: Web Components + Client API (All Dependencies Bundled)
        // ========================================================================
        // 
        // This build includes:
        // 1. Web Component (<vowel-voice-widget>) via @r2wc/react-to-web-component
        // 2. JavaScript Client API (window.Vowel)
        // 3. All dependencies bundled (React → Preact, @r2wc/react-to-web-component, etc.)
        //
        // React is aliased to Preact for smaller bundle size (~580KB vs ~850KB)
        // This is a self-contained IIFE bundle for CDN usage
        // ========================================================================
        entry: resolve(__dirname, join('.', 'standalone.ts')),
        name: 'VowelClient',
        fileName: () => 'vowel-voice-widget.min.js',
        cssFileName: 'vowel-voice-widget',
        formats: ['iife'],
      } : {
        // Library build (peer dependencies external)
        // NOTE: Web components are NOT included in library builds - they are ONLY in standalone builds
        // This prevents @r2wc/react-to-web-component from bundling React into library builds
        entry: {
          // Main client library (framework-agnostic)
          index: resolve(__dirname, join('.', 'index.ts')),
          // React-specific exports
          react: resolve(__dirname, join('.', 'react.ts')),
          // Shopify platform adapter
          'platforms/shopify': resolve(__dirname, join('.', 'platforms', 'shopify.ts')),
          // Extension platform adapter
          'platforms/extension': resolve(__dirname, join('.', 'platforms', 'extension.ts')),
          // Generic platform adapter
          'platforms/generic': resolve(__dirname, join('.', 'lib/vowel/platforms/generic', 'index.ts')),
        },
        fileName: (format, entryName) => {
          const ext = format === 'es' ? 'mjs' : 'cjs';
          // Handle nested paths like 'platforms/shopify'
          return `${entryName}.${ext}`;
        },
        cssFileName: 'style',
        formats: ['es', 'cjs'],
      },
      rollupOptions: isStandalone ? {
        output: {
          inlineDynamicImports: true,
          banner: '(function() { if (typeof process === "undefined") { window.process = { env: { NODE_ENV: "production" } }; } })();',
        },
        // Externalize onnxruntime-web and @ricky0123/vad-web for standalone builds - load from CDN
        external: ['onnxruntime-web', '@ricky0123/vad-web'],
      } : {
        // ========================================================================
        // LIBRARY BUILD: React Externalization Strategy
        // ========================================================================
        // 
        // CRITICAL: React MUST be externalized for library builds to prevent
        // version conflicts in downstream packages.
        //
        // Why this matters:
        // 1. React is a peerDependency (package.json) - consumers provide their own version
        // 2. @r2wc/react-to-web-component (in dependencies) requires React as peer
        // 3. If React is bundled, downstream apps get "Invalid hook call" errors
        // 4. Multiple React instances cause state management issues
        //
        // What gets externalized:
        // - react, react-dom (peer dependencies)
        // - react/jsx-runtime, react/jsx-dev-runtime (JSX runtime)
        // - Any react/* or react-dom/* subpath imports
        //
        // What gets bundled:
        // - All non-peer dependencies EXCEPT web component dependencies
        //
        // What does NOT get bundled (externalized):
        // - React, react-dom (peer dependencies)
        // - @r2wc/react-to-web-component (web components are standalone-only)
        //
        // Package.json exports:
        // - Library exports point to dist/client/* (NO web components)
        // - Standalone export points to dist/standalone/* (includes web components)
        // ========================================================================
        external: (id, _parentId) => {
          // Always externalize React and React-related packages for library builds
          // This prevents React version conflicts when downstream packages bundle @vowel.to/client
          if (
            id === 'react' ||
            id === 'react-dom' ||
            id === 'react/jsx-runtime' ||
            id === 'react/jsx-dev-runtime' ||
            id.startsWith('react/') ||
            id.startsWith('react-dom/')
          ) {
            return true;
          }
          
          // Externalize @r2wc/react-to-web-component - web components are standalone-only
          // This ensures web component code (which bundles React) is never included in library builds
          if (id === '@r2wc/react-to-web-component') {
            return true;
          }
          
          // Externalize onnxruntime-web - it's 64MB and should be loaded from CDN at runtime
          // Only needed when SmartTurn VAD adapter is used (optional feature)
          if (id === 'onnxruntime-web') {
            return true;
          }
          
          // Externalize @ricky0123/vad-web - it's ~10MB and should be loaded from CDN at runtime
          // Only needed when Silero VAD adapter is used (optional feature)
          if (id === '@ricky0123/vad-web') {
            return true;
          }
          
          // Externalize all peer dependencies (react, react-dom are already handled above)
          // This ensures package.json peerDependencies are respected
          if (Object.keys(peerDependencies).includes(id)) {
            return true;
          }
          
          // Don't externalize other dependencies (they will be bundled)
          return false;
        },
        output: {
          // Name CSS files predictably for package.json exports
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'style.css';
            }
            return '[name].[ext]';
          },
        },
      },
      sourcemap: true,
    },
  };
});
