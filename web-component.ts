/**
 * Web Component Entry Point
 * Converts React VowelAgent to a framework-agnostic web component using r2wc
 * 
 * @module @vowel.to/client/web-component
 * 
 * @example
 * ```html
 * <!-- Load the web component script -->
 * <script src="https://cdn.vowel.to/vowel-voice-widget.min.js"></script>
 * 
 * <!-- Vanilla usage (REQUIRED: app-id attribute) -->
 * <vowel-voice-widget 
 *   app-id="your-app-id"
 *   position="bottom-right">
 * </vowel-voice-widget>
 * 
 * <!-- Controlled Tab preset for traditional websites (WordPress, Laravel, Shopify stores, etc.) -->
 * <vowel-voice-widget
 *   app-id="your-app-id"
 *   preset="controlled"
 *   position="bottom-right">
 * </vowel-voice-widget>
 *
 * <!-- With custom actions and configuration override -->
 * <script>
 *   // Define custom action handlers globally
 *   window.handleAddToCart = async function(params) {
 *     console.log('Adding to cart:', params);
 *     // Your custom logic here
 *   };
 * </script>
 * <vowel-voice-widget
 *   app-id="your-app-id"
 *   custom-actions='[{"name":"addToCart","definition":{"description":"Add item to cart","parameters":{"productId":{"type":"string","description":"Product ID"}}},"handler":"handleAddToCart"}]'
 *   config='{"systemInstructionOverride":"You are a helpful shopping assistant.","voiceConfig":{"voice":"Puck"}}'>
 * </vowel-voice-widget>
 * ```
 * 
 * @remarks
 * The app-id attribute is REQUIRED and must be obtained from your Vowel platform account.
 * It identifies your application and connects to the correct voice agent configuration.
 * 
 * Custom actions require handler functions to be defined globally on the window object.
 * The config attribute accepts a JSON object with systemInstructionOverride and voiceConfig.
 */

// Import styles (will be auto-injected via JavaScript, also available as separate CSS file)
import './lib/vowel/styles/styles.css';

import { VowelWebComponentWrapper } from "./lib/vowel/components/VowelWebComponentWrapper";

let VowelVoiceWidget: CustomElementConstructor | undefined;

async function createVowelVoiceWidget(): Promise<CustomElementConstructor | undefined> {
  if (typeof HTMLElement === "undefined") {
    return undefined;
  }

  if (!VowelVoiceWidget) {
    const { default: r2wc } = await import("@r2wc/react-to-web-component");
    VowelVoiceWidget = r2wc(VowelWebComponentWrapper, {
      props: {
        appId: "string",
        initMode: "string",
        preset: "string",
        adapter: "string",
        position: "string",
        storeUrl: "string",
        showTranscripts: "boolean",
        buttonColor: "string",
        customActions: "string",
        config: "string",
      },
    });
  }
  return VowelVoiceWidget;
}

export function registerVowelWebComponent() {
  if (typeof window === "undefined" || typeof customElements === "undefined") {
    console.warn(
      "⚠️ [VowelWebComponent] Window or customElements not available"
    );
    return;
  }

  createVowelVoiceWidget().then((wc) => {
    if (!wc) {
      console.warn("⚠️ [VowelWebComponent] HTMLElement not available");
      return;
    }

    if (!customElements.get("vowel-voice-widget")) {
      console.log("🎤 [VowelWebComponent] Registering custom element...");
      customElements.define("vowel-voice-widget", wc);
      console.log("✅ [VowelWebComponent] Custom element registered");
    }
  });
}

if (typeof window !== "undefined") {
  registerVowelWebComponent();
}

// Export registry and API for programmatic access
export { vowelRegistry } from "./lib/vowel/web-component/VowelWebComponentRegistry";
export {
  enhanceVowelElement,
  dispatchVowelEvent,
  waitForVowelReady,
} from "./lib/vowel/web-component/VowelWebComponentAPI";

// Export factory registry for custom initialization
export { 
  vowelFactoryRegistry,
} from "./lib/vowel/web-component/VowelFactoryRegistry";

// Export instructions registry
export {
  vowelInstructionsRegistry,
} from "./lib/vowel/components/VowelInstructions";

// Export types
export type {
  VowelVoiceWidgetElement,
  VowelAction,
  ActionHandler,
} from "./lib/vowel/web-component/VowelWebComponentAPI";

export type {
  VowelFactory,
  VowelFactoryConfig,
} from "./lib/vowel/web-component/VowelFactoryRegistry";
