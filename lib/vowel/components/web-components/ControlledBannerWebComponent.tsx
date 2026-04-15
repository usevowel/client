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

import { ControlledBanner } from "../ControlledBanner";

let ControlledBannerWebComponent: CustomElementConstructor | undefined;

async function getControlledBannerWebComponent(): Promise<CustomElementConstructor> {
  if (!ControlledBannerWebComponent) {
    const { default: r2wc } = await import("@r2wc/react-to-web-component");
    ControlledBannerWebComponent = r2wc(ControlledBanner, {
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
  }
  return ControlledBannerWebComponent;
}

export function registerControlledBannerWebComponent() {
  if (typeof window === "undefined" || !window.customElements) {
    console.warn(
      "⚠️ [ControlledBannerWebComponent] Window or customElements not available"
    );
    return;
  }

  if (!window.customElements.get("vowel-controlled-banner")) {
    console.log("🎨 [ControlledBannerWebComponent] Registering custom element...");
    getControlledBannerWebComponent().then((wc) => {
      window.customElements.define("vowel-controlled-banner", wc);
      console.log("✅ [ControlledBannerWebComponent] Custom element registered");
    });
  } else {
    console.log("⏭️ [ControlledBannerWebComponent] Already registered");
  }
}

if (typeof window !== "undefined") {
  registerControlledBannerWebComponent();
}
