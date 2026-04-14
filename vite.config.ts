import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react-swc';
import preact from '@preact/preset-vite';
import { defineConfig, type Plugin } from 'vite';
import dts from 'unplugin-dts/vite';

import { peerDependencies } from './package.json';

type CssAwareChunk = {
  viteMetadata?: {
    importedCss?: Set<string>;
  };
};

function embedVowelCssInJs(): Plugin {
  const styleId = 'vowel-client-styles';

  return {
    name: 'vowel-embed-css-in-js',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const cssAssets = new Map<string, string>();

      for (const [fileName, asset] of Object.entries(bundle)) {
        if (asset.type === 'asset' && fileName.endsWith('.css')) {
          cssAssets.set(fileName, typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source));
        }
      }

      if (cssAssets.size === 0) {
        return;
      }

      const chunksWithCss = Object.values(bundle).filter((chunk) => {
        if (chunk.type !== 'chunk') {
          return false;
        }

        const importedCss = (chunk as CssAwareChunk).viteMetadata?.importedCss;
        return importedCss ? importedCss.size > 0 : false;
      });

      const targetChunks = chunksWithCss.length > 0
        ? chunksWithCss
        : Object.values(bundle).filter((chunk) => chunk.type === 'chunk' && chunk.isEntry);

      for (const chunk of targetChunks) {
        if (chunk.type !== 'chunk') {
          continue;
        }

        const importedCss = (chunk as CssAwareChunk).viteMetadata?.importedCss;
        const cssFiles = importedCss && importedCss.size > 0 ? [...importedCss] : [...cssAssets.keys()];
        const css = cssFiles.map((fileName) => cssAssets.get(fileName)).filter(Boolean).join('\n');

        if (!css) {
          continue;
        }

        const injectionCode = [
          '(function(){',
          'if(typeof document==="undefined")return;',
          `var css=${JSON.stringify(css)};`,
          `var style=document.getElementById(${JSON.stringify(styleId)});`,
          'if(!style){',
          'style=document.createElement("style");',
          `style.id=${JSON.stringify(styleId)};`,
          'style.setAttribute("data-vowel-client-styles","");',
          'style.appendChild(document.createTextNode(css));',
          'document.head.appendChild(style);',
          'return;',
          '}',
          'if(style.textContent.indexOf(css)===-1){',
          'style.appendChild(document.createTextNode("\\n"+css));',
          '}',
          '})();',
          '',
        ].join('');

        const useStrictDirective = "'use strict';\n";
        chunk.code = chunk.code.startsWith(useStrictDirective)
          ? useStrictDirective + injectionCode + chunk.code.slice(useStrictDirective.length)
          : injectionCode + chunk.code;
      }
    },
  };
}

function emitAudioWorkletForExtensions(): Plugin {
  return {
    name: 'vowel-emit-audio-worklet',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'audio-processor.worklet.js',
        source: readFileSync(
          resolve(__dirname, 'lib/vowel/managers/audio-processor.worklet.js'),
          'utf8'
        ),
      });
    },
  };
}

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
      emitAudioWorkletForExtensions(),
      // Embed CSS into JS for library builds while still emitting the CSS export.
      // For standalone builds, CSS is bundled directly into the IIFE
      ...(!isStandalone ? [embedVowelCssInJs()] : []),
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
        entry: {
          // Main client library (framework-agnostic)
          index: resolve(__dirname, join('.', 'index.ts')),
          // React-specific exports
          react: resolve(__dirname, join('.', 'react.ts')),
          // Web component exports
          components: resolve(__dirname, join('.', 'components.ts')),
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
        // - All non-peer dependencies except dependencies explicitly externalized below
        //
        // What does NOT get bundled (externalized):
        // - React, react-dom (peer dependencies)
        // - @r2wc/react-to-web-component (web component adapter dependency)
        //
        // Package.json exports:
        // - Library exports point to dist/client/*
        // - Web components are available from @vowel.to/client/components
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
          
          // Externalize @r2wc/react-to-web-component so consumers do not get a bundled React copy.
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
