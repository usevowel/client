/**
 * @fileoverview Direct Navigation Adapter - Same-tab navigation for SPAs
 * 
 * This file contains the `DirectNavigationAdapter` class which enables voice-controlled
 * navigation in Single Page Applications (SPAs) without page reloads. It integrates with
 * your existing router (React Router, Next.js, Vue Router, etc.) by calling navigation
 * functions directly.
 * 
 * Use Cases:
 * - React applications with React Router
 * - Next.js applications (App Router or Pages Router)
 * - Vue applications with Vue Router
 * - Any SPA framework with programmatic navigation
 * 
 * Key Features:
 * - Same-tab navigation (no page reloads)
 * - Framework-agnostic interface
 * - Route configuration support
 * - Current path tracking
 * 
 * @module @vowel.to/client/adapters/navigation
 * @author vowel.to
 * @license Proprietary
 * 
 * @example
 * ```ts
 * import { DirectNavigationAdapter } from '@vowel.to/client/adapters/navigation';
 * import { useRouter } from 'next/navigation';
 * 
 * const router = useRouter();
 * 
 * const navigationAdapter = new DirectNavigationAdapter({
 *   navigate: (path) => router.push(path),
 *   getCurrentPath: () => window.location.pathname,
 *   routes: [
 *     { path: '/', description: 'Home page' },
 *     { path: '/products', description: 'Browse products' }
 *   ]
 * });
 * ```
 */

import type { NavigationAdapter, VowelRoute } from '../../types';

/**
 * Configuration options for DirectNavigationAdapter
 */
export interface DirectNavigationAdapterOptions {
  /**
   * Function to navigate to a path
   * @param path - The path to navigate to
   * 
   * @example
   * ```ts
   * // Next.js
   * navigate: (path) => router.push(path)
   * 
   * // Vue Router
   * navigate: (path) => router.push(path)
   * 
   * // React Router
   * navigate: (path) => navigate(path)
   * ```
   */
  navigate: (path: string) => void | Promise<void>;

  /**
   * Optional: Function to get current path
   * Defaults to window.location.pathname
   */
  getCurrentPath?: () => string;

  /**
   * Optional: Array of routes
   * Can also be provided via Vowel config
   */
  routes?: VowelRoute[];
}

/**
 * Direct Navigation Adapter
 * 
 * Handles same-tab navigation for SPAs by directly calling your router.
 * Perfect for React, Vue, Next.js, Svelte, and other SPA frameworks.
 */
export class DirectNavigationAdapter implements NavigationAdapter {
  private navigateFunction: (path: string) => void | Promise<void>;
  private getPathFunction: () => string;
  private routes?: VowelRoute[];

  constructor(options: DirectNavigationAdapterOptions) {
    this.navigateFunction = options.navigate;
    this.getPathFunction = options.getCurrentPath || (() => window.location.pathname);
    this.routes = options.routes;

    console.log('🧭 [DirectNavigationAdapter] Initialized for same-tab SPA navigation');
  }

  /**
   * Navigate to a path
   */
  async navigate(path: string): Promise<void> {
    console.log(`🧭 [DirectNavigationAdapter] Navigating to: ${path}`);
    
    try {
      await this.navigateFunction(path);
      console.log(`   ✅ Navigation successful`);
    } catch (error) {
      console.error(`   ❌ Navigation failed:`, error);
      throw error;
    }
  }

  /**
   * Get current path
   */
  getCurrentPath(): string {
    return this.getPathFunction();
  }

  /**
   * Get available routes
   */
  async getRoutes(): Promise<VowelRoute[]> {
    return this.routes || [];
  }
}

