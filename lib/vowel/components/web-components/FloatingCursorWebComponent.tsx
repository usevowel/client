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

import { FloatingCursorComponent } from "../FloatingCursorComponent";

let FloatingCursorWebComponent: CustomElementConstructor | undefined;

async function getFloatingCursorWebComponent(): Promise<CustomElementConstructor> {
  if (!FloatingCursorWebComponent) {
    const { default: r2wc } = await import("@r2wc/react-to-web-component");
    FloatingCursorWebComponent = r2wc(FloatingCursorComponent, {
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
  }
  return FloatingCursorWebComponent;
}

export function registerFloatingCursorWebComponent() {
  if (typeof window === "undefined" || !window.customElements) {
    console.warn(
      "⚠️ [FloatingCursorWebComponent] Window or customElements not available"
    );
    return;
  }

  if (!window.customElements.get("vowel-floating-cursor")) {
    console.log("🎯 [FloatingCursorWebComponent] Registering custom element...");
    getFloatingCursorWebComponent().then((wc) => {
      window.customElements.define("vowel-floating-cursor", wc);
      console.log("✅ [FloatingCursorWebComponent] Custom element registered");
    });
  } else {
    console.log("⏭️ [FloatingCursorWebComponent] Already registered");
  }
}

if (typeof window !== "undefined" && document.readyState !== "loading") {
  registerFloatingCursorWebComponent();
} else if (typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", registerFloatingCursorWebComponent);
}
