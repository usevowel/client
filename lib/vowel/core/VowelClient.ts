/**
 * @fileoverview Vowel Client - Main class-based API for voice agent integration
 * 
 * This file contains the core `Vowel` class which serves as the primary entry point
 * for integrating voice-powered AI agents into web applications. The client provides
 * a clean, extensible interface for managing voice sessions, registering custom actions,
 * handling navigation, and enabling page automation through voice commands.
 * 
 * Key Features:
 * - Real-time voice interaction powered by Google Gemini Live API
 * - Dual adapter architecture for navigation and automation
 * - Custom action registration for business logic
 * - Event notification system for programmatic AI responses
 * - Framework-agnostic design (works with React, Vue, Next.js, vanilla JS, etc.)
 * 
 * @module @vowel.to/client/core
 * @author vowel.to
 * @license Proprietary
 */

import type {
  VowelRoute,
  VowelAction,
  VowelVoiceConfig,
  VowelClientConfig,
  RouterAdapter,
  NavigationAdapter,
  AutomationAdapter,
  ActionHandler,
} from "../types";
import { ToolManager, type ToolContext, type ToolResult } from "../managers";
import { StateManager, type VoiceSessionState } from "../managers";
import { AudioManager } from "../managers";
import { SessionManager } from "../managers";
import { TypingSoundManager } from "../managers/TypingSoundManager";
import { FloatingCursorManager } from "../managers/FloatingCursorManager";
import { VOWEL_VERSION, VOWEL_BUILD_TIME } from "../version";
import { ActionNotifier } from "./action-notifier";
import { BorderGlowManager } from "../ui/border-glow";
import { FloatingActionPillManager } from "../ui/FloatingActionPill";
import { isMobileOrTablet } from "../utils/device-detection";
import { DarkModeManager } from "../utils/darkMode";

/**
 * Main Vowel client class
 *
 * @example
 * ```ts
 * // vowel.client.ts
 * import { Vowel } from '@/lib/vowel';
 * import { tanstackRouterAdapter } from '@/lib/vowel/adapters';
 * import { router } from './router';
 *
 * export const vowel = new Vowel({
 *   appId: 'your-app-id',
 *   router: tanstackRouterAdapter(router),
 *   routes: [
 *     { path: '/products', description: 'Browse products' },
 *     { path: '/cart', description: 'View cart' }
 *   ]
 * });
 *
 * // Register custom actions
 * vowel.registerAction('searchProducts', {
 *   description: 'Search for products',
 *   parameters: {
 *     query: { type: 'string', description: 'Search query' }
 *   }
 * }, async (params) => {
 *   await searchProducts(params.query);
 * });
 * ```
 */
export class Vowel {
  private config: VowelClientConfig;
  private toolManager: ToolManager;
  private stateManager: StateManager;
  private audioManager: AudioManager;
  private sessionManager: SessionManager;
  private typingSoundManager?: TypingSoundManager;
  private floatingCursorManager?: FloatingCursorManager;
  private borderGlowManager?: BorderGlowManager;
  private actionPillManager?: FloatingActionPillManager;
  private actionNotifier: ActionNotifier;
  private _routes: VowelRoute[];
  private navigationAdapter?: NavigationAdapter;
  private automationAdapter?: AutomationAdapter;
  private transcriptEventListeners: Set<(event: {
    type: 'delta' | 'done';
    text: string;
    role: 'user' | 'assistant';
    responseId?: string;
    itemId?: string;
  }) => void> = new Set();
  private legacyRouter?: RouterAdapter;
  private darkModeManager?: DarkModeManager;
  private context: Record<string, unknown> | null = null; // Dynamic context object that gets stringified and appended to system prompt

  constructor(config: VowelClientConfig) {
    // Log Vowel client version on initialization
    const buildTime = new Date(VOWEL_BUILD_TIME).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    console.log(`🎙️ Vowel Client v${VOWEL_VERSION} (built: ${buildTime})`);

    // Validate config - either appId (for platform tokens) or voiceConfig.token (for direct connections) is required
    const hasAppId = !!config.appId;
    const hasDirectToken = !!config.voiceConfig?.token;
    
    if (!hasAppId && !hasDirectToken) {
      throw new Error(
        'VowelClient requires either appId (for platform-managed tokens) or voiceConfig.token (for direct connections) to be provided in config. ' +
        'See https://vowel.to/docs/recipes/connection-paradigms for more information.'
      );
    }

    // Set default floating cursor config (enabled by default)
    // Users must explicitly set enabled: false to disable
    const floatingCursorConfig = config.floatingCursor ?? { enabled: true };
    
    // Handle legacy 'systemInstructionOverride' (prefer 'instructions')
    // 'instructions' is the preferred property, 'systemInstructionOverride' is legacy
    const instructions = config.instructions || config.systemInstructionOverride;
    
    if (config.systemInstructionOverride && !config.instructions) {
      console.warn('⚠️  Using deprecated "systemInstructionOverride" property. Please use "instructions" instead.');
    }
    
    if (instructions) {
      console.log('📝 System instructions provided:', instructions.length, 'chars');
    }

    this.config = {
      ...config,
      instructions, // Use the resolved value (prefer instructions over systemInstructionOverride)
      systemInstructionOverride: instructions, // Keep for backward compatibility
      floatingCursor: floatingCursorConfig
    };
    
    // Set initial context if provided in config
    if (config.initialContext !== undefined) {
      this.context = config.initialContext;
      console.log('📝 [VowelClient] Initial context set from config:', config.initialContext);
    }
    this.toolManager = new ToolManager();
    this.stateManager = new StateManager();
    
    // Initialize AudioManager with speaking state callback
    this.audioManager = new AudioManager({
      onAISpeakingChange: (isSpeaking) => {
        this.stateManager.setAISpeaking(isSpeaking);
        config.onAISpeakingChange?.(isSpeaking);
      },
    });
    
    // Initialize TypingSoundManager if enabled
    const typingSoundsConfig = config.typingSounds;
    if (typingSoundsConfig?.enabled !== false) {
      // Enabled by default unless explicitly disabled
      this.typingSoundManager = new TypingSoundManager(
        {
          enabled: typingSoundsConfig?.enabled ?? true,
          volume: typingSoundsConfig?.volume,
          typingSoundUrl: typingSoundsConfig?.typingSoundUrl,
          clickSoundUrl: typingSoundsConfig?.clickSoundUrl,
          minSegmentDurationMs: typingSoundsConfig?.minSegmentDurationMs,
          maxSegmentDurationMs: typingSoundsConfig?.maxSegmentDurationMs,
          minPauseDurationMs: typingSoundsConfig?.minPauseDurationMs,
          maxPauseDurationMs: typingSoundsConfig?.maxPauseDurationMs,
          clickSoundProbability: typingSoundsConfig?.clickSoundProbability,
        },
        this.audioManager
      );
    }
    
    // Initialize action notifier (centralized notification system)
    this.actionNotifier = ActionNotifier.getInstance();
    
    // Initialize dark mode manager (always enabled for UI components)
    const storagePrefix = config.darkMode?.storageKeyPrefix || config.appId || 'vowel';
    this.darkModeManager = new DarkModeManager(storagePrefix);
    
    // Set initial dark mode state if explicitly provided in config
    if (config.darkMode?.enabled !== undefined) {
      this.darkModeManager.setIsDark(config.darkMode.enabled);
    }
    // Otherwise, it will follow system preference (handled by DarkModeManager)
    
    this._routes = config.routes || [];

    // Handle adapters (new dual adapter architecture)
    this.navigationAdapter = config.navigationAdapter;
    this.automationAdapter = config.automationAdapter;

    // Legacy router support (backward compatibility)
    if (config.router) {
      console.warn('⚠️  Using deprecated "router" property. Please migrate to "navigationAdapter" for the new dual-adapter architecture.');
      this.legacyRouter = config.router;
      
      // Auto-detect routes from legacy router if not provided
      if (this._routes.length === 0 && config.router.getRoutes) {
        this._routes = config.router.getRoutes();
      }
    }

    // Load routes from navigation adapter if available
    if (this.navigationAdapter?.getRoutes && this._routes.length === 0) {
      this.navigationAdapter.getRoutes().then(routes => {
        if (routes.length > 0) {
          this._routes = routes;
          console.log(`🧭 Loaded ${routes.length} routes from navigation adapter`);
        }
      });
    }

    // Initialize session manager with configuration
    this.sessionManager = new SessionManager({
      appId: this.config.appId,
      routes: this._routes,
      toolManager: this.toolManager,
      audioManager: this.audioManager,
      typingSoundManager: this.typingSoundManager,
      voiceConfig: config.voiceConfig,
      instructions: instructions, // Use resolved instructions
      systemInstructionOverride: instructions, // Keep for backward compatibility
      convexUrl: config.convexUrl,
      tokenEndpoint: config.tokenEndpoint,
      tokenProvider: config.tokenProvider,
      onMessage: async (message) => {
        await this.handleMessage(message);
      },
      onStatusUpdate: (status) => {
        this.stateManager.updateState({ status });
      },
      onOpen: () => {
        this.stateManager.updateState({
          isConnected: true,
          isConnecting: false,
          isResuming: false, // Clear resuming flag when connected
          isHibernated: false,
        });
      },
      onClose: (reason) => {
        // Categorize close reason for better user feedback
        let closeCategory: 'timeout' | 'error' | 'client_disconnect' | 'network' | 'hibernation' | 'unknown';
        let userMessage: string;
        
        const reasonLower = reason.toLowerCase();
        
        if (reasonLower.includes('hibernat') || reasonLower.includes('sleep')) {
          closeCategory = 'hibernation';
          userMessage = 'Sleeping...';
        } else if (reasonLower.includes('timeout') || reasonLower.includes('idle') || reasonLower.includes('duration') || reasonLower.includes('no speech')) {
          closeCategory = 'timeout';
          userMessage = reason.includes('Maximum call duration') 
            ? 'Session ended: Maximum call duration reached'
            : reason.includes('No speech detected') || reason.includes('idle')
            ? 'Session ended: No speech detected'
            : `Session ended: ${reason}`;
        } else if (reasonLower.includes('error') || reasonLower.includes('failed') || reasonLower.includes('tts') || reasonLower.includes('stt') || reasonLower.includes('llm')) {
          closeCategory = 'error';
          userMessage = `Connection error: ${reason}`;
        } else if (reasonLower.includes('disconnect') || reasonLower.includes('closed')) {
          closeCategory = 'client_disconnect';
          userMessage = 'Session disconnected';
        } else if (reasonLower.includes('network') || reasonLower.includes('connection')) {
          closeCategory = 'network';
          userMessage = 'Network connection lost';
        } else {
          closeCategory = 'unknown';
          userMessage = `Disconnected: ${reason}`;
        }
        
        console.log(`🔌 [VowelClient] Session closed by provider`, {
          reason,
          category: closeCategory,
          userMessage,
        });

        const currentState = this.stateManager.getState();
        const closedDuringInitialConnect = currentState.isConnecting && !currentState.isConnected;
        
        // Perform full cleanup when WebSocket is closed by server
        // This ensures VAD and microphone are stopped even on unexpected disconnects
        if (closedDuringInitialConnect) {
          console.log("ℹ️ [VowelClient] Provider closed during initial connect; deferring cleanup to failed connect handling");
        } else {
          this.performCleanup();
        }
        
        // Clear all speaking states when connection closes unexpectedly
        this.stateManager.updateState({
          isConnected: false,
          isConnecting: false,
          status: userMessage,
          isUserSpeaking: false,
          isAIThinking: false,
          isToolExecuting: false,
          isAISpeaking: false,
          isHibernated: closeCategory === 'hibernation',
        });
      },
      onError: (error: any) => {
        // Extract error message - handle nested error structures
        let errorMessage: string;
        let errorDetails: any;
        
        if (error instanceof Error) {
          // Check if there's a rawError attached (from providers like VowelPrime)
          if ((error as any).rawError) {
            const rawError = (error as any).rawError;
            errorDetails = rawError;
            
            // Extract message from nested structure: error.error.error.message or error.error.message or error.message
            errorMessage = 
              rawError.error?.error?.message ||
              rawError.error?.message ||
              rawError.message ||
              error.message ||
              'Session error';
          } else {
            // Standard Error object - include name, stack, and cause
            errorMessage = error.message;
            errorDetails = {
              name: error.name,
              message: error.message,
              stack: error.stack,
              ...(error as any).cause ? { cause: (error as any).cause } : {},
            };
          }
        } else {
          // Not an Error object - use as-is
          errorMessage = String(error);
          errorDetails = error;
        }
        
        // Check if session is actually connected BEFORE updating state
        // (we need to check before state update since we're setting isConnected=false)
        const currentState = this.stateManager.getState();
        const wasConnected = currentState.isConnected;
        const wasConnecting = currentState.isConnecting && !currentState.isConnected;
        
        // Store error in state for UI display
        this.stateManager.updateState({
          isConnected: false,
          isConnecting: false,
          status: `Error: ${errorMessage}`,
          error: {
            message: errorMessage,
            details: errorDetails,
            timestamp: new Date(),
          },
        });
        
        // Force disconnect the session when error occurs
        if (wasConnected) {
          console.log("🛑 [VowelClient] Error detected - forcing session disconnect...");
          // Fire-and-forget: don't await to avoid blocking error handling
          // stopSession() will handle all cleanup (VAD, audio, provider disconnect, etc.)
          this.stopSession().catch((disconnectError) => {
            console.error("❌ [VowelClient] Error during forced disconnect:", disconnectError);
          });
        } else if (wasConnecting) {
          console.log("ℹ️ [VowelClient] Error detected during initial connect; deferring cleanup to failed connect handling");
        } else {
          // Session not connected, but still perform cleanup for any lingering resources
          console.log("🧹 [VowelClient] Error detected but session not connected - performing cleanup...");
          
          // Stop typing sounds and any outstanding actions when error occurs
          if (this.typingSoundManager) {
            this.typingSoundManager.cleanup();
          }
          
          // Stop all audio playback (including typing sounds)
          this.audioManager.stopAllAudio();
          this.audioManager.stopTypingSounds();
          
          // Clear AI thinking state (which stops typing sounds)
          this.stateManager.setAIThinking(false);
          this.stateManager.setToolExecuting(false);
          this.stateManager.setAISpeaking(false);
          this.stateManager.setUserSpeaking(false);
          
          // Hide border glow and return cursor to resting
          if (this.borderGlowManager) {
            this.borderGlowManager.hide();
          }
          
          if (this.floatingCursorManager?.isActive()) {
            this.floatingCursorManager.showResting('Error occurred');
          }
          
          // Notify ready state
          this.actionNotifier.notifyReady('Ready');
        }
      },
      onUserSpeakingChange: (isSpeaking) => {
        this.stateManager.setUserSpeaking(isSpeaking);
        config.onUserSpeakingChange?.(isSpeaking);
      },
      onAIThinkingChange: (isThinking) => {
        this.stateManager.setAIThinking(isThinking);
        config.onAIThinkingChange?.(isThinking);
      },
      onToolExecutingChange: (isExecuting) => {
        this.stateManager.setToolExecuting(isExecuting);
        config.onToolExecutingChange?.(isExecuting);
      },
      onAISpeakingChange: (isSpeaking) => {
        this.stateManager.setAISpeaking(isSpeaking);
        config.onAISpeakingChange?.(isSpeaking);
      },
      // Transcript event callback for caption system
      onTranscriptEvent: (event) => {
        // Emit to transcript event listeners
        this.transcriptEventListeners.forEach(listener => {
          try {
            listener(event);
          } catch (error) {
            console.error('❌ Error in transcript event listener:', error);
          }
        });
      },
      // Hibernation state change callback
      onHibernationChange: (isHibernated) => {
        this.stateManager.setHibernated(isHibernated);
      },
    });

    // Initialize floating cursor if enabled (enabled by default)
    if (this.config.floatingCursor?.enabled) {
      // Check if we're in a React context (set by FloatingCursorProvider)
      const reactContext = (window as any).__vowelFloatingCursorContext;
      
      if (reactContext) {
        console.log('🎯 [VowelClient] Detected React context - using React mode for floating cursor');
        this.floatingCursorManager = new FloatingCursorManager(
          this.config.floatingCursor,
          reactContext // Pass context, mode auto-detected
        );
      } else {
        console.log('🎯 [VowelClient] No React context - using web component mode for floating cursor');
        this.floatingCursorManager = new FloatingCursorManager(
          this.config.floatingCursor
          // No context, mode auto-detected as web-component
        );
        
        // Set globally for navigation tool access (web component mode only)
        (window as any).__vowelFloatingCursorManager = this.floatingCursorManager;
        console.log('🎯 [VowelClient] Floating cursor manager set on window for navigation tool access');
      }
      
      // Attach cursor manager to automation adapter if available
      if (this.automationAdapter && 'setFloatingCursorManager' in this.automationAdapter) {
        (this.automationAdapter as any).setFloatingCursorManager(this.floatingCursorManager);
      }
      
      // Subscribe cursor to action notifier
      this.actionNotifier.subscribe((notification) => {
        if (!this.floatingCursorManager) return;
        
        if (notification.position) {
          this.floatingCursorManager.showAt({
            x: notification.position.x,
            y: notification.position.y,
            text: notification.message,
            isIdle: notification.isIdle,
          });
        } else if (notification.targetElementId) {
          this.floatingCursorManager.trackElement(
            notification.targetElementId,
            notification.message,
            notification.isIdle
          );
        } else if (notification.type === 'search') {
          this.floatingCursorManager.showSearching(notification.message.replace('Searching: ', ''));
        } else if (notification.type === 'ready') {
          this.floatingCursorManager.showResting(notification.message);
        }
      });
    }

    // Initialize border glow if enabled
    if (config.borderGlow?.enabled) {
      this.borderGlowManager = new BorderGlowManager(config.borderGlow);
      console.log('✨ [VowelClient] Border glow initialized');
    }

    // Initialize floating action pill if enabled
    if (config.actionPill?.enabled) {
      // Check if mobile-only mode and if we're on mobile
      const shouldEnable = !config.actionPill.mobileOnly || isMobileOrTablet();
      
      if (shouldEnable) {
        this.actionPillManager = new FloatingActionPillManager(config.actionPill);
        
        // Subscribe to action notifier
        this.actionNotifier.subscribe((notification) => {
          if (this.actionPillManager) {
            this.actionPillManager.show(notification);
          }
        });
        
        console.log('💊 [VowelClient] Floating action pill initialized');
      } else {
        console.log('💊 [VowelClient] Floating action pill skipped (mobile-only mode, not on mobile)');
      }
    }

    // Setup integration between navigation adapter and voice session for controlled tabs
    if (this.navigationAdapter && 'setStopVoiceSessionCallback' in this.navigationAdapter) {
      // Allow controlled tabs to stop the voice session via the navigation adapter
      (this.navigationAdapter as any).setStopVoiceSessionCallback(() => {
        console.log('🛑 [VowelClient] Stop voice session request from controlled tab');
        this.stopSession();
      });
      
      // Allow controlled tabs to request current voice state
      if ('setRequestVoiceStateCallback' in this.navigationAdapter) {
        (this.navigationAdapter as any).setRequestVoiceStateCallback(() => {
          const state = this.stateManager.getState();
          console.log('🎤 [VowelClient] Voice state requested from controlled tab:', state);
          return {
            isConnected: state.isConnected,
            isConnecting: state.isConnecting,
            isUserSpeaking: state.isUserSpeaking,
            isAISpeaking: state.isAISpeaking,
            isAIThinking: state.isAIThinking,
            isResuming: state.isResuming || false
          };
        });
      }
      
      // Subscribe to state changes and broadcast to controlled tabs
      this.onStateChange((state) => {
        if ('broadcastVoiceState' in this.navigationAdapter!) {
          (this.navigationAdapter as any).broadcastVoiceState({
            isConnected: state.isConnected,
            isConnecting: state.isConnecting,
            isUserSpeaking: state.isUserSpeaking,
            isAISpeaking: state.isAISpeaking,
            isAIThinking: state.isAIThinking,
            isResuming: state.isResuming || false
          });
        }
      });
      
      console.log('🔗 [VowelClient] Integrated navigation adapter with voice session state broadcasting');
    }

    // Auto-register built-in actions based on available adapters
    this.registerBuiltInActions();
  }

  /**
   * Register built-in actions based on available adapters
   */
  private registerBuiltInActions(): void {
    console.log('🔧 Registering built-in actions...');

    // Navigation actions (if navigation adapter is available)
    // if (this.navigationAdapter) {
    //   console.log('   🧭 Registering navigation actions');

    //   this.registerAction('navigate_to_page', {
    //     description: 'Navigate to a specific page or route',
    //     parameters: {
    //       path: {
    //         type: 'string',
    //         description: 'The path to navigate to (e.g., "/products", "/cart")'
    //       },
    //       reason: {
    //         type: 'string',
    //         description: 'Brief explanation of why you are navigating (e.g., "User asked to view products", "Going to checkout")',
    //         optional: false  // REQUIRED - AI must provide reasoning
    //       }
    //     }
    //   }, async (params) => {
    //     // Show cursor with AI's reasoning BEFORE navigation
    //     if (this.floatingCursorManager?.isActive()) {
    //       this.floatingCursorManager.showAt({
    //         x: 50,  // Center of screen
    //         y: 50,
    //         text: params.reason || `Navigating to ${params.path}`,
    //         isIdle: false
    //       });
    //     }
        
    //     await this.navigationAdapter!.navigate(params.path);
        
    //     // Note: Cursor will be reinitialized in the new page after navigation
    //     return {
    //       success: true,
    //       message: `Navigated to ${params.path}`,
    //       path: params.path,
    //       reason: params.reason
    //     };
    //   });
    // }

    // Automation actions (if automation adapter is available)
    if (this.automationAdapter) {
      console.log('   🤖 Registering automation actions');

      this.registerAction('search_page_elements', {
        description: '⚠️ DEPRECATED: This tool now redirects to get_page_snapshot(). Always use get_page_snapshot() instead.\n\n[DEPRECATED - USE get_page_snapshot() INSTEAD]\nThis tool has been replaced with get_page_snapshot() which provides a full page view.\nAny call to search_page_elements will automatically redirect to get_page_snapshot().',
        parameters: {
          query: {
            type: 'string',
            description: '[DEPRECATED] This parameter is ignored. Use get_page_snapshot() instead.',
            optional: true
          },
          maxResults: {
            type: 'number',
            description: '[DEPRECATED] This parameter is ignored. Use get_page_snapshot() instead.',
            optional: true
          }
        }
      }, async (_params) => {
        // Redirect to getPageSnapshot
        console.warn('⚠️ [VowelClient] search_page_elements() is DEPRECATED - redirecting to get_page_snapshot()');
        const snapshot = await this.automationAdapter!.getPageSnapshot();
        return {
          success: true,
          snapshot,
          _deprecationNotice: 'search_page_elements is deprecated. Use get_page_snapshot instead.'
        };
      });

      this.registerAction('get_page_snapshot', {
        description: '⭐ PRIMARY TOOL - ALWAYS USE THIS FIRST ⭐\n\nGet a compressed view of ALL interactive and visible elements on the page.\n\nCRITICAL: You MUST call get_page_snapshot() BEFORE any other DOM interaction.\nThis is the ONLY way to discover what elements are available on the page.\n\nReturns: Compressed snapshot showing element IDs, tags, text content, placeholders, aria-labels, etc.\nFormat: id|tag|text|value|placeholder|aria|flags (pipe-separated for compactness)\n\nOnce you have the snapshot:\n1. Search through the returned elements to find what you need\n2. Use the element\'s spoken ID (e.g., "apple_banana") with click_element, type_into_element, etc.\n\nWORKFLOW:\n1. User: "Click the add to cart button"\n2. AI: Call get_page_snapshot() → Get all elements\n3. AI: Find element with text "add to cart" in snapshot results\n4. AI: Use that element\'s ID with click_element({elementId: "apple_banana"})\n\nDO NOT attempt to interact with elements without calling get_page_snapshot first!',
        parameters: {}
      }, async () => {
        const snapshot = await this.automationAdapter!.getPageSnapshot();
        return {
          success: true,
          snapshot
        };
      });

      this.registerAction('click_element', {
        description: 'Click an element on the page. ALWAYS provide a concise action description.',
        parameters: {
          elementId: {
            type: 'string',
            description: 'Element ID from search results (e.g., "apple_banana")'
          },
          reason: {
            type: 'string',
            description: 'REQUIRED: Concise action description in past tense (e.g., "Clicked search button", "Opened menu", "Submitted form"). Keep it SHORT - maximum 4-5 words. This will be shown to the user.',
            optional: false
          }
        }
      }, async (params) => {
        const result = await this.automationAdapter!.clickElement(params.elementId, params.reason);
        return {
          ...result,
          elementId: params.elementId,
          reason: params.reason
        };
      });

      this.registerAction('type_into_element', {
        description: 'Type text into an input element. ALWAYS provide a concise action description.',
        parameters: {
          elementId: {
            type: 'string',
            description: 'Element ID from search results'
          },
          text: {
            type: 'string',
            description: 'Text to type'
          },
          reason: {
            type: 'string',
            description: 'REQUIRED: Concise action description in past tense (e.g., "Entered search term", "Typed email address", "Filled shipping info"). Keep it SHORT - maximum 4-5 words. This will be shown to the user.',
            optional: false
          }
        }
      }, async (params) => {
        const result = await this.automationAdapter!.typeIntoElement(params.elementId, params.text, params.reason);
        return {
          ...result,
          elementId: params.elementId,
          text: params.text,
          reason: params.reason
        };
      });

      this.registerAction('focus_element', {
        description: 'Focus an element on the page. ALWAYS provide a concise action description.',
        parameters: {
          elementId: {
            type: 'string',
            description: 'Element ID from search results'
          },
          reason: {
            type: 'string',
            description: 'REQUIRED: Concise action description in past tense (e.g., "Focused search field", "Activated dropdown", "Selected input"). Keep it SHORT - maximum 4-5 words. This will be shown to the user.',
            optional: false
          }
        }
      }, async (params) => {
        const result = await this.automationAdapter!.focusElement(params.elementId, params.reason);
        return {
          ...result,
          elementId: params.elementId,
          reason: params.reason
        };
      });

      this.registerAction('scroll_to_element', {
        description: 'Scroll to an element on the page. ALWAYS provide a concise action description.',
        parameters: {
          elementId: {
            type: 'string',
            description: 'Element ID from search results'
          },
          reason: {
            type: 'string',
            description: 'REQUIRED: Concise action description in past tense (e.g., "Scrolled to element", "Brought into view", "Showed content"). Keep it SHORT - maximum 4-5 words. This will be shown to the user.',
            optional: false
          }
        }
      }, async (params) => {
        const result = await this.automationAdapter!.scrollToElement(params.elementId, params.reason);
        return {
          ...result,
          elementId: params.elementId,
          reason: params.reason
        };
      });

      this.registerAction('press_key', {
        description: 'Press a keyboard key. ALWAYS provide a concise action description.',
        parameters: {
          key: {
            type: 'string',
            description: 'Key name (e.g., "Enter", "Escape", "Tab")',
            enum: ['Enter', 'Escape', 'Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
          },
          reason: {
            type: 'string',
            description: 'REQUIRED: Concise action description in past tense (e.g., "Pressed Enter", "Closed modal", "Submitted search"). Keep it SHORT - maximum 4-5 words. This will be shown to the user.',
            optional: false
          }
        }
      }, async (params) => {
        const result = await this.automationAdapter!.pressKey(params.key, params.reason);
        return {
          ...result,
          key: params.key,
          reason: params.reason
        };
      });
    }

    const actionCount = Object.keys(this.toolManager.getToolDefinitions()).length;
    console.log(`✅ Registered ${actionCount} built-in actions`);
  }

  // ========================================
  // Public Getters
  // ========================================

  /**
   * Get app ID
   */
  get appId(): string | undefined {
    return this.config.appId;
  }

  /**
   * Get router adapter (legacy)
   * @deprecated Use navigationAdapter property instead
   */
  get router(): RouterAdapter | undefined {
    return this.legacyRouter;
  }

  /**
   * Get configured routes
   */
  get routes(): VowelRoute[] {
    return this._routes;
  }

  /**
   * Get session manager (for internal use by action handlers)
   */
  get session(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Get voice configuration
   */
  get voiceConfig(): VowelVoiceConfig | undefined {
    return this.config.voiceConfig;
  }

  /**
   * Get system instruction override
   */
  get systemInstructionOverride(): string | undefined {
    return this.config.systemInstructionOverride;
  }

  /**
   * Get current session state
   */
  get state(): VoiceSessionState {
    return this.stateManager.getState();
  }

  /**
   * Check if user is currently speaking (client-side VAD)
   */
  isUserSpeaking(): boolean {
    return this.stateManager.getState().isUserSpeaking;
  }

  /**
   * Check if AI is currently thinking/processing
   */
  isAIThinking(): boolean {
    return this.stateManager.getState().isAIThinking;
  }

  /**
   * Check if AI is currently speaking
   */
  isAISpeaking(): boolean {
    return this.stateManager.getState().isAISpeaking;
  }

  /**
   * Get floating cursor manager (if enabled)
   */
  get floatingCursor(): FloatingCursorManager | undefined {
    return this.floatingCursorManager;
  }

  // ========================================
  // Action Registration
  // ========================================

  /**
   * Register a custom action that the AI can perform
   *
   * ⚠️ CRITICAL: Actions MUST be registered BEFORE calling startSession()!
   * Actions registered after the session starts will have NO EFFECT.
   * Tool definitions are sent to the server during session initialization.
   *
   * @param name - Action name (will be used as tool name)
   * @param definition - Action definition with parameters
   * @param handler - Function to execute when action is called
   *
   * @example
   * ```ts
   * // ✅ CORRECT - Register before starting session
   * vowel.registerAction('addToCart', {
   *   description: 'Add product to shopping cart',
   *   parameters: {
   *     productId: {
   *       type: 'string',
   *       description: 'Product ID'
   *     },
   *     quantity: {
   *       type: 'number',
   *       description: 'Quantity',
   *       optional: true
   *     }
   *   }
   * }, async ({ productId, quantity = 1 }) => {
   *   await addToCart(productId, quantity);
   * });
   * 
   * // Then start the session
   * await vowel.startSession();
   * 
   * // ❌ WRONG - Too late!
   * await vowel.startSession();
   * vowel.registerAction('addToCart', ...);  // Won't work!
   * ```
   */
  registerAction<T = any>(
    name: string,
    definition: VowelAction,
    handler: ActionHandler<T>
  ): void {
    this.toolManager.registerTool(name, definition, async (params: T) => {
      const result = await handler(params);
      return result || { success: true };
    });
  }

  /**
   * Register multiple actions at once
   *
   * @example
   * ```ts
   * vowel.registerActions({
   *   searchProducts: {
   *     definition: { ... },
   *     handler: async (params) => { ... }
   *   },
   *   addToCart: {
   *     definition: { ... },
   *     handler: async (params) => { ... }
   *   }
   * });
   * ```
   */
  registerActions(
    actions: Record<string, { definition: VowelAction; handler: ActionHandler }>
  ): void {
    for (const [name, { definition, handler }] of Object.entries(actions)) {
      this.registerAction(name, definition, handler);
    }
  }

  /**
   * Unregister an action
   */
  unregisterAction(name: string): void {
    this.toolManager.unregisterTool(name);
  }

  /**
   * Get all registered actions as a record (for configuration)
   */
  getActionsConfig(): Record<string, VowelAction> {
    return this.toolManager.getToolDefinitions();
  }

  /**
   * Execute a registered action
   */
  async executeAction(name: string, params: any): Promise<ToolResult> {
    // Create tool context
    // Use navigation adapter as router if available (dual-adapter pattern)
    const context: ToolContext = {
      router: this.legacyRouter || this.router || (this.navigationAdapter as any),
      routes: this._routes,
      currentPath: this.getCurrentPath(),
    };

    return await this.toolManager.executeTool(name, params, context);
  }

  /**
   * Check if an action is registered
   */
  hasAction(name: string): boolean {
    return this.toolManager.hasTool(name);
  }

  // ========================================
  // Route Management
  // ========================================

  /**
   * Add routes (useful for dynamic route registration)
   */
  addRoutes(routes: VowelRoute[]): void {
    this._routes.push(...routes);
  }

  /**
   * Set routes (replaces existing)
   */
  setRoutes(routes: VowelRoute[]): void {
    this._routes = routes;
  }

  /**
   * Get current path
   */
  getCurrentPath(): string {
    if (this.navigationAdapter) {
      return this.navigationAdapter.getCurrentPath();
    }
    if (this.legacyRouter) {
      return this.legacyRouter.getCurrentPath();
    }
    return window.location.pathname;
  }

  /**
   * Navigate to a path
   */
  async navigate(path: string): Promise<void> {
    if (this.navigationAdapter) {
      await this.navigationAdapter.navigate(path);
    } else if (this.legacyRouter) {
      await this.legacyRouter.navigate(path);
    } else {
      console.warn('⚠️  No navigation adapter configured. Cannot navigate.');
    }
  }

  // ========================================
  // State Management
  // ========================================

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: VoiceSessionState) => void): () => void {
    return this.stateManager.subscribe(listener);
  }

  /**
   * @internal
   * Subscribe to transcript events for caption system (unofficial dev tool)
   * 
   * @param listener - Callback function to receive transcript events
   * @returns Unsubscribe function
   */
  onTranscriptEvent(listener: (event: {
    type: 'delta' | 'done';
    text: string;
    role: 'user' | 'assistant';
    responseId?: string;
    itemId?: string;
  }) => void): () => void {
    this.transcriptEventListeners.add(listener);
    return () => {
      this.transcriptEventListeners.delete(listener);
    };
  }

  /**
   * Get client configuration (read-only access)
   * @internal
   */
  getConfig(): VowelClientConfig {
    return this.config;
  }

  /**
   * Clear transcript history
   */
  clearTranscripts(): void {
    this.stateManager.clearTranscripts();
  }

  /**
   * Clear the current error state
   */
  clearError(): void {
    this.stateManager.clearError();
  }

  /**
   * Get current dark mode state
   */
  getDarkMode(): boolean {
    return this.darkModeManager?.getIsDark() ?? false;
  }

  /**
   * Set dark mode state
   */
  setDarkMode(isDark: boolean): void {
    this.darkModeManager?.setIsDark(isDark);
  }

  /**
   * Toggle dark mode
   */
  toggleDarkMode(): void {
    this.darkModeManager?.toggle();
  }

  /**
   * Export conversation state for later restoration
   * 
   * @param options - Export options
   * @param options.maxTurns - Maximum conversation turns to include (default: all)
   * @returns Serializable state object
   * 
   * @example
   * ```ts
   * // Save state to localStorage
   * const state = vowel.exportState({ maxTurns: 20 });
   * localStorage.setItem('vowel-conversation', JSON.stringify(state));
   * ```
   */
  exportState(options?: { maxTurns?: number }): VoiceSessionState {
    return this.stateManager.exportState(options);
  }

  /**
   * Import conversation state from a previous session
   * 
   * @param savedState - Previously exported state
   * 
   * @example
   * ```ts
   * // Restore state from localStorage
   * const saved = localStorage.getItem('vowel-conversation');
   * if (saved) {
   *   vowel.importState(JSON.parse(saved));
   * }
   * ```
   */
  importState(savedState: Partial<VoiceSessionState>): void {
    this.stateManager.importState(savedState);
  }

  // ========================================
  // Session Management
  // ========================================

  /**
   * Start a voice session
   * Content window should be opened before calling this (in click handler for Shopify)
   * Navigation is handled via BroadcastChannel, not WindowProxy
   * 
   * ⚠️ CRITICAL for iOS Safari: This method MUST be called directly from a user gesture
   * handler (click, touchstart, touchend). iOS Safari requires AudioContext creation and
   * getUserMedia() calls to happen within the same user gesture event handler.
   * 
   * ✅ Correct usage:
   * ```ts
   * button.addEventListener('click', async () => {
   *   await vowel.startSession(); // Called directly from click handler
   * });
   * ```
   * 
   * ❌ Incorrect usage (will fail on iOS):
   * ```ts
   * button.addEventListener('click', () => {
   *   setTimeout(() => {
   *     vowel.startSession(); // Too late - outside gesture handler
   *   }, 100);
   * });
   * ```
   * 
   * @param options - Session start options
   * @param options.restoreState - Previously exported state to restore conversation context
   * 
   * @example
   * ```ts
   * // Start fresh session
   * await vowel.startSession();
   * 
   * // Start with restored context
   * const saved = localStorage.getItem('vowel-conversation');
   * if (saved) {
   *   await vowel.startSession({ restoreState: JSON.parse(saved) });
   * }
   * ```
   */
  async startSession(options?: { restoreState?: Partial<VoiceSessionState> }): Promise<void> {
    try {
      console.log("🚀 Starting Vowel voice session...");
      
      // Import state if provided (before connection)
      if (options?.restoreState) {
        console.log("📥 Restoring conversation state...");
        this.stateManager.importState(options.restoreState);
      }
      
      // Using cross-tab navigation via BroadcastChannel
      this.stateManager.updateState({ 
        isConnecting: true,
        isResuming: false 
      });

      // Show border glow when session starts
      if (this.borderGlowManager) {
        this.borderGlowManager.show();
      }

      // Initialize audio contexts and load AudioWorklet
      await this.audioManager.initAudio();

      // Create tool context for session
      // Use navigation adapter as router if available (dual-adapter pattern)
      const toolContext: ToolContext = {
        router: this.legacyRouter || this.router || (this.navigationAdapter as any),
        routes: this._routes,
        currentPath: this.getCurrentPath(),
      };

      // Connect to session (with optional state restoration and initial context)
      await this.sessionManager.connect(toolContext, options?.restoreState, this.context);
    } catch (error: any) {
      try {
        await this.sessionManager.disconnect();
      } catch (disconnectError) {
        console.warn("⚠️ Failed to clean up partially initialized session after start failure:", disconnectError);
      }

      this.performCleanup();
      console.error("❌ Failed to start session:", error);
      this.stateManager.updateState({
        isConnecting: false,
        isResuming: false,
        status: `Error: ${error.message}`,
      });
    }
  }

  /**
   * Send a notification to the AI about an app event
   * This allows programmatic triggering of AI responses
   * 
   * @param eventType - Type of event (e.g., 'notification', 'resource_issue', 'session_start')
   * @param message - Human-readable message describing the event
   * @param data - Optional additional data/context
   * 
   * @example
   * ```ts
   * // Notify AI about a game event
   * vowel.notify('resource_issue', 'Low on wood', { wood: 5, required: 20 });
   * 
   * // Notify about session start
   * vowel.notify('session_start', 'Voice control is now active');
   * ```
   */
  async notify(eventType: string, message: string, data?: Record<string, any>): Promise<void> {
    const { isConnected } = this.stateManager.getState();
    if (!isConnected) {
      console.warn('⚠️ Cannot notify: Voice session not connected');
      return;
    }

    try {
      // Build event details with type and message
      const eventDetails = {
        type: eventType,
        message: message,
        ...data
      };

      // Send to session manager
      await this.sessionManager.notifyEvent(eventDetails, data);
    } catch (error) {
      console.error('❌ Failed to notify AI:', error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Perform cleanup of audio, VAD, and UI resources
   * Called both on manual stopSession() and on unexpected WebSocket close
   * @private
   */
  private performCleanup(): void {
    console.log("🧹 [VowelClient] Performing cleanup...");

    // Stop typing sounds
    if (this.typingSoundManager) {
      this.typingSoundManager.cleanup();
    }

    // Cleanup audio (stops microphone and closes audio contexts)
    this.audioManager.cleanup();

    // Hide border glow
    if (this.borderGlowManager) {
      this.borderGlowManager.hide();
    }

    // Return cursor to resting position
    if (this.floatingCursorManager?.isActive()) {
      this.floatingCursorManager.showResting('Ready');
      console.log('🎯 [VowelClient] Cursor returned to resting position');
    }

    // Notify action ready
    this.actionNotifier.notifyReady('Ready');

    console.log("✅ [VowelClient] Cleanup complete");
  }

  /**
   * Stop the current session
   */
  async stopSession(): Promise<void> {
    console.log("🛑 Stopping Vowel voice session...");

    // Set disconnecting state immediately for instant UI feedback
    this.stateManager.updateState({
      isDisconnecting: true,
      status: "Disconnecting...",
    });

    // Disconnect session first (this stops VAD and provider)
    await this.sessionManager.disconnect();

    // Perform cleanup (audio, UI, etc.)
    this.performCleanup();

    // Update state - clear all speaking states when session ends
    this.stateManager.updateState({
      isConnected: false,
      isConnecting: false,
      isDisconnecting: false,
      status: "Disconnected",
      isUserSpeaking: false,
      isAIThinking: false,
      isToolExecuting: false,
      isAISpeaking: false,
      isHibernated: false,
    });

    console.log("✅ Session stopped");
  }

  /**
   * Pause the current session (mute microphone, keep connection alive)
   * This is useful for temporarily stopping audio input without disconnecting
   * 
   * @example
   * ```ts
   * // Pause during a phone call
   * await vowel.pauseSession();
   * 
   * // Resume after the call
   * await vowel.resumeSession();
   * ```
   */
  async pauseSession(): Promise<void> {
    const { isConnected } = this.stateManager.getState();
    
    if (!isConnected) {
      console.warn("⚠️ Cannot pause: Session not connected");
      return;
    }

    console.log("⏸️ Pausing Vowel voice session...");
    
    // Mute audio input (stops sending to server)
    this.audioManager.setMuted(true);
    
    // Pause VAD (stops UI updates)
    if (this.sessionManager) {
      this.sessionManager.pauseVAD();
    }
    
    // Update state
    this.stateManager.updateState({
      status: "Paused",
    });

    console.log("✅ Session paused (microphone muted, connection maintained)");
  }

  /**
   * Resume a paused session (unmute microphone)
   * 
   * @example
   * ```ts
   * await vowel.resumeSession();
   * ```
   */
  async resumeSession(): Promise<void> {
    const { isConnected } = this.stateManager.getState();
    
    if (!isConnected) {
      console.warn("⚠️ Cannot resume: Session not connected");
      return;
    }

    console.log("▶️ Resuming Vowel voice session...");
    
    // Unmute audio input
    this.audioManager.setMuted(false);
    
    // Resume VAD
    if (this.sessionManager) {
      this.sessionManager.resumeVAD();
    }
    
    // Update state
    this.stateManager.updateState({
      status: "Connected - ready to listen",
    });

    console.log("✅ Session resumed");
  }

  /**
   * Toggle session on/off
   */
  async toggleSession(): Promise<void> {
    const { isConnected, isConnecting } = this.stateManager.getState();
    if (isConnected || isConnecting) {
      this.stopSession();
    } else {
      await this.startSession();
    }
  }

  // ========================================
  // Microphone Device Management
  // ========================================

  /**
   * Get available microphone devices
   * 
   * @param requirePermission - If true, request getUserMedia first to get device labels.
   *                            On iOS Safari, this MUST be called from a user gesture handler.
   * @returns Promise resolving to array of MediaDeviceInfo for available audio input devices
   * 
   * @example
   * ```ts
   * const devices = await vowel.getAvailableMicrophones();
   * console.log('Available microphones:', devices.map(d => d.label));
   * ```
   */
  async getAvailableMicrophones(requirePermission: boolean = false): Promise<MediaDeviceInfo[]> {
    return await this.audioManager.getAvailableDevices(requirePermission);
  }

  /**
   * Check if microphone permission has been granted
   * @returns Promise resolving to true if permission granted, false otherwise
   */
  async hasMicrophonePermission(): Promise<boolean> {
    return await this.audioManager.hasMicrophonePermission();
  }

  /**
   * Request microphone permission
   * MUST be called from a user gesture handler on iOS Safari
   * @returns Promise resolving to true if permission granted, false otherwise
   */
  async requestMicrophonePermission(): Promise<boolean> {
    return await this.audioManager.requestMicrophonePermission();
  }

  /**
   * Get the currently active microphone device
   * 
   * @returns MediaDeviceInfo for current device, or null if not available
   * 
   * @example
   * ```ts
   * const currentMic = vowel.getCurrentMicrophone();
   * if (currentMic) {
   *   console.log('Current microphone:', currentMic.label);
   * }
   * ```
   */
  getCurrentMicrophone(): MediaDeviceInfo | null {
    return this.audioManager.getCurrentDevice();
  }

  /**
   * Set microphone device preference
   * This will apply the device on the next microphone setup (next connection)
   * 
   * @param deviceId - The device ID to use
   * 
   * @example
   * ```ts
   * const devices = await vowel.getAvailableMicrophones();
   * const usbMic = devices.find(d => d.label.includes('USB'));
   * if (usbMic) {
   *   vowel.setMicrophoneDevice(usbMic.deviceId);
   * }
   * ```
   */
  setMicrophoneDevice(deviceId: string): void {
    // Store preference - will be used on next setupMicrophone call
    (this.audioManager as any).selectedDeviceId = deviceId;
    console.log(`📝 Microphone device preference set: ${deviceId}`);
  }

  /**
   * Switch microphone device during an active session
   * This will reinitialize the microphone stream with the new device
   * 
   * @param deviceId - The device ID to switch to
   * 
   * @example
   * ```ts
   * const devices = await vowel.getAvailableMicrophones();
   * const newMic = devices[1];
   * await vowel.switchMicrophoneDevice(newMic.deviceId);
   * ```
   */
  async switchMicrophoneDevice(deviceId: string): Promise<void> {
    const { isConnected } = this.stateManager.getState();
    
    if (!isConnected || !this.sessionManager) {
      console.warn("⚠️ Cannot switch device: Session not connected");
      // Still store the preference for next connection
      this.setMicrophoneDevice(deviceId);
      return;
    }

    // Get the provider from session manager
    const provider = (this.sessionManager as any).provider;
    if (!provider) {
      console.warn("⚠️ Cannot switch device: Provider not available");
      this.setMicrophoneDevice(deviceId);
      return;
    }

    console.log(`🔄 Switching microphone device to: ${deviceId}`);
    await this.audioManager.switchDevice(deviceId, provider);
    console.log("✅ Microphone device switched successfully");
  }

  // ========================================
  // Event Notifications
  // ========================================

  /**
   * Notify the AI about an app event
   * This allows programmatic triggering of AI voice responses without user speech input
   * 
   * @param eventDetails - Description of the event that occurred
   * @param context - Optional context object to provide additional information
   * 
   * @example
   * ```ts
   * // Simple notification
   * await vowel.notifyEvent('Order placed successfully!');
   * 
   * // Notification with context
   * await vowel.notifyEvent('New message received', {
   *   from: 'John Doe',
   *   preview: 'Hey, are you available?',
   *   timestamp: new Date().toISOString()
   * });
   * 
   * // Timer expiry notification
   * await vowel.notifyEvent('Your 5-minute timer has expired');
   * 
   * // Shopping cart update
   * await vowel.notifyEvent('Item added to cart', {
   *   productName: 'Wireless Headphones',
   *   price: 79.99,
   *   cartTotal: 3
   * });
   * ```
   */
  async notifyEvent(eventDetails: string, context?: Record<string, any>): Promise<void> {
    if (!this.state.isConnected) {
      console.warn('⚠️ Cannot notify event: Session not connected');
      throw new Error('Voice session is not active. Call startSession() first.');
    }

    return this.sessionManager.notifyEvent(eventDetails, context);
  }

  /**
   * Send text to the AI for processing
   * Lower-level method for custom text-based interactions
   * 
   * @param text - Text to send to the AI
   * 
   * @example
   * ```ts
   * // Ask a question programmatically
   * await vowel.sendText('What are the current promotions?');
   * 
   * // Provide context to the AI
   * await vowel.sendText('The user is looking at product ID 12345');
   * ```
   */
  async sendText(text: string): Promise<void> {
    if (!this.state.isConnected) {
      console.warn('⚠️ Cannot send text: Session not connected');
      throw new Error('Voice session is not active. Call startSession() first.');
    }

    return this.sessionManager.sendText(text);
  }

  /**
   * Send an image to the AI for processing
   * Enables multimodal interactions where the AI can see and respond to images
   * 
   * @param imageUrl - URL or data URI of the image to send
   * 
   * @example
   * ```ts
   * // Send an image URL
   * await vowel.sendImage('https://example.com/product.jpg');
   * 
   * // Send a data URI (e.g., from canvas or file upload)
   * await vowel.sendImage('data:image/png;base64,iVBORw0KGgoAAAANS...');
   * 
   * // Combined with text context
   * await vowel.sendText('What do you see in this image?');
   * await vowel.sendImage(imageUrl);
   * ```
   */
  async sendImage(imageUrl: string): Promise<void> {
    if (!this.state.isConnected) {
      console.warn('⚠️ Cannot send image: Session not connected');
      throw new Error('Voice session is not active. Call startSession() first.');
    }

    return this.sessionManager.sendImage(imageUrl);
  }

  // ========================================
  // Context Management
  // ========================================

  /**
   * Update the dynamic context that gets appended to system prompt.
   * Context is stringified, wrapped in `<context>` tags and sent via session.update.
   * 
   * When context changes, a session.update event is automatically sent
   * to update the system prompt so the AI knows about the current context.
   * 
   * @param context - Context object to append to system prompt. Use null to clear.
   * 
   * @example
   * ```ts
   * // Update context with current page info
   * vowel.updateContext({ page: 'product', productId: 'iphone-15-pro' });
   * 
   * // Update with multiple details
   * vowel.updateContext({ 
   *   page: 'checkout', 
   *   cartTotal: 199.99, 
   *   itemCount: 2 
   * });
   * 
   * // Clear context
   * vowel.updateContext(null);
   * ```
   */
  updateContext(context: Record<string, unknown> | null): void {
    const contextStr = context ? JSON.stringify(context) : 'null';
    
    console.log('📝 [VowelClient] Context update requested');
    console.log(`  Context: `, context);
    console.log(`  Context size: ${contextStr.length} chars`);
    
    this.context = context;
    
    // If session is active, send session.update immediately
    if (this.state.isConnected && this.sessionManager) {
      console.log('🚀 [VowelClient] Pushing context update to server (session active)');
      this.sessionManager.updateContext(context);
    } else {
      console.log('📝 [VowelClient] Context updated (will be applied on next session start)');
    }
  }

  /**
   * Get current context value
   * 
   * @returns Current context object (null if no context set)
   * 
   * @example
   * ```ts
   * const currentContext = vowel.getContext();
   * console.log('Current context:', currentContext);
   * ```
   */
  getContext(): Record<string, unknown> | null {
    return this.context;
  }

  // ========================================
  // Message Handling (Private)
  // ========================================

  /**
   * Handle Session messages from Gemini Live
   */
  private async handleMessage(message: any): Promise<void> {
    try {
      // Handle text content
      if (message.serverContent?.modelTurn) {
        const parts = message.serverContent.modelTurn.parts || [];

        // Extract text content
        const textParts = parts.filter((part: any) => part.text);
        if (textParts.length > 0) {
          const text = textParts.map((part: any) => part.text).join(" ");
          if (text.trim()) {
            console.log("💬 AI text response:", text.trim());
            this.stateManager.addTranscript({
              role: "assistant",
              text: text.trim(),
              timestamp: new Date(),
            });
          }
        }
      }
    } catch (error) {
      console.error("❌ Error handling message:", error);
    }
  }
}

// Export types for convenience
export type { RouterAdapter, ActionHandler };
export type VowelConfig = VowelClientConfig;
