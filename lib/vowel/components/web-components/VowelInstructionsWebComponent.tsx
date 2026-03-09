/**
 * @fileoverview VowelInstructions Web Component Wrapper
 * 
 * Exports the VowelInstructions as a web component using r2wc.
 * Registers as <vowel-instructions> custom element.
 * 
 * @module @vowel.to/client/components/web-components
 * @author vowel.to
 * @license Proprietary
 */

import r2wc from "@r2wc/react-to-web-component";
import { VowelInstructions } from "../VowelInstructions";

/**
 * Convert VowelInstructions to Web Component
 */
const VowelInstructionsWebComponent = r2wc(VowelInstructions, {
  props: {
    id: "string",
    content: "string",
  },
});

/**
 * Register the vowel-instructions custom element
 * Safe to call multiple times - won't re-register
 */
export function registerVowelInstructionsWebComponent() {
  if (typeof window === "undefined" || !window.customElements) {
    console.warn(
      "⚠️ [VowelInstructionsWebComponent] Window or customElements not available"
    );
    return;
  }

  if (!window.customElements.get("vowel-instructions")) {
    console.log("📝 [VowelInstructionsWebComponent] Registering custom element...");
    window.customElements.define("vowel-instructions", VowelInstructionsWebComponent);
    console.log("✅ [VowelInstructionsWebComponent] Custom element registered");
  } else {
    console.log("⏭️ [VowelInstructionsWebComponent] Already registered");
  }
}

// Auto-register when module loads (for standalone bundles)
if (typeof window !== "undefined") {
  registerVowelInstructionsWebComponent();
}

// Export the web component
export { VowelInstructionsWebComponent };




