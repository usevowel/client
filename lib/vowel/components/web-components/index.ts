import {
  registerFloatingCursorWebComponent,
} from "./FloatingCursorWebComponent";

import {
  registerControlledBannerWebComponent,
} from "./ControlledBannerWebComponent";

import {
  registerFloatingMicButtonWebComponent,
} from "./FloatingMicButtonWebComponent";

import {
  registerVowelInstructionsWebComponent,
} from "./VowelInstructionsWebComponent";

export {
  registerFloatingCursorWebComponent,
  registerControlledBannerWebComponent,
  registerFloatingMicButtonWebComponent,
  registerVowelInstructionsWebComponent,
};

export function registerAllVowelWebComponents() {
  if (typeof window === "undefined") {
    return;
  }

  const startTime = performance.now();
  console.log("🎨 [VowelWebComponents] Registering all web components...");
  
  registerFloatingCursorWebComponent();
  registerControlledBannerWebComponent();
  registerFloatingMicButtonWebComponent();
  registerVowelInstructionsWebComponent();

  const duration = (performance.now() - startTime).toFixed(2);
  console.log(`✅ [VowelWebComponents] All web components registered in ${duration}ms`);
}

