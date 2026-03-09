/**
 * @fileoverview Web Components Registry
 * 
 * Central registry for all Vowel web components. Auto-registers all components
 * when imported, making them available as custom elements.
 * 
 * @module @vowel.to/client/components/web-components
 * @author vowel.to
 * @license Proprietary
 */

// Import all web components
import {
  FloatingCursorWebComponent,
  registerFloatingCursorWebComponent,
} from "./FloatingCursorWebComponent";

import {
  ControlledBannerWebComponent,
  registerControlledBannerWebComponent,
} from "./ControlledBannerWebComponent";

import {
  FloatingMicButtonWebComponent,
  registerFloatingMicButtonWebComponent,
} from "./FloatingMicButtonWebComponent";

import {
  VowelInstructionsWebComponent,
  registerVowelInstructionsWebComponent,
} from "./VowelInstructionsWebComponent";

// Re-export all components
export {
  FloatingCursorWebComponent,
  registerFloatingCursorWebComponent,
  ControlledBannerWebComponent,
  registerControlledBannerWebComponent,
  FloatingMicButtonWebComponent,
  registerFloatingMicButtonWebComponent,
  VowelInstructionsWebComponent,
  registerVowelInstructionsWebComponent,
};

/**
 * Register all web components at once
 * Useful for ensuring all components are registered
 */
export function registerAllVowelWebComponents() {
  if (typeof window === "undefined") {
    return;
  }

  const startTime = performance.now();
  console.log("🎨 [VowelWebComponents] Registering all web components...");
  
  // Call the registration functions that are already imported
  registerFloatingCursorWebComponent();
  registerControlledBannerWebComponent();
  registerFloatingMicButtonWebComponent();
  registerVowelInstructionsWebComponent();

  const duration = (performance.now() - startTime).toFixed(2);
  console.log(`✅ [VowelWebComponents] All web components registered in ${duration}ms`);
}

// Note: Auto-registration removed to improve initial parse/load time
// Components are now registered on-demand when needed
// For standalone bundles, VowelWebComponentWrapper will call registerAllVowelWebComponents() explicitly

