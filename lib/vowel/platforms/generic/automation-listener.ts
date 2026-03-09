/**
 * @fileoverview Automation Listener for Controlled Tabs
 * 
 * This listener runs in controlled tabs (e.g., product pages opened by voice agent)
 * and handles automation commands sent via BroadcastChannel.
 * 
 * @module @vowel.to/client/platforms/generic/automation-listener
 * @author vowel.to
 * @license Proprietary
 */

import { createControlledAutomationListener } from '../../adapters/automation/controlled-automation-adapter';

/**
 * Global flag to prevent duplicate initialization
 */
let isAutomationListenerInitialized = false;

/**
 * Cleanup function for the automation listener
 */
let automationListenerCleanup: (() => void) | null = null;

/**
 * Set the floating cursor manager for the automation listener
 * This should be called before initializing the listener.
 * Sets the manager on the window object so the listener can access it.
 */
export function setAutomationListenerCursorManager(manager: any): void {
  (window as any).__vowelFloatingCursorManager = manager;
  console.log('🎯 [AutomationListener] Floating cursor manager set on window');
}

/**
 * Initialize the automation listener for controlled tabs
 * 
 * This function should be called automatically when a controlled tab is detected.
 * It sets up the automation listener to receive and execute DOM automation commands.
 * 
 * @param channelName - Optional custom channel name (default: 'vowel-automation')
 * @returns Cleanup function to remove the listener
 * 
 * @example
 * ```ts
 * // Automatically called when tab is detected as controlled
 * initializeAutomationListener();
 * 
 * // Or with custom channel
 * initializeAutomationListener('vowel-shopify-automation');
 * ```
 */
export function initializeAutomationListener(channelName: string = 'vowel-automation'): () => void {
  // Prevent duplicate initialization
  if (isAutomationListenerInitialized) {
    console.log('📡 [AutomationListener] Already initialized, skipping...');
    return automationListenerCleanup || (() => {});
  }

  console.log('📡 [AutomationListener] Initializing for controlled tab...');
  console.log(`   Channel: ${channelName}`);

  try {
    // Create the automation listener
    const cleanup = createControlledAutomationListener(channelName);
    
    // Store cleanup function and set flag
    automationListenerCleanup = cleanup;
    isAutomationListenerInitialized = true;

    console.log('✅ [AutomationListener] Automation listener ready');
    console.log('   This tab can now receive automation commands');
    
    // Return cleanup function
    return () => {
      if (cleanup) {
        cleanup();
        isAutomationListenerInitialized = false;
        automationListenerCleanup = null;
        console.log('🧹 [AutomationListener] Cleaned up');
      }
    };
  } catch (error) {
    console.error('❌ [AutomationListener] Failed to initialize:', error);
    return () => {};
  }
}

/**
 * Check if this tab is controlled by a voice agent
 * 
 * A controlled tab is one that was opened by the voice agent and should
 * listen for automation commands.
 * 
 * Detection methods:
 * 1. URL parameter: ?vowel_controlled=true
 * 2. Session storage: vowel-controlled=true
 * 3. Window name: vowel-content-*
 * 
 * @returns True if this tab is controlled
 */
export function isControlledTab(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const hasControlledParam = urlParams.get('vowel_controlled') === 'true';

  // Check session storage
  const hasControlledSession = sessionStorage.getItem('vowel-controlled') === 'true';

  // Check window name
  const hasControlledWindowName = !!(window.name && window.name.startsWith('vowel-content-'));

  return hasControlledParam || hasControlledSession || hasControlledWindowName;
}

/**
 * Auto-initialize automation listener if this is a controlled tab
 * 
 * This function is called automatically when the module loads.
 * It detects if the current tab is controlled and initializes the listener.
 * 
 * @param channelName - Optional custom channel name
 */
export function autoInitializeAutomationListener(channelName?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoInitializeAutomationListener(channelName);
    });
    return;
  }

  // Check if this is a controlled tab
  if (isControlledTab()) {
    console.log('🎯 [AutomationListener] Controlled tab detected');
    initializeAutomationListener(channelName);
  }
}

// Auto-initialize when module loads (for automatic setup in controlled tabs)
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure this runs after other initializations
  setTimeout(() => {
    autoInitializeAutomationListener();
  }, 100);
}

