/**
 * Generic Controlled Navigation Router
 * Handles navigation using cross-tab communication via BroadcastChannel
 * Opens navigation in a separate tab to keep voice agent running
 * 
 * Platform-agnostic - works with any website
 */

import type { RouterAdapter, VowelRoute } from "../../types";

export interface ControlledNavigationRouterOptions {
  /**
   * BroadcastChannel name for cross-tab communication
   * @default 'vowel-navigation'
   */
  channelName?: string;
  
  /**
   * Custom config to send to controlled tab
   */
  config?: Record<string, any>;
}

/**
 * Router adapter for controlled navigation
 * Opens navigation in a dedicated tab to preserve voice agent session
 * 
 * @example
 * ```ts
 * const router = new ControlledNavigationRouter();
 * router.setRoutes(discoveredRoutes);
 * 
 * // Navigate to a page (opens in separate tab)
 * await router.navigate('/about');
 * ```
 */
export class ControlledNavigationRouter implements RouterAdapter {
  private routes: VowelRoute[] = [];
  private currentPath: string = "";
  private channel: BroadcastChannel | null = null;
  private controlledTabConnected: boolean = false;
  private channelName: string;
  private customConfig: Record<string, any>;

  constructor(options: ControlledNavigationRouterOptions = {}) {
    this.channelName = options.channelName || 'vowel-navigation';
    this.customConfig = options.config || {};
    
    if (typeof window !== "undefined") {
      this.currentPath = window.location.pathname;
      this.setupNavigationListener();
      
      // Initialize BroadcastChannel for cross-tab communication
      if (window.BroadcastChannel) {
        this.channel = new BroadcastChannel(this.channelName);
        console.log(`✅ ControlledNavigationRouter: BroadcastChannel initialized on channel '${this.channelName}'`);
        console.log("   👂 Listening for controlled tab init messages...");
        
        // Listen for messages from controlled tab
        this.channel.onmessage = (event: MessageEvent) => {
          const message = event.data;
          console.log(`📨 ControlledNavigationRouter: Received message from controlled tab`);
          console.log(`   📦 Message type: ${message.type}`);
          console.log(`   ⏱️  Timestamp: ${new Date(message.timestamp).toISOString()}`);
          
          if (message.type === 'init') {
            // Controlled tab is announcing itself
            console.log("🎯 ControlledNavigationRouter: Controlled tab init message received");
            console.log(`   🔑 Detected via: ${message.detectedVia || 'unknown'}`);
            console.log(`   📛 Window name: ${message.windowName}`);
            console.log(`   📍 URL: ${message.url}`);
            console.log(`   ⏱️  Init timestamp: ${message.timestamp}`);
            console.log(`   📤 Preparing to send config response...`);
            
            // Send config back to controlled tab
            this.sendConfig(message.requestTimestamp);
          } else if (message.type === 'ack' && message.originalType === 'config') {
            // Controlled tab confirms it received config
            this.controlledTabConnected = true;
            const roundTrip = Date.now() - message.requestTimestamp;
            console.log("✅ ControlledNavigationRouter: Handshake complete - controlled tab configured and ready");
            console.log(`   ⏱️  Round-trip time: ${roundTrip}ms`);
            console.log(`   🔗 Tab is now fully connected and listening for navigation commands`);
          } else {
            console.log(`ℹ️  ControlledNavigationRouter: Unhandled message type: ${message.type}`);
          }
        };
      } else {
        console.error("❌ ControlledNavigationRouter: BroadcastChannel not supported in this browser");
      }
      
      // Signal that this router needs a content window opened synchronously on start
      (window as any).__vowelNeedsContentWindow = true;
      console.log("✅ ControlledNavigationRouter: Set __vowelNeedsContentWindow flag");
    }
  }

  /**
   * Send config message to controlled tab
   * Called in response to init message from controlled tab
   */
  private sendConfig(requestTimestamp: number): void {
    if (!this.channel) {
      console.error("❌ ControlledNavigationRouter: Cannot send config - channel not initialized");
      return;
    }
    
    const configMessage = {
      type: 'config',
      timestamp: Date.now(),
      requestTimestamp: requestTimestamp, // For round-trip measurement
      config: {
        version: '1.0.0',
        features: ['navigation'],
        ...this.customConfig
      }
    };
    
    console.log("📡 ControlledNavigationRouter: Sending config message to controlled tab...");
    console.log("   📦 Config payload:", JSON.stringify(configMessage.config, null, 2));
    console.log("   ⏱️  Request timestamp:", requestTimestamp);
    console.log("   ⏱️  Response timestamp:", configMessage.timestamp);
    
    this.channel.postMessage(configMessage);
    
    console.log("✅ ControlledNavigationRouter: Config message sent successfully");
    console.log("   ⏳ Waiting for ack from controlled tab...");
  }
  
  /**
   * Get connection status for debugging
   */
  isControlledTabConnected(): boolean {
    return this.controlledTabConnected;
  }

  /**
   * Navigate to a path
   * Opens URL in a controlled tab to preserve voice agent on main page
   * 
   * @param path - Path to navigate to (can be relative, absolute, or full URL)
   */
  async navigate(path: string): Promise<void> {
    console.log("🧭 Navigating to:", path);

    let targetUrl: string;

    // Handle different types of navigation
    if (path.startsWith("http://") || path.startsWith("https://")) {
      targetUrl = path;
    } else if (path.startsWith("/")) {
      // Absolute path - construct full URL with current origin
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      targetUrl = currentOrigin + path;
    } else {
      // Relative path - construct full URL
      const currentUrl = new URL(window.location.href);
      const newUrl = new URL(path, currentUrl.origin);
      targetUrl = newUrl.href;
    }

    // Update current path
    this.currentPath = path;

    try {
      // Send navigation command via BroadcastChannel
      if (this.channel) {
        if (!this.controlledTabConnected) {
          console.warn("⚠️ ControlledNavigationRouter: Sending navigation to potentially disconnected tab");
          console.warn("   ℹ️  Tab may have been closed or not yet opened");
        }
        
        console.log("📡 ControlledNavigationRouter: Sending navigation command");
        console.log("   📍 Path:", path);
        console.log("   🔗 Full URL:", targetUrl);
        
        this.channel.postMessage({
          type: 'navigate',
          path: path,
          url: targetUrl,
          timestamp: Date.now()
        });
        
        console.log("✅ ControlledNavigationRouter: Navigation message sent successfully");
      } else {
        console.error("❌ ControlledNavigationRouter: Cannot navigate - BroadcastChannel not available");
        throw new Error("BroadcastChannel not initialized");
      }
    } catch (error) {
      console.error("❌ ControlledNavigationRouter: Error sending navigation message:", error);
      throw error;
    }

    // Dispatch custom event for scripts
    window.dispatchEvent(
      new CustomEvent("vowel:navigation", {
        detail: { path, url: targetUrl },
      })
    );
  }

  /**
   * Get current path from browser location
   * 
   * @returns Current pathname
   */
  getCurrentPath(): string {
    if (typeof window !== "undefined") {
      this.currentPath = window.location.pathname;
    }
    return this.currentPath;
  }

  /**
   * Get available routes
   *
   * @returns Available routes
   */
  getRoutes(): VowelRoute[] {
    return this.routes;
  }

  /**
   * Set routes (called after route discovery)
   * 
   * @param routes - Available routes to set
   */
  setRoutes(routes: VowelRoute[]): void {
    this.routes = routes;
    console.log(`📋 Set ${routes.length} routes`);
  }

  /**
   * Get router context for Vowel client
   * Provides current location and route information
   * 
   * @returns Router context object
   */
  getContext() {
    return {
      location: {
        pathname: this.getCurrentPath(),
        search: typeof window !== "undefined" ? window.location.search : "",
        hash: typeof window !== "undefined" ? window.location.hash : "",
      },
      routes: this.routes,
      currentPath: this.getCurrentPath(),
    };
  }

  /**
   * Setup navigation listener to track route changes
   * Updates currentPath when navigation occurs
   */
  private setupNavigationListener(): void {
    if (typeof window === "undefined") return;

    // Listen for popstate (back/forward navigation)
    window.addEventListener("popstate", () => {
      this.currentPath = window.location.pathname;
    });

    // Listen for hashchange
    window.addEventListener("hashchange", () => {
      this.currentPath = window.location.pathname;
    });
  }
}

