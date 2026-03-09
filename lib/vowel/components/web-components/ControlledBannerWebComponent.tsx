/**
 * @fileoverview ControlledBanner Web Component Wrapper
 * 
 * Exports the ControlledBanner as a web component using r2wc.
 * Registers as <vowel-controlled-banner> custom element.
 * 
 * Displays a top banner with mesh gradient background.
 * 
 * @module @vowel.to/client/components/web-components
 * @author vowel.to
 * @license Proprietary
 */

import r2wc from "@r2wc/react-to-web-component";
import { ControlledBanner } from "../ControlledBanner";

/**
 * Convert ControlledBanner to Web Component
 * 
 * Props:
 * - is-connected: boolean - Whether voice session is connected
 * - is-connecting: boolean - Whether voice session is connecting
 * - is-user-speaking: boolean - Whether user is speaking
 * - is-ai-speaking: boolean - Whether AI is speaking
 * - is-ai-thinking: boolean - Whether AI is thinking
 * - is-resuming: boolean - Whether session is resuming
 * - class-name: string - Custom CSS class
 * - z-index: number - Z-index for positioning (default: 999999)
 * - add-body-padding: boolean - Whether to add body padding (default: true)
 * - gradient-colors: string - JSON array of gradient colors (optional override)
 * - distortion: number - Gradient distortion effect (default: 0.8)
 * - swirl: number - Gradient swirl effect (default: 0.1)
 * - speed: number - Animation speed (default: 1)
 * - height: string - Banner height (default: "48px")
 */
const ControlledBannerWebComponent = r2wc(ControlledBanner, {
  props: {
    isConnected: "boolean",
    isConnecting: "boolean",
    isUserSpeaking: "boolean",
    isAiSpeaking: "boolean",
    isAiThinking: "boolean",
    isToolExecuting: "boolean",
    isResuming: "boolean",
    className: "string",
    zIndex: "number",
    addBodyPadding: "boolean",
    gradientColors: "json",
    distortion: "number",
    swirl: "number",
    speed: "number",
    height: "string",
  },
});

/**
 * Register the vowel-controlled-banner custom element
 * Safe to call multiple times - won't re-register
 */
export function registerControlledBannerWebComponent() {
  if (typeof window === "undefined" || !window.customElements) {
    console.warn(
      "⚠️ [ControlledBannerWebComponent] Window or customElements not available"
    );
    return;
  }

  if (!window.customElements.get("vowel-controlled-banner")) {
    console.log("🎨 [ControlledBannerWebComponent] Registering custom element...");
    window.customElements.define("vowel-controlled-banner", ControlledBannerWebComponent);
    console.log("✅ [ControlledBannerWebComponent] Custom element registered");
  } else {
    console.log("⏭️ [ControlledBannerWebComponent] Already registered");
  }
}

// Auto-register when module loads (for standalone bundles)
if (typeof window !== "undefined") {
  registerControlledBannerWebComponent();
}

export { ControlledBannerWebComponent };

