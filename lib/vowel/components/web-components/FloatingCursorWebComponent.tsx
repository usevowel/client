/**
 * @fileoverview FloatingCursor Web Component Wrapper
 * 
 * Exports the FloatingCursorComponent as a web component using r2wc.
 * Registers as <vowel-floating-cursor> custom element.
 * 
 * @module @vowel.to/client/components/web-components
 * @author vowel.to
 * @license Proprietary
 */

import r2wc from "@r2wc/react-to-web-component";
import { FloatingCursorComponent } from "../FloatingCursorComponent";

/**
 * Convert FloatingCursorComponent to Web Component
 */
const FloatingCursorWebComponent = r2wc(FloatingCursorComponent, {
  props: {
    x: "number",
    y: "number",
    text: "string",
    isIdle: "boolean",
    visible: "boolean",
    cursorColor: "string",
    cursorSize: "number",
    badgeBackground: "string",
    badgeTextColor: "string",
    enableTyping: "boolean",
    typingSpeed: "number",
    enableBounce: "boolean",
    transitionDuration: "number",
    zIndex: "number",
  },
});

/**
 * Register the vowel-floating-cursor custom element
 * Safe to call multiple times - won't re-register
 */
export function registerFloatingCursorWebComponent() {
  if (typeof window === "undefined" || !window.customElements) {
    console.warn(
      "⚠️ [FloatingCursorWebComponent] Window or customElements not available"
    );
    return;
  }

  if (!window.customElements.get("vowel-floating-cursor")) {
    console.log("🎯 [FloatingCursorWebComponent] Registering custom element...");
    window.customElements.define("vowel-floating-cursor", FloatingCursorWebComponent);
    console.log("✅ [FloatingCursorWebComponent] Custom element registered");
  } else {
    console.log("⏭️ [FloatingCursorWebComponent] Already registered");
  }
}

// Auto-register when module loads (for standalone bundles)
// Only if document is ready to avoid CSP and initialization issues
if (typeof window !== "undefined" && document.readyState !== "loading") {
  registerFloatingCursorWebComponent();
} else if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", registerFloatingCursorWebComponent);
}

export { FloatingCursorWebComponent };

