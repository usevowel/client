import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { r2Deploy } from './vite-plugin-r2-deploy';
import { readdirSync, unlinkSync, existsSync } from 'node:fs';

/**
 * Clean old files from the assets directory
 * Removes all old hashed files and keeps only the current files
 */
function cleanOldHashedBundles(): void {
  const assetsDir = resolve(__dirname, 'extensions/vowel-voice-widget/assets');

  if (!existsSync(assetsDir)) {
    return;
  }

  try {
    const files = readdirSync(assetsDir);
    const keepFiles = new Set([
      'vowel-voice-widget.min.js',
      'vowel-voice-widget.min.js.map',
      'vowel-voice-widget.css'
    ]);

    const cleanedFiles: string[] = [];

    for (const file of files) {
      // Skip files we want to keep
      if (keepFiles.has(file)) {
        continue;
      }

      try {
        unlinkSync(resolve(assetsDir, file));
        cleanedFiles.push(file);
      } catch (error) {
        console.warn(`Failed to delete old file ${file}:`, error);
      }
    }

    if (cleanedFiles.length > 0) {
      console.log(`🗑️  Cleaned up ${cleanedFiles.length} old file(s):`, cleanedFiles);
    }
  } catch (error) {
    console.warn('Failed to clean old files:', error);
  }
}

/**
 * Vite configuration for Shopify Vowel Voice Widget
 *
 * This builds a standalone IIFE bundle from the web component source
 * and deploys it to Cloudflare R2 for CDN delivery.
 *
 * Uses simple filenames without content hashing.
 */
//@ts-ignore - mode is not defined in the type ConfigEnv
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'clean-old-bundles',
        buildStart() {
          console.log('🧹 Cleaning old hashed bundles before build...');
          cleanOldHashedBundles();
        }
      },
      // Deploy bundle to Cloudflare R2 after build
      r2Deploy({
        endpoint: env.R2_ENDPOINT || '',
        accessKeyId: env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
        publicBucketUrl: env.R2_PUBLIC_BUCKET_URL || '',
        bucketPath: 'apps/vowel',
        // Files to upload - now using simple filenames without hashes
        files: [
          {
            // Main JavaScript bundle
            source: 'extensions/vowel-voice-widget/assets/vowel-voice-widget.min.js',
            contentType: 'application/javascript'
          },
          {
            // Source map
            source: 'extensions/vowel-voice-widget/assets/vowel-voice-widget.min.js.map',
            contentType: 'application/json'
          },
          {
            // CSS bundle
            source: 'extensions/vowel-voice-widget/assets/vowel-voice-widget.css',
            contentType: 'text/css'
          }
        ],
        // Enable only when environment variables are set
        enabled: !!(env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY),
        // No need to clean old versions since we're not using hashes anymore
        cleanOldVersions: false
      })
    ],

    // Configure file watcher to ignore output directory and prevent infinite rebuild loops
    server: {
      watch: {
        ignored: [
          // Ignore the entire vowel widget assets directory and all its contents
          '**/extensions/vowel-voice-widget/assets/**',
          // Also ignore the parent directory to be extra safe
          '**/extensions/vowel-voice-widget/**',
          // Ignore common patterns that might cause rebuilds
          '**/node_modules/**',
          '**/.git/**',
          // Ignore any temporary or cache files
          '**/*.tmp',
          '**/*.temp',
          '**/dist/**',
          '**/build/**'
        ]
      }
    },
    
    // Define globals for browser environment
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'import.meta.env.MODE': JSON.stringify('production'),
      'global': 'globalThis',
      // Set build time during build
      'VOWEL_BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
    
    build: {
      target: 'esnext',
      minify: 'terser',
      
      // Build as standalone IIFE bundle
      lib: {
        // Entry point: web component from root src
        entry: resolve(__dirname, '../../src/web-component.ts'),
        name: 'VowelVoiceWidget',
        // Use simple filename without hash
        fileName: () => 'vowel-voice-widget.min.js',
        formats: ['iife'],
      },
      
      // Output to Shopify extension assets directory
      outDir: resolve(__dirname, 'extensions/vowel-voice-widget/assets'),
      emptyOutDir: false, // Don't empty the assets dir (might have other files)
      
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
          // Polyfill process.env for browser
          banner: '(function() { if (typeof process === "undefined") { window.process = { env: { NODE_ENV: "production" } }; } })();',
          // Use simple filenames without hash
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'vowel-voice-widget.css';
            }
            return '[name][extname]';
          },
        },
      },
      
      sourcemap: true,
    },
    
    // Resolve paths relative to project root
    resolve: {
      alias: {
        '@': resolve(__dirname, '../../src'),
      },
    },
  };
});

