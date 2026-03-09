/**
 * @fileoverview CDN Loader Utility
 * 
 * Utility functions for loading external modules from CDN instead of bundling them.
 * This reduces bundle size by loading large dependencies at runtime.
 * 
 * @module @vowel.to/client/utils
 * @author vowel.to
 * @license Proprietary
 */

/**
 * Cache for loaded modules to avoid re-loading
 */
const moduleCache = new Map<string, Promise<any>>();

/**
 * Load @ricky0123/vad-web from CDN using ES modules
 * 
 * Uses jsdelivr CDN with +esm suffix for ES module support.
 * Falls back to dynamic import if CDN fails (for development/testing).
 * 
 * @param version - Package version to load (default: '0.0.30')
 * @returns Promise resolving to the vad-web module with MicVAD and getDefaultRealTimeVADOptions
 * 
 * @example
 * ```typescript
 * const vadModule = await loadVADWebFromCDN();
 * const { MicVAD, getDefaultRealTimeVADOptions } = vadModule;
 * ```
 */
export async function loadVADWebFromCDN(version: string = '0.0.28'): Promise<{
  MicVAD: any;
  getDefaultRealTimeVADOptions: (model: string) => any;
}> {
  const cacheKey = `@ricky0123/vad-web@${version}`;
  
  // Check cache first
  if (moduleCache.has(cacheKey)) {
    return moduleCache.get(cacheKey)!;
  }
  
  // Create loading promise
  const loadPromise = (async () => {
    try {
      // Try loading from CDN using ES modules (jsdelivr supports +esm)
      const cdnUrl = `https://cdn.jsdelivr.net/npm/@ricky0123/vad-web@${version}/+esm`;
      console.log(`[CDN Loader] Loading @ricky0123/vad-web from CDN: ${cdnUrl}`);
      
      const module = await import(/* @vite-ignore */ cdnUrl);
      
      // Verify required exports exist
      if (!module.MicVAD) {
        throw new Error('MicVAD not found in @ricky0123/vad-web module');
      }
      if (!module.getDefaultRealTimeVADOptions) {
        throw new Error('getDefaultRealTimeVADOptions not found in @ricky0123/vad-web module');
      }
      
      console.log(`[CDN Loader] Successfully loaded @ricky0123/vad-web from CDN`);
      return {
        MicVAD: module.MicVAD,
        getDefaultRealTimeVADOptions: module.getDefaultRealTimeVADOptions,
      };
    } catch (cdnError) {
      console.warn(`[CDN Loader] Failed to load from CDN, trying dynamic import:`, cdnError);
      
      // Fallback to dynamic import (for development or if CDN is blocked)
      try {
        const module = await import('@ricky0123/vad-web');
        console.log(`[CDN Loader] Loaded @ricky0123/vad-web from npm package (fallback)`);
        return {
          MicVAD: module.MicVAD,
          getDefaultRealTimeVADOptions: module.getDefaultRealTimeVADOptions,
        };
      } catch (importError) {
        const error = new Error(
          `Failed to load @ricky0123/vad-web from both CDN and npm. ` +
          `CDN error: ${cdnError instanceof Error ? cdnError.message : String(cdnError)}. ` +
          `Import error: ${importError instanceof Error ? importError.message : String(importError)}`
        );
        console.error('[CDN Loader]', error);
        throw error;
      }
    }
  })();
  
  // Cache the promise
  moduleCache.set(cacheKey, loadPromise);
  
  return loadPromise;
}
