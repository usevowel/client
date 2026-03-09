/**
 * Content Script UI
 * 
 * Main UI coordinator for content script that initializes and mounts
 * proxy UI components on the page using Shadow DOM.
 * 
 * @packageDocumentation
 */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ExtensionContentBridge } from './ExtensionContentBridge';
// import { ProxyFloatingButton } from './components/ProxyFloatingButton';
import { ProxyFloatingCursor } from './components/ProxyFloatingCursor';
import { BorderGlowManager } from '../../../ui/border-glow';
import { FloatingActionPillManager } from '../../../ui/FloatingActionPill';
import { ActionNotifier } from '../../../core/action-notifier';
import { isMobileOrTablet } from '../../../utils/device-detection';

/**
 * Configuration for content script UI
 */
export interface ContentScriptUIConfig {
  /** Button position on screen */
  buttonPosition?: { x: number; y: number };
  /** Whether to show connection status */
  showConnectionStatus?: boolean;
  /** Optional Vowel configuration */
  vowelConfig?: any;
}

/**
 * Main UI coordinator for content script
 * 
 * Initializes and mounts proxy UI components on the page using Shadow DOM
 * for style isolation.
 * 
 * @example
 * ```typescript
 * const ui = new ContentScriptUI({
 *   buttonPosition: { x: 20, y: 20 },
 *   showConnectionStatus: true,
 * });
 * ```
 */
export class ContentScriptUI {
  private bridge: ExtensionContentBridge;
  private root: ShadowRoot | null = null;
  private reactRoot: Root | null = null;
  private container: HTMLElement | null = null;
  private config: ContentScriptUIConfig;
  private borderGlowManager: BorderGlowManager | null = null;
  private actionPillManager: FloatingActionPillManager | null = null;

  constructor(config: ContentScriptUIConfig = {}) {
    this.config = config;
    this.bridge = new ExtensionContentBridge();
    this.initialize();
  }

  /**
   * Initialize UI components
   */
  private initialize(): void {
    console.log('config', this.config);
    
    // Initialize border glow (enabled by default in extension mode)
    this.borderGlowManager = new BorderGlowManager({
      enabled: true,
      color: 'rgba(99, 102, 241, 0.5)',
      intensity: 30,
      pulse: true,
    });
    
    // Initialize action pill if appropriate
    const shouldShowPill = !isMobileOrTablet(); // Show on desktop by default in extension mode
    if (shouldShowPill) {
      this.actionPillManager = new FloatingActionPillManager({
        enabled: true,
        bottomOffset: 24,
        autoHideDelay: 3000,
        mobileOnly: false,
      });
      
      // Subscribe to action notifier
      const actionNotifier = ActionNotifier.getInstance();
      actionNotifier.subscribe((notification) => {
        if (this.actionPillManager) {
          this.actionPillManager.show(notification);
        }
      });
      
      console.log('💊 [ContentScriptUI] Floating action pill initialized');
    }
    
    // Listen for voice session state changes to show/hide border glow
    // Only show when AI is actively thinking/acting, not just connected
    this.bridge.onStateUpdate((state) => {
      if (this.borderGlowManager) {
        // Show border only when AI is actively thinking (executing tools/actions)
        // or when AI is speaking (delivering response)
        if (state.isAIThinking || state.isSpeaking) {
          this.borderGlowManager.show();
          console.log('✨ [ContentScriptUI] Border glow shown (AI is controlling)');
        } else {
          this.borderGlowManager.hide();
          console.log('✨ [ContentScriptUI] Border glow hidden (AI idle)');
        }
      }
    });
    
    // Create container element
    this.container = document.createElement('div');
    this.container.id = 'vowel-extension-ui';
    document.body.appendChild(this.container);

    // Create shadow root for style isolation
    this.root = this.container.attachShadow({ mode: 'open' });

    // Inject styles
    this.injectStyles();

    // Mount React components
    this.mountComponents();

    // Setup cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    console.log('✅ Vowel content script UI initialized (with border glow and action pill)');
  }

  /**
   * Mount React components in shadow root
   */
  private mountComponents(): void {
    if (!this.root) return;

    const mountPoint = document.createElement('div');
    this.root.appendChild(mountPoint);

    // Create React root and render components
    // NOTE: Only rendering floating cursor for now. The microphone button
    // must be in the side panel for proper getUserMedia() user gesture handling.
    this.reactRoot = createRoot(mountPoint);
    this.reactRoot.render(
      <React.StrictMode>
        {/* Microphone button disabled - must be in side panel for mic permissions */}
        {/* <ProxyFloatingButton
          bridge={this.bridge}
          config={this.config.vowelConfig}
          position={this.config.buttonPosition}
        /> */}
        <ProxyFloatingCursor bridge={this.bridge} />
      </React.StrictMode>
    );

    console.log('✅ Proxy UI components mounted (cursor only)');
  }

  /**
   * Inject styles into shadow root
   * Including critical Tailwind utilities for FloatingMicButton
   */
  private injectStyles(): void {
    if (!this.root) return;

    const styleElement = document.createElement('style');
    styleElement.textContent = `
      /* Base resets */
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      :host {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      /* Critical Tailwind utilities for FloatingMicButton */
      .relative { position: relative; }
      .absolute { position: absolute; }
      .inset-0 { inset: 0; }
      .flex { display: flex; }
      .items-center { align-items: center; }
      .justify-center { justify-content: center; }
      .rounded-2xl { border-radius: 1rem; }
      .border-2 { border-width: 2px; }
      .overflow-hidden { overflow: hidden; }
      .pointer-events-none { pointer-events: none; }
      .cursor-pointer { cursor: pointer; }
      .text-white { color: white; }
      .transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
      .duration-300 { transition-duration: 300ms; }
      .ease-in-out { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
      .backdrop-blur-sm { backdrop-filter: blur(4px); }
      .opacity-40 { opacity: 0.4; }
      .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--tw-gradient-stops)); }
      .z-10 { z-index: 10; }

      /* Animations */
      @keyframes ping-effect {
        75%, 100% { transform: scale(2); opacity: 0; }
      }
      .animate-ping-effect {
        animation: ping-effect 1s cubic-bezier(0, 0, 0.2, 1) infinite;
      }
      
      @keyframes breathe {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 0.8; }
      }
      .animate-breathe {
        animation: breathe 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes vowel-fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes vowel-fade-out {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
      }
    `;
    this.root.appendChild(styleElement);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    console.log('Cleaning up Vowel content script UI');

    // Cleanup border glow manager
    if (this.borderGlowManager) {
      this.borderGlowManager.hide();
      this.borderGlowManager = null;
    }

    // Cleanup action pill manager
    if (this.actionPillManager) {
      // Note: FloatingActionPillManager doesn't have a destroy method yet,
      // but we can just null it and let React cleanup handle it
      this.actionPillManager = null;
    }

    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = null;
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
    }

    this.root = null;
    // Note: ExtensionContentBridge doesn't require cleanup as it only has listeners
  }

  /**
   * Get bridge instance for external access
   * 
   * @returns Extension content bridge
   */
  getBridge(): ExtensionContentBridge {
    return this.bridge;
  }

  /**
   * Check if UI is initialized
   * 
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.root !== null && this.reactRoot !== null;
  }
}

