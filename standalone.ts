/**
 * @vowel.to/client/standalone - Unified Standalone Bundle
 *
 * This is a combined standalone bundle that includes:
 * 1. Web Component (vowel-voice-widget) for drop-in usage
 * 2. Plain JavaScript Client API for programmatic usage
 * 
 * Designed for CDN usage with all dependencies bundled (using Preact).
 * 
 * @example HTML Usage (Web Component)
 * ```html
 * <script src="https://cdn.vowel.to/vowel-voice-widget.min.js"></script>
 * <vowel-voice-widget app-id="your-app-id"></vowel-voice-widget>
 * ```
 * 
 * @example JavaScript API Usage
 * ```html
 * <script src="https://cdn.vowel.to/vowel-voice-widget.min.js"></script>
 * <script>
 *   const client = new window.VowelClient.Vowel({ appId: 'your-app-id' });
 *   await client.startSession();
 * </script>
 * ```
 */

// ============================================================================
// PART 1: Web Component (auto-registers <vowel-voice-widget>)
// ============================================================================
export * from './web-component';

// ============================================================================
// PART 2: JavaScript Client API (exported to window.VowelClient)
// ============================================================================
// Re-export everything from the main index (framework-agnostic core)
export * from './index';

// ============================================================================
// PART 3: Global Convenience Exports
// ============================================================================
// Import what we need to expose at top level
import { Vowel } from './lib/vowel/core/VowelClient';

/**
 * Type augmentation for window object
 */
declare global {
  interface Window {
    Vowel: typeof Vowel;
    VowelClient: any; // Preserve existing VowelClient namespace
  }
}

// Expose Vowel class at top level for cleaner API
if (typeof window !== 'undefined') {
  window.Vowel = Vowel;
  
  // Note: window.registerVowelFactory is already exposed by VowelFactoryRegistry
  // Just ensure it's imported (already done above via './web-component' export)
}

// ============================================================================
// Console Banner
// ============================================================================
import { VOWEL_VERSION } from './lib/vowel/version';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║   🎤 Vowel Voice AI v${VOWEL_VERSION}                        ║
║   Framework-agnostic voice agent library                 ║
║   Powered by Google Gemini Live API                      ║
╚═══════════════════════════════════════════════════════════╝

Available components:
  • <vowel-voice-widget> - Web component (auto-registered)
  • <vowel-instructions> - System instructions component
  • window.Vowel - JavaScript client API (new!)
  • window.registerVowelFactory() - Custom initialization (new!)
  • window.VowelClient - Legacy namespace (deprecated)

Documentation: https://vowel.to/docs
`);

