/**
 * @fileoverview FloatingMicButton Web Component Wrapper
 * 
 * Exports the FloatingMicButton as a web component using r2wc.
 * Registers as <vowel-floating-mic-button> custom element.
 * 
 * @module @vowel.to/client/components/web-components
 * @author vowel.to
 * @license Proprietary
 */

import r2wc from "@r2wc/react-to-web-component";
import { FloatingMicButton } from "../FloatingMicButton";

/**
 * Convert FloatingMicButton to Web Component
 */
const FloatingMicButtonWebComponent = r2wc(FloatingMicButton, {
  props: {
    isConnected: "boolean",
    isConnecting: "boolean",
    isDisconnecting: "boolean",
    isUserSpeaking: "boolean",
    isAiSpeaking: "boolean",
    isAiThinking: "boolean",
    isToolExecuting: "boolean",
    isResuming: "boolean",
    className: "string",
    position: "string",
    zIndex: "number",
    title: "string",
    inline: "boolean",
    showActionIcon: "boolean",
  },
});

/**
 * Register the vowel-floating-mic-button custom element
 * Safe to call multiple times - won't re-register
 */
export function registerFloatingMicButtonWebComponent() {
  if (typeof window === "undefined" || !window.customElements) {
    console.warn(
      "⚠️ [FloatingMicButtonWebComponent] Window or customElements not available"
    );
    return;
  }

  if (!window.customElements.get("vowel-floating-mic-button")) {
    console.log("🎤 [FloatingMicButtonWebComponent] Registering custom element...");
    window.customElements.define("vowel-floating-mic-button", FloatingMicButtonWebComponent);
    console.log("✅ [FloatingMicButtonWebComponent] Custom element registered");
  } else {
    console.log("⏭️ [FloatingMicButtonWebComponent] Already registered");
  }
}

// Auto-register when module loads (for standalone bundles)
if (typeof window !== "undefined") {
  registerFloatingMicButtonWebComponent();
}

export { FloatingMicButtonWebComponent };

