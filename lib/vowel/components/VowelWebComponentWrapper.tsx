/**
 * VowelWebComponentWrapper - React component for web component conversion
 * Wraps VowelAgent with VowelProvider and handles adapter initialization
 * This component is converted to a web component using r2wc
 */

import { useEffect, useState, useRef, useMemo } from "react";
import { VowelProvider } from "./VowelProviderSimple";
import { VowelAgent } from "./components";
import type { VowelAgentProps } from "./components";
import { Vowel } from "../core/VowelClient";
import type { VowelClientConfig, RouterAdapter } from "../types";

// Import platform adapters
import {
  initializeShopifyIntegration,
  ShopifyActionHandler,
  // initializeNavigationListener,
  initializeAutomationListener,
} from "../platforms/shopify";

// Import web component registry and API
import { vowelRegistry } from "../web-component/VowelWebComponentRegistry";
import {
  enhanceVowelElement,
  dispatchVowelEvent,
} from "../web-component/VowelWebComponentAPI";

// Global timer to track full initialization
const INIT_START_TIME = performance.now();

/**
 * Supported platform adapters (DEPRECATED - use preset instead)
 * @deprecated Use preset attribute instead
 */
export type PlatformAdapter = "vanilla" | "shopify";

/**
 * Supported presets
 */
export type PresetName = "shopify" | "vanilla";

/**
 * Custom action definition for web component
 */
export interface WebComponentAction {
  /** Action name/identifier */
  name: string;
  /** Action definition (description and parameters) */
  definition: {
    description: string;
    parameters: Record<
      string,
      {
        type: "string" | "number" | "boolean" | "array" | "object";
        description: string;
        optional?: boolean;
        enum?: string[];
      }
    >;
  };
  /** Handler function name (must be globally accessible via window) */
  handler: string;
}

/**
 * Configuration options for Vowel client
 */
export interface WebComponentConfig {
  /** Override the system prompt/instruction */
  systemInstructionOverride?: string;
  /** Voice configuration options */
  voiceConfig?: {
    model?: string;
    voice?: string;
    language?: string;
  };
}

/**
 * Props for VowelWebComponentWrapper
 * These will be exposed as attributes on the web component
 */
export interface VowelWebComponentWrapperProps {
  /** App ID (required) */
  appId: string;

  /**
   * Initialization mode (NEW)
   * - "auto": Automatically creates Vowel client (default)
   * - "custom": Waits for window.registerVowelFactory() to provide custom initialization
   * @default "auto"
   */
  initMode?: "auto" | "custom";

  /** 
   * Preset to use (NEW - recommended)
   * @example "shopify", "vanilla"
   */
  preset?: PresetName;

  /** 
   * Platform adapter to use (DEPRECATED - use preset instead)
   * @deprecated Use preset attribute instead
   */
  adapter?: PlatformAdapter;

  /** Position of floating button */
  position?: VowelAgentProps["position"];

  /** Show transcript panel */
  showTranscripts?: boolean;

  /** Button color (Tailwind classes or CSS color) */
  buttonColor?: string;

  /** Store URL (for Shopify preset) */
  storeUrl?: string;

  /** Custom actions (JSON string or object) */
  customActions?: string | WebComponentAction[];

  /** Configuration overrides (JSON string or object) */
  config?: string | WebComponentConfig;

  // Voice Nag Options
  /** Enable the voice nag wrapper */
  enableNag?: boolean;

  /** Custom title for the nag message */
  nagTitle?: string;

  /** Custom description for the nag message */
  nagDescription?: string;

  /** Custom acknowledge button text for nag */
  nagButtonText?: string;

  /** LocalStorage key prefix for nag state */
  nagStorageKeyPrefix?: string;

  // Terms & Privacy Modal Options
  /** Enable the terms and privacy modal */
  enableTermsModal?: boolean;

  /** Modal title for terms/privacy */
  termsModalTitle?: string;

  /** Modal description for terms/privacy */
  termsModalDescription?: string;

  /** Terms of service content (HTML or text) */
  termsContent?: string;

  /** URL to external terms of service */
  termsUrl?: string;

  /** Privacy policy content (HTML or text) */
  privacyContent?: string;

  /** URL to external privacy policy */
  privacyUrl?: string;

  /** Text for the accept button in modal */
  termsAcceptButtonText?: string;

  /** Text for the decline button in modal */
  termsDeclineButtonText?: string;

  /** Whether to show a decline button in modal */
  termsAllowDecline?: boolean;

  /** LocalStorage key prefix for terms acceptance state */
  termsStorageKeyPrefix?: string;
}

/**
 * Create a vanilla router adapter for non-platform usage
 */
function createVanillaRouter(): RouterAdapter {
  return {
    navigate: async (path: string) => {
      window.location.href = path;
    },
    getCurrentPath: () => window.location.pathname,
    getRoutes: () => [],
    getContext: () => ({
      location: {
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      },
      routes: [],
      currentPath: window.location.pathname,
    }),
  };
}

/**
 * Parse custom actions from JSON string or return array
 */
function parseCustomActions(
  customActions?: string | WebComponentAction[]
): WebComponentAction[] {
  if (!customActions) return [];

  if (typeof customActions === "string") {
    try {
      return JSON.parse(customActions);
    } catch (error) {
      console.error(
        "❌ [VowelWebComponentWrapper] Failed to parse customActions:",
        error
      );
      return [];
    }
  }

  return customActions;
}

/**
 * Parse config from JSON string or return object
 */
function parseConfig(
  config?: string | WebComponentConfig
): WebComponentConfig {
  if (!config) return {};

  if (typeof config === "string") {
    try {
      return JSON.parse(config);
    } catch (error) {
      console.error(
        "❌ [VowelWebComponentWrapper] Failed to parse config:",
        error
      );
      return {};
    }
  }

  return config;
}

/**
 * VowelWebComponentWrapper - React component that gets converted to web component
 * Handles full initialization with provider structure and platform adapters
 *
 * @example
 * ```html
 * <!-- Vanilla usage -->
 * <vowel-voice-widget app-id="your-app-id"></vowel-voice-widget>
 *
 * <!-- Shopify usage -->
 * <vowel-voice-widget
 *   app-id="your-app-id"
 *   adapter="shopify"
 *   store-url="https://mystore.com">
 * </vowel-voice-widget>
 *
 * <!-- With custom actions and config -->
 * <vowel-voice-widget
 *   app-id="your-app-id"
 *   custom-actions='[{"name":"addToCart","definition":{...},"handler":"handleAddToCart"}]'
 *   config='{"instructions":"You are a helpful assistant."}'>
 * </vowel-voice-widget>
 * ```
 */
export function VowelWebComponentWrapper({
  appId,
  initMode = "auto",
  preset,
  adapter,
  position = "bottom-right",
  showTranscripts = false,
  buttonColor,
  storeUrl,
  customActions,
  config,
  // Nag props
  enableNag,
  nagTitle,
  nagDescription,
  nagButtonText,
  nagStorageKeyPrefix,
  // Terms modal props
  enableTermsModal,
  termsModalTitle,
  termsModalDescription,
  termsContent,
  termsUrl,
  privacyContent,
  privacyUrl,
  termsAcceptButtonText,
  termsDeclineButtonText,
  termsAllowDecline,
  termsStorageKeyPrefix,
}: VowelWebComponentWrapperProps) {
  // Determine which mode to use: preset (new) or adapter (legacy)
  const usePreset = preset !== undefined;
  const effectivePreset = preset || (adapter === "shopify" ? "shopify" : "vanilla");
  
  // Show deprecation warning if using adapter
  if (adapter && !preset) {
    console.warn('⚠️ [VowelWebComponentWrapper] The "adapter" attribute is deprecated. Please use "preset" instead.');
    console.warn(`   💡 Replace adapter="${adapter}" with preset="${effectivePreset}"`);
  }
  
  // Log init mode for debugging
  if (initMode === "custom") {
    console.log('🏭 [VowelWebComponentWrapper] Using custom initialization mode - waiting for factory');
  }
  const [vowelClient, setVowelClient] = useState<Vowel | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isElementEnhanced, setIsElementEnhanced] = useState(false); // Track when element has API methods
  const initRef = useRef(false);
  const instanceIdRef = useRef<string | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const timersRef = useRef({
    scriptParseComplete: INIT_START_TIME,
    componentMount: 0,
    registrySetup: 0,
    clientInit: 0,
    clientReady: 0,
  });
  
  // Register instance and enhance element on mount
  useEffect(() => {
    const mountStart = performance.now();
    timersRef.current.componentMount = mountStart;
    console.log(`⏱️ [VowelWebComponentWrapper] Component mounted at +${(mountStart - INIT_START_TIME).toFixed(2)}ms`);
    
    // Find the host element (web component)
    // Note: r2wc renders React components directly into the custom element (no shadow DOM by default)
    // So we need to traverse up from the React root to find the <vowel-voice-widget> host
    const findHostElement = (): HTMLElement | null => {
      if (typeof window === 'undefined') return null;
      
      // Strategy: Query all vowel-voice-widget elements
      // Since the React component is rendered INSIDE the web component, this should work
      const widgets = document.querySelectorAll('vowel-voice-widget');
      console.log(`🔍 [VowelWebComponentWrapper] Found ${widgets.length} vowel-voice-widget elements in document`);
      console.log(`🔍 [VowelWebComponentWrapper] document.readyState: ${document.readyState}`);
      console.log(`🔍 [VowelWebComponentWrapper] document.body children: ${document.body?.children.length}`);
      
      // Find the one that doesn't have an instance ID yet, or the last one
      for (let i = widgets.length - 1; i >= 0; i--) {
        const widget = widgets[i] as HTMLElement;
        const hasInstanceId = widget.getAttribute('data-vowel-instance-id');
        console.log(`🔍 [VowelWebComponentWrapper] Widget ${i}: hasInstanceId=${!!hasInstanceId}, id=${hasInstanceId}, tagName=${widget.tagName}`);
        if (!hasInstanceId) {
          console.log(`✅ [VowelWebComponentWrapper] Selected widget ${i} (no instance ID yet)`);
          return widget;
        }
      }
      
      // If all have IDs, return the last one (most recently created)
      if (widgets.length > 0) {
        console.log(`⚠️ [VowelWebComponentWrapper] All widgets have IDs, selecting last one`);
        return widgets[widgets.length - 1] as HTMLElement;
      }
      
      console.error(`❌ [VowelWebComponentWrapper] No vowel-voice-widget elements found in document!`);
      console.error(`❌ [VowelWebComponentWrapper] This suggests a timing issue - the web component may not be in DOM yet.`);
      return null;
    };

    // Try to find host immediately
    let hostElement = findHostElement();
    
    // If not found, retry after a short delay (timing issue with r2wc rendering)
    if (!hostElement) {
      console.warn(`⚠️ [VowelWebComponentWrapper] Host element not found immediately, retrying after 10ms...`);
      const retryTimeout = setTimeout(() => {
        hostElement = findHostElement();
        if (hostElement) {
          registerAndEnhance(hostElement);
        } else {
          console.error(`❌ [VowelWebComponentWrapper] Still could not find host element after retry!`);
        }
      }, 10);
      
      return () => {
        clearTimeout(retryTimeout);
        if (instanceIdRef.current) {
          vowelRegistry.unregisterInstance(instanceIdRef.current);
          instanceIdRef.current = null;
        }
      };
    }
    
    // Helper function to register and enhance
    function registerAndEnhance(hostElement: HTMLElement) {
      const registryStart = performance.now();
      elementRef.current = hostElement;
      instanceIdRef.current = vowelRegistry.registerInstance(hostElement);
      console.log(`🎤 [VowelWebComponentWrapper] Calling enhanceVowelElement with instanceId: ${instanceIdRef.current}`);
      enhanceVowelElement(hostElement, instanceIdRef.current);
      
      // Verify API methods were attached
      const enhanced = hostElement as any;
      console.log(`🔍 [VowelWebComponentWrapper] API verification:`, {
        hasGetVowelClient: typeof enhanced.getVowelClient === 'function',
        hasRegisterAction: typeof enhanced.registerAction === 'function',
        hasInstanceId: !!enhanced._instanceId,
        instanceId: enhanced._instanceId
      });
      
      // Set any config from props
      const parsedConfig = parseConfig(config);
      if (Object.keys(parsedConfig).length > 0) {
        vowelRegistry.setConfig(instanceIdRef.current, parsedConfig);
      }
      
      timersRef.current.registrySetup = performance.now();
      const registryDuration = (timersRef.current.registrySetup - registryStart).toFixed(2);
      console.log(`🎤 [VowelWebComponentWrapper] Instance registered: ${instanceIdRef.current} (+${registryDuration}ms)`);
      console.log(`⏱️ [VowelWebComponentWrapper] Total time since script load: ${(timersRef.current.registrySetup - INIT_START_TIME).toFixed(2)}ms`);
      
      // Mark element as enhanced - this allows the client init effect to proceed with dispatching events
      setIsElementEnhanced(true);
      console.log(`✅ [VowelWebComponentWrapper] Element enhancement complete, ready for client initialization`);
    }
    
    // Register immediately if found
    if (hostElement) {
      registerAndEnhance(hostElement);
    }

    // Cleanup on unmount
    return () => {
      if (instanceIdRef.current) {
        vowelRegistry.unregisterInstance(instanceIdRef.current);
        instanceIdRef.current = null;
      }
    };
  }, []); // Empty deps - only run once on mount
  
  // Dispatch ready event when both element is enhanced AND client is initialized
  useEffect(() => {
    if (isElementEnhanced && vowelClient && elementRef.current) {
      console.log(`✅ [VowelWebComponentWrapper] Both element enhanced and client ready, dispatching vowel-ready event`);
      dispatchVowelEvent(elementRef.current, 'ready', { client: vowelClient });
    }
  }, [isElementEnhanced, vowelClient]);
  
  // Check if this tab is controlled by another Vowel instance
  const isControlled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    
    // Check multiple sources for controlled status
    const urlParams = new URLSearchParams(window.location.search);
    const hasControlledParam = urlParams.get('vowel_controlled') === 'true';
    const hasControlledSession = sessionStorage.getItem('vowel-controlled') === 'true';
    const hasControlledWindowName = window.name && window.name.startsWith('vowel-content-');
    
    const controlled = hasControlledParam || hasControlledSession || hasControlledWindowName;
    
    if (controlled) {
      console.log('🎯 [VowelWebComponentWrapper] Running in controlled tab - hiding mic button');
      console.log('   🔖 Detected via query param:', hasControlledParam);
      console.log('   💾 Detected via sessionStorage:', hasControlledSession);
      console.log('   📛 Detected via window name:', hasControlledWindowName);
    }
    
    return controlled;
  }, []);
  
  // Initialize navigation and automation listeners for controlled tabs
  useEffect(() => {
    if (isControlled && (effectivePreset === 'shopify' || adapter === 'shopify')) {
      const listenersStart = performance.now();
      console.log(`⏱️ [VowelWebComponentWrapper] Starting controlled tab initialization at +${(listenersStart - INIT_START_TIME).toFixed(2)}ms`);
      console.log('   📡 [VowelWebComponentWrapper] Initializing listeners for controlled tab...');
      
      // Lazy load and initialize navigation listener
      Promise.all([
        import('../platforms/generic/navigation-listener'),
        import('./web-components'),
      ]).then(([navModule, wcModule]) => {
        const navStart = performance.now();
        console.log(`   ⏱️ Modules loaded in ${(navStart - listenersStart).toFixed(2)}ms`);
        
        console.log('   📡 Setting up navigation listener...');
        navModule.initializeNavigationListener();
        
        console.log('   📡 Setting up automation listener...');
        initializeAutomationListener();  // Use default 'vowel-automation' channel
        
        console.log('   📡 Registering web components...');
        wcModule.registerAllVowelWebComponents();
        
        const listenersDone = performance.now();
        console.log(`   ✅ All listeners initialized in ${(listenersDone - navStart).toFixed(2)}ms`);
        console.log(`⏱️ [VowelWebComponentWrapper] Controlled tab setup complete at +${(listenersDone - INIT_START_TIME).toFixed(2)}ms`);
      });
      
      // Initialize floating cursor for controlled tab
      console.log('   🎯 [VowelWebComponentWrapper] Initializing floating cursor for controlled tab...');
      const initFloatingCursor = async () => {
        try {
          const { FloatingCursorManager } = await import('../managers/FloatingCursorManager');
          const { getPreset } = await import('../presets');
          const { setAutomationListenerCursorManager } = await import('../platforms/generic/automation-listener');
          
          const preset = getPreset(effectivePreset as 'vanilla' | 'controlled' | 'shopify'); // Includes internal presets like 'shopify'
          
          if (preset.floatingCursor?.enabled) {
            const manager = new FloatingCursorManager(preset.floatingCursor);
            console.log('   ✅ [VowelWebComponentWrapper] Floating cursor initialized for controlled tab');
            
            // Set the global cursor manager for the automation listener
            setAutomationListenerCursorManager(manager);
            
            // Cleanup on unmount
            return () => {
              manager.destroy();
              setAutomationListenerCursorManager(null);
              console.log('   🧹 [VowelWebComponentWrapper] Floating cursor destroyed');
            };
          }
        } catch (error) {
          console.error('   ❌ [VowelWebComponentWrapper] Failed to initialize floating cursor:', error);
        }
      };
      
      initFloatingCursor();
      
      console.log('   🛑 Skipping VowelClient initialization - this is a controlled tab');
    }
  }, [isControlled, effectivePreset, adapter]);

  useEffect(() => {
    // Skip initialization if this is a controlled tab
    if (isControlled) {
      console.log('🛑 [VowelWebComponentWrapper] Skipping VowelClient initialization - this is a controlled tab');
      return;
    }
    
    // Wait for element enhancement to complete before initializing client
    // This ensures instanceIdRef and elementRef are set before we try to store the client
    if (!isElementEnhanced) {
      console.log('⏳ [VowelWebComponentWrapper] Waiting for element enhancement before client initialization...');
      return;
    }
    
    // Prevent double initialization in strict mode
    if (initRef.current) return;
    initRef.current = true;

    const fullInitStart = performance.now();
    timersRef.current.clientInit = fullInitStart;
    console.log(`⏱️ ════════════════════════════════════════════════════════════════`);
    console.log(`⏱️ [VowelWebComponentWrapper] 🚀 STARTING FULL INITIALIZATION`);
    console.log(`⏱️ [VowelWebComponentWrapper] Time since script load: +${(fullInitStart - INIT_START_TIME).toFixed(2)}ms`);
    console.log(`⏱️ ════════════════════════════════════════════════════════════════`);
    console.log("🎤 [VowelWebComponentWrapper] Config:", {
      appId,
      adapter,
      storeUrl,
    });

    const initializeVowel = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        // Validate required appId
        if (!appId || appId.trim() === "" || appId === "default-app") {
          throw new Error(
            "Missing or invalid app-id attribute. Please provide a valid Vowel application ID from the Vowel platform."
          );
        }

        // Parse configuration and custom actions
        const parsedConfig = parseConfig(config);
        const parsedActions = parseCustomActions(customActions);

        console.log("🎤 [VowelWebComponentWrapper] Initializing...", {
          appId,
          mode: usePreset ? 'preset' : 'legacy-adapter',
          preset: effectivePreset,
          adapter,
          storeUrl,
          hasCustomConfig: Object.keys(parsedConfig).length > 0,
          customActionsCount: parsedActions.length,
        });

        let router: RouterAdapter | undefined;
        let navigationAdapter: any | undefined;
        let automationAdapter: any | undefined;
        let routes: any[] = [];
        let actionHandler: ShopifyActionHandler | null = null;
        let floatingCursorConfig: any = undefined;

        // Initialize based on preset (new) or adapter (legacy)
        if (usePreset) {
          // NEW: Preset-based initialization with dual adapters
          console.log(`🎯 [VowelWebComponentWrapper] Initializing from preset: ${effectivePreset}`);
          
          const { initializeFromPreset } = await import('../presets');
          const { initializeShopifyDualAdapters } = await import('../platforms/shopify');
          
          if (effectivePreset === 'shopify') {
            // Use Shopify dual adapter initialization
            const shopifySetup = await initializeShopifyDualAdapters({
              storeUrl: storeUrl || window.location.origin,
              useFallbackRoutes: false,
            });
            
            navigationAdapter = shopifySetup.navigationAdapter;
            automationAdapter = shopifySetup.automationAdapter;
            routes = shopifySetup.routes;
            actionHandler = shopifySetup.actionHandler;
            
            // Get floating cursor config from preset
            const presetConfig = await initializeFromPreset(effectivePreset as 'shopify', { storeUrl });
            floatingCursorConfig = presetConfig.floatingCursor;
            
            console.log(`✅ [VowelWebComponentWrapper] Shopify preset initialized with ${routes.length} routes`);
          } else {
            // Vanilla or other preset
            const presetSetup = await initializeFromPreset(effectivePreset, {});
            navigationAdapter = presetSetup.navigationAdapter;
            automationAdapter = presetSetup.automationAdapter;
            floatingCursorConfig = presetSetup.floatingCursor;
            
            console.log(`✅ [VowelWebComponentWrapper] ${effectivePreset} preset initialized`);
          }
        } else {
          // LEGACY: Adapter-based initialization (deprecated)
          console.log(`⚠️ [VowelWebComponentWrapper] Using legacy adapter mode: ${adapter}`);
          
          if (adapter === "shopify") {
            console.log("🛍️ [VowelWebComponentWrapper] Initializing Shopify adapter (legacy)...");

            // Initialize Shopify integration (legacy mode)
            const shopifyIntegration = await initializeShopifyIntegration({
              storeUrl: storeUrl || window.location.origin,
              useFallbackRoutes: false,
            });

            router = shopifyIntegration.router;
            routes = shopifyIntegration.routes;
            actionHandler = shopifyIntegration.actionHandler;

            // Add legacy floating cursor config for Shopify
            floatingCursorConfig = {
              enabled: true,
              appearance: {
                cursorColor: '#2563eb',
                cursorSize: 32,
              },
              animation: {
                enableTyping: true,
                typingSpeed: 50,
                enableBounce: true,
              },
              behavior: {
                autoHideDelay: 3000,
                showDuringSearch: true,
              },
            };

            console.log(
              `✅ [VowelWebComponentWrapper] Shopify adapter initialized with ${routes.length} routes (legacy)`
            );
          } else {
            // Vanilla adapter - basic navigation only
            console.log("🌐 [VowelWebComponentWrapper] Using vanilla adapter (legacy)...");
            router = createVanillaRouter();
            routes = [];
          }
        }

        // Create Vowel client configuration
        // appId comes from HTML attribute as string
        const clientConfig: VowelClientConfig = {
          appId: appId,
          // Use new adapters if available, fall back to legacy router
          ...(navigationAdapter && { navigationAdapter }),
          ...(automationAdapter && { automationAdapter }),
          ...(router && { router }),
          routes,
          // Pass configuration overrides
          ...(parsedConfig.systemInstructionOverride && {
            systemInstructionOverride: parsedConfig.systemInstructionOverride,
          }),
          ...(parsedConfig.voiceConfig && {
            voiceConfig: parsedConfig.voiceConfig,
          }),
          // Add floating cursor config
          ...(floatingCursorConfig && { floatingCursor: floatingCursorConfig }),
        };

        // Check for vowel-instructions component (wait up to 500ms)
        let systemInstructions: string | null = null;
        if (typeof window !== 'undefined' && window.__VOWEL_INSTRUCTIONS__) {
          console.log('📝 [VowelWebComponentWrapper] Checking for vowel-instructions component...');
          
          // Try immediately first
          systemInstructions = window.__VOWEL_INSTRUCTIONS__.getFirst();
          
          // If not found, wait a bit for it to register
          if (!systemInstructions) {
            await new Promise(resolve => setTimeout(resolve, 100));
            systemInstructions = window.__VOWEL_INSTRUCTIONS__.getFirst();
          }
          
          if (systemInstructions) {
            console.log(`✅ [VowelWebComponentWrapper] Found vowel-instructions: ${systemInstructions.length} characters`);
            // Override system instructions from component if found
            parsedConfig.systemInstructionOverride = systemInstructions;
          } else {
            console.log('ℹ️ [VowelWebComponentWrapper] No vowel-instructions component found');
          }
        }
        
        let client: Vowel;
        
        // Check if we're in custom initialization mode
        if (initMode === "custom") {
          console.log('🏭 [VowelWebComponentWrapper] Custom init mode - waiting for factory...');
          
          // Import factory registry
          const { vowelFactoryRegistry } = await import('../web-component/VowelFactoryRegistry');
          
          // Use event-based waiting with 30 second timeout
          // This handles delayed module loading gracefully
          let factory: any;
          try {
            console.log('⏳ [VowelWebComponentWrapper] Waiting for factory registration (timeout: 30s)...');
            factory = await vowelFactoryRegistry.waitForFactory(30000);
            console.log('✅ [VowelWebComponentWrapper] Factory registered and ready!');
          } catch (error) {
            throw new Error(
              'init-mode="custom" specified but no factory registered within 30 seconds. ' +
              'Make sure to call window.registerVowelFactory() in your initialization code. ' +
              'The factory should be registered before or shortly after the web component loads. ' +
              'If using ES6 modules, ensure they load before the timeout.'
            );
          }
          
          // Prepare factory config
          const factoryConfig = {
            appId,
            element: elementRef.current!,
            position,
            // Pass any other relevant config
            preset: effectivePreset,
            storeUrl,
          };
          
          // Call factory and await result
          client = await factory(factoryConfig);
          
          if (!client) {
            throw new Error('Factory function must return a Vowel client instance');
          }
          
          console.log('✅ [VowelWebComponentWrapper] Vowel client created via factory');
        } else {
          // AUTO mode - create client ourselves
          console.log("🎤 [VowelWebComponentWrapper] Creating Vowel client with config:", {
            appId,
            mode: usePreset ? 'preset' : 'legacy',
            hasNavigationAdapter: !!navigationAdapter,
            hasAutomationAdapter: !!automationAdapter,
            hasRouter: !!router,
            hasSystemInstructionOverride: !!parsedConfig.systemInstructionOverride,
            hasVoiceConfig: !!parsedConfig.voiceConfig,
            floatingCursorEnabled: !!floatingCursorConfig?.enabled,
          });
          
          // Update clientConfig with any discovered instructions
          const finalClientConfig: VowelClientConfig = {
            ...clientConfig,
            ...(parsedConfig.systemInstructionOverride && {
              systemInstructionOverride: parsedConfig.systemInstructionOverride,
            }),
          };
          
          client = new Vowel(finalClientConfig);
        }

        // Register platform-specific actions (ONLY in legacy mode)
        // When using dual adapters (preset mode), skip ShopifyActionHandler registration
        // because automation adapter provides all DOM actions natively
        if (actionHandler && !usePreset) {
          const platformName = effectivePreset === 'shopify' ? 'Shopify' : 'platform';
          console.log(`🎯 [VowelWebComponentWrapper] Registering ${platformName} actions (legacy mode)...`);
          const actionDefinitions = actionHandler.getActionDefinitions();

          // Register each action
          Object.entries(actionDefinitions).forEach(([name, definition]) => {
            const handler = (actionHandler as any)[name];
            if (typeof handler === "function") {
              client.registerAction(
                name,
                definition as any, // Type assertion for action definitions
                handler.bind(actionHandler)
              );
              console.log(`  ✓ Registered action: ${name}`);
            }
          });

          console.log(
            `✅ [VowelWebComponentWrapper] Registered ${Object.keys(actionDefinitions).length} ${platformName} actions`
          );
        } else if (actionHandler && usePreset) {
          console.log(`🎯 [VowelWebComponentWrapper] Skipping ShopifyActionHandler registration (using dual adapters)`);
          console.log(`   ℹ️  Automation adapter provides all DOM actions natively`);
        }

        // Register actions from the registry (programmatically registered)
        if (instanceIdRef.current) {
          const registryActions = vowelRegistry.getActions(instanceIdRef.current);
          
          if (registryActions.size > 0) {
            console.log(
              `🎯 [VowelWebComponentWrapper] Registering ${registryActions.size} programmatic actions...`
            );

            for (const [name, { definition, handler }] of registryActions) {
              client.registerAction(name, definition, handler);
              console.log(`  ✓ Registered programmatic action: ${name}`);
            }
          }
        }

        // Register custom actions from web component props (JSON attributes)
        if (parsedActions.length > 0) {
          console.log(
            `🎯 [VowelWebComponentWrapper] Registering ${parsedActions.length} attribute-based actions...`
          );

          for (const action of parsedActions) {
            try {
              // Get handler function from window object (for backwards compatibility)
              const handlerFn = (window as any)[action.handler];

              if (typeof handlerFn !== "function") {
                console.error(
                  `❌ [VowelWebComponentWrapper] Handler function "${action.handler}" not found on window object for action "${action.name}"`
                );
                console.log(
                  `   💡 Tip: Define handlers globally (window.${action.handler}) or use element.registerAction() instead`
                );
                continue;
              }

              // Register the action with the Vowel client
              client.registerAction(
                action.name,
                action.definition as any,
                handlerFn
              );

              console.log(`  ✓ Registered attribute action: ${action.name}`);
            } catch (error) {
              console.error(
                `❌ [VowelWebComponentWrapper] Failed to register action "${action.name}":`,
                error
              );
            }
          }

          console.log(
            `✅ [VowelWebComponentWrapper] Attribute-based actions registration complete`
          );
        }

        // Store client in registry
        console.log(`🔍 [VowelWebComponentWrapper] Storing client in registry:`, {
          hasInstanceId: !!instanceIdRef.current,
          instanceId: instanceIdRef.current,
          hasClient: !!client
        });
        if (instanceIdRef.current) {
          vowelRegistry.setClient(instanceIdRef.current, client);
          console.log(`✅ [VowelWebComponentWrapper] Client stored in registry with ID: ${instanceIdRef.current}`);
          
          // Verify it was stored
          const storedClient = vowelRegistry.getClient(instanceIdRef.current);
          console.log(`🔍 [VowelWebComponentWrapper] Verification - client retrieval:`, {
            hasStoredClient: !!storedClient,
            clientMatches: storedClient === client
          });
        } else {
          console.error(`❌ [VowelWebComponentWrapper] Cannot store client: instanceIdRef.current is null!`);
        }

        setVowelClient(client);
        
        timersRef.current.clientReady = performance.now();
        
        // Dispatch ready event ONLY if element has been enhanced
        // This ensures the API methods (getVowelClient, etc.) are available before the event fires
        if (elementRef.current && isElementEnhanced) {
          console.log(`🎤 [VowelWebComponentWrapper] Dispatching vowel-ready event (element is enhanced)`);
          dispatchVowelEvent(elementRef.current, 'ready', { client });
        } else if (elementRef.current && !isElementEnhanced) {
          console.warn(`⚠️ [VowelWebComponentWrapper] Delaying vowel-ready event until element is enhanced`);
          // The ready event will be dispatched by a separate useEffect when isElementEnhanced becomes true
        } else {
          console.error(`❌ [VowelWebComponentWrapper] Cannot dispatch ready event: elementRef.current is null`);
        }
        
        const totalInitTime = timersRef.current.clientReady - INIT_START_TIME;
        const clientInitTime = timersRef.current.clientReady - fullInitStart;
        
        console.log(`⏱️ ════════════════════════════════════════════════════════════════`);
        console.log(`⏱️ [VowelWebComponentWrapper] ✅ INITIALIZATION COMPLETE`);
        console.log(`⏱️ [VowelWebComponentWrapper] Total time: ${totalInitTime.toFixed(2)}ms`);
        console.log(`⏱️ [VowelWebComponentWrapper] Client init: ${clientInitTime.toFixed(2)}ms`);
        console.log(`⏱️ [VowelWebComponentWrapper] Breakdown:`);
        console.log(`⏱️   - Script parse to mount: ${(timersRef.current.componentMount - INIT_START_TIME).toFixed(2)}ms`);
        console.log(`⏱️   - Registry setup: ${(timersRef.current.registrySetup - timersRef.current.componentMount).toFixed(2)}ms`);
        console.log(`⏱️   - Client initialization: ${clientInitTime.toFixed(2)}ms`);
        console.log(`⏱️ ════════════════════════════════════════════════════════════════`);
      } catch (err) {
        console.error("❌ [VowelWebComponentWrapper] Initialization failed:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to initialize Vowel";
        setError(errorMessage);
        
        // Dispatch error event
        if (elementRef.current) {
          dispatchVowelEvent(elementRef.current, 'error', { 
            error: errorMessage,
            originalError: err 
          });
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeVowel();

    // Cleanup
    return () => {
      if (vowelClient) {
        console.log("🧹 [VowelWebComponentWrapper] Cleaning up...");
        vowelClient.stopSession();
      }
    };
  }, [appId, preset, adapter, storeUrl, customActions, config, usePreset, effectivePreset, isElementEnhanced]);

  // Show error state
  if (error) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: "1rem",
          right: "1rem",
          background: "#ef4444",
          color: "white",
          padding: "0.75rem 1rem",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          maxWidth: "300px",
          zIndex: 9999,
        }}
      >
        <strong>Vowel Error:</strong> {error}
      </div>
    );
  }

  // Show loading state (optional - could be removed for cleaner experience)
  if (isInitializing || !vowelClient) {
    return null; // Silent loading
  }

  // Render VowelAgent wrapped in VowelProvider
  return (
    <VowelProvider client={vowelClient}>
      {/* Only show agent if not in a controlled tab */}
      {!isControlled && (
        <VowelAgent
          position={position}
          showTranscripts={showTranscripts}
          buttonColor={buttonColor}
          // Nag props
          enableNag={enableNag}
          nagTitle={nagTitle}
          nagDescription={nagDescription}
          nagButtonText={nagButtonText}
          nagStorageKeyPrefix={nagStorageKeyPrefix}
          // Terms modal props
          enableTermsModal={enableTermsModal}
          termsModalTitle={termsModalTitle}
          termsModalDescription={termsModalDescription}
          termsContent={termsContent}
          termsUrl={termsUrl}
          privacyContent={privacyContent}
          privacyUrl={privacyUrl}
          termsAcceptButtonText={termsAcceptButtonText}
          termsDeclineButtonText={termsDeclineButtonText}
          termsAllowDecline={termsAllowDecline}
          termsStorageKeyPrefix={termsStorageKeyPrefix}
        />
      )}
    </VowelProvider>
  );
}

