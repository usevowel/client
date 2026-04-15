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

import { VowelInstructions } from "../VowelInstructions";

let VowelInstructionsWebComponent: CustomElementConstructor | undefined;

async function getVowelInstructionsWebComponent(): Promise<CustomElementConstructor> {
  if (!VowelInstructionsWebComponent) {
    const { default: r2wc } = await import("@r2wc/react-to-web-component");
    VowelInstructionsWebComponent = r2wc(VowelInstructions, {
      props: {
        id: "string",
        content: "string",
      },
    });
  }
  return VowelInstructionsWebComponent;
}

export function registerVowelInstructionsWebComponent() {
  if (typeof window === "undefined" || !window.customElements) {
    console.warn(
      "⚠️ [VowelInstructionsWebComponent] Window or customElements not available"
    );
    return;
  }

  if (!window.customElements.get("vowel-instructions")) {
    console.log("📝 [VowelInstructionsWebComponent] Registering custom element...");
    getVowelInstructionsWebComponent().then((wc) => {
      window.customElements.define("vowel-instructions", wc);
      console.log("✅ [VowelInstructionsWebComponent] Custom element registered");
    });
  } else {
    console.log("⏭️ [VowelInstructionsWebComponent] Already registered");
  }
}

if (typeof window !== "undefined") {
  registerVowelInstructionsWebComponent();
}
