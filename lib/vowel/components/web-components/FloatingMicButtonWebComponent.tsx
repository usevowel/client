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

import { FloatingMicButton } from "../FloatingMicButton";

let FloatingMicButtonWebComponent: CustomElementConstructor | undefined;

async function getFloatingMicButtonWebComponent(): Promise<CustomElementConstructor> {
  if (!FloatingMicButtonWebComponent) {
    const { default: r2wc } = await import("@r2wc/react-to-web-component");
    FloatingMicButtonWebComponent = r2wc(FloatingMicButton, {
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
  }
  return FloatingMicButtonWebComponent;
}

export function registerFloatingMicButtonWebComponent() {
  if (typeof window === "undefined" || !window.customElements) {
    console.warn(
      "⚠️ [FloatingMicButtonWebComponent] Window or customElements not available"
    );
    return;
  }

  if (!window.customElements.get("vowel-floating-mic-button")) {
    console.log("🎤 [FloatingMicButtonWebComponent] Registering custom element...");
    getFloatingMicButtonWebComponent().then((wc) => {
      window.customElements.define("vowel-floating-mic-button", wc);
      console.log("✅ [FloatingMicButtonWebComponent] Custom element registered");
    });
  } else {
    console.log("⏭️ [FloatingMicButtonWebComponent] Already registered");
  }
}

if (typeof window !== "undefined") {
  registerFloatingMicButtonWebComponent();
}
