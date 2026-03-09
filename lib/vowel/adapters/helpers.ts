/**
 * @fileoverview Adapter Helper Functions - Convenience functions for common setups
 * 
 * This file contains helper functions that simplify the creation of navigation and
 * automation adapters for common use cases. Instead of manually instantiating adapters,
 * these functions provide one-line setup for popular frameworks and scenarios.
 * 
 * Available Helpers:
 * - `createDirectAdapters` - For SPAs (React, Vue, etc.)
 * - `createControlledAdapters` - For traditional sites (Shopify, WordPress)
 * - `createTanStackAdapters` - For TanStack Router
 * - `createNextJSAdapters` - For Next.js applications
 * - `createVueRouterAdapters` - For Vue Router applications
 * - `createReactRouterAdapters` - For React Router applications
 * 
 * Benefits:
 * - Reduces boilerplate code
 * - Provides sensible defaults
 * - Type-safe configuration
 * - Framework-specific optimizations
 * 
 * @module @vowel.to/client/adapters
 * @author vowel.to
 * @license Proprietary
 */

import type { NavigationAdapter, AutomationAdapter, VowelRoute } from '../types';
import { DirectNavigationAdapter } from './navigation/direct-navigation-adapter';
import { ControlledNavigationAdapter } from './navigation/controlled-navigation-adapter';
import { TanStackNavigationAdapter } from './navigation/tanstack-navigation-adapter';
import { ReactRouterNavigationAdapter } from './navigation/react-router-navigation-adapter';
import type { ReactRouterLocation, ReactRouterNavigateFunction } from './navigation/react-router-navigation-adapter';
import { DirectAutomationAdapter } from './automation/direct-automation-adapter';
import { ControlledAutomationAdapter } from './automation/controlled-automation-adapter';
import type { Router } from '@tanstack/react-router';

/**
 * Options for creating direct adapters (SPAs)
 */
export interface DirectAdaptersOptions {
  /**
   * Navigation function for your router
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
   */
  routes?: VowelRoute[];

  /**
   * Enable automation (default: true)
   * Set to false to disable page interaction
   */
  enableAutomation?: boolean;
}

/**
 * Create direct adapters for SPAs
 * 
 * Perfect for React, Vue, Next.js, Svelte, and other SPA frameworks.
 * 
 * @param options - Configuration options
 * @returns Navigation and automation adapters
 * 
 * @example
 * ```ts
 * import { createDirectAdapters } from '@vowel.to/client/adapters/helpers';
 * import { Vowel } from '@vowel.to/client';
 * import { useRouter } from 'next/navigation';
 * 
 * const router = useRouter();
 * 
 * const { navigationAdapter, automationAdapter } = createDirectAdapters({
 *   navigate: (path) => router.push(path),
 *   routes: [
 *     { path: '/', description: 'Home' },
 *     { path: '/about', description: 'About' }
 *   ],
 *   enableAutomation: true
 * });
 * 
 * const vowel = new Vowel({
 *   appId: 'app-id',
 *   navigationAdapter,
 *   automationAdapter
 * });
 * ```
 */
export function createDirectAdapters(options: DirectAdaptersOptions): {
  navigationAdapter: NavigationAdapter;
  automationAdapter?: AutomationAdapter;
} {
  const navigationAdapter = new DirectNavigationAdapter({
    navigate: options.navigate,
    getCurrentPath: options.getCurrentPath,
    routes: options.routes
  });

  const automationAdapter = options.enableAutomation !== false
    ? new DirectAutomationAdapter()
    : undefined;

  return {
    navigationAdapter,
    automationAdapter
  };
}

/**
 * Options for creating controlled adapters (traditional sites)
 */
export interface ControlledAdaptersOptions {
  /**
   * BroadcastChannel name for communication
   * Default: 'vowel-control'
   */
  channelName?: string;

  /**
   * Optional: Array of routes
   */
  routes?: VowelRoute[];

  /**
   * Enable automation (default: true)
   * Set to false to disable page interaction
   */
  enableAutomation?: boolean;
}

/**
 * Create controlled adapters for traditional sites
 * 
 * Perfect for Shopify, WordPress, and other server-rendered platforms.
 * 
 * @param options - Configuration options
 * @returns Navigation and automation adapters
 * 
 * @example
 * ```ts
 * import { createControlledAdapters } from '@vowel.to/client/adapters/helpers';
 * import { Vowel } from '@vowel.to/client';
 * 
 * const { navigationAdapter, automationAdapter } = createControlledAdapters({
 *   channelName: 'vowel-shopify',
 *   enableAutomation: true
 * });
 * 
 * const vowel = new Vowel({
 *   appId: 'app-id',
 *   navigationAdapter,
 *   automationAdapter
 * });
 * ```
 */
export function createControlledAdapters(options: ControlledAdaptersOptions = {}): {
  navigationAdapter: NavigationAdapter;
  automationAdapter?: AutomationAdapter;
} {
  const channelName = options.channelName || 'vowel-control';

  const navigationAdapter = new ControlledNavigationAdapter({
    channelName,
    routes: options.routes
  });

  const automationAdapter = options.enableAutomation !== false
    ? new ControlledAutomationAdapter(channelName)
    : undefined;

  return {
    navigationAdapter,
    automationAdapter
  };
}

/**
 * Options for creating TanStack adapters
 */
export interface TanStackAdaptersOptions {
  /**
   * TanStack Router instance
   */
  router: Router<any, any>;

  /**
   * Enable automation (default: true)
   * Set to false to disable page interaction
   */
  enableAutomation?: boolean;
}

/**
 * Create TanStack adapters
 * 
 * Specialized adapters for TanStack Router with automatic route extraction.
 * 
 * @param options - Configuration options
 * @returns Navigation and automation adapters
 * 
 * @example
 * ```ts
 * import { createTanStackAdapters } from '@vowel.to/client/adapters/helpers';
 * import { Vowel } from '@vowel.to/client';
 * import { useRouter } from '@tanstack/react-router';
 * 
 * const router = useRouter();
 * 
 * const { navigationAdapter, automationAdapter } = createTanStackAdapters({
 *   router,
 *   enableAutomation: true
 * });
 * 
 * const vowel = new Vowel({
 *   appId: 'app-id',
 *   navigationAdapter,
 *   automationAdapter
 * });
 * ```
 */
export function createTanStackAdapters(options: TanStackAdaptersOptions): {
  navigationAdapter: NavigationAdapter;
  automationAdapter?: AutomationAdapter;
} {
  const navigationAdapter = new TanStackNavigationAdapter(options.router);

  const automationAdapter = options.enableAutomation !== false
    ? new DirectAutomationAdapter()
    : undefined;

  return {
    navigationAdapter,
    automationAdapter
  };
}

/**
 * Quick setup for Next.js
 * 
 * @example
 * ```ts
 * import { createNextJSAdapters } from '@vowel.to/client/adapters/helpers';
 * import { useRouter } from 'next/navigation';
 * 
 * const router = useRouter();
 * const adapters = createNextJSAdapters(router, {
 *   routes: [{ path: '/', description: 'Home' }]
 * });
 * ```
 */
export function createNextJSAdapters(
  router: { push: (path: string) => void },
  options?: { routes?: VowelRoute[]; enableAutomation?: boolean }
): {
  navigationAdapter: NavigationAdapter;
  automationAdapter?: AutomationAdapter;
} {
  return createDirectAdapters({
    navigate: (path) => router.push(path),
    routes: options?.routes,
    enableAutomation: options?.enableAutomation
  });
}

/**
 * Quick setup for Vue Router
 * 
 * @example
 * ```ts
 * import { createVueRouterAdapters } from '@vowel.to/client/adapters/helpers';
 * import { useRouter } from 'vue-router';
 * 
 * const router = useRouter();
 * const adapters = createVueRouterAdapters(router, {
 *   routes: [{ path: '/', description: 'Home' }]
 * });
 * ```
 */
export function createVueRouterAdapters(
  router: { push: (path: string) => void; currentRoute: { value: { path: string } } },
  options?: { routes?: VowelRoute[]; enableAutomation?: boolean }
): {
  navigationAdapter: NavigationAdapter;
  automationAdapter?: AutomationAdapter;
} {
  return createDirectAdapters({
    navigate: (path) => router.push(path),
    getCurrentPath: () => router.currentRoute.value.path,
    routes: options?.routes,
    enableAutomation: options?.enableAutomation
  });
}

/**
 * Options for creating React Router adapters
 */
export interface ReactRouterAdaptersOptions {
  /**
   * Navigate function from useNavigate() hook
   */
  navigate: ReactRouterNavigateFunction;

  /**
   * Location object from useLocation() hook
   */
  location: ReactRouterLocation;

  /**
   * Optional: Array of routes
   */
  routes?: VowelRoute[];

  /**
   * Enable automation (default: true)
   * Set to false to disable page interaction
   */
  enableAutomation?: boolean;

  /**
   * Optional: Whether to use replace instead of push for navigation
   * Default: false
   */
  useReplace?: boolean;
}

/**
 * Create React Router adapters
 * 
 * Specialized adapters for React Router with proper location tracking.
 * 
 * @param options - Configuration options
 * @returns Navigation and automation adapters
 * 
 * @example
 * ```ts
 * import { createReactRouterAdapters } from '@vowel.to/client/adapters/helpers';
 * import { Vowel } from '@vowel.to/client';
 * import { useNavigate, useLocation } from 'react-router-dom';
 * 
 * const navigate = useNavigate();
 * const location = useLocation();
 * 
 * const { navigationAdapter, automationAdapter } = createReactRouterAdapters({
 *   navigate,
 *   location,
 *   routes: [
 *     { path: '/', description: 'Home' },
 *     { path: '/about', description: 'About' }
 *   ],
 *   enableAutomation: true
 * });
 * 
 * const vowel = new Vowel({
 *   appId: 'app-id',
 *   navigationAdapter,
 *   automationAdapter
 * });
 * ```
 */
export function createReactRouterAdapters(options: ReactRouterAdaptersOptions): {
  navigationAdapter: NavigationAdapter;
  automationAdapter?: AutomationAdapter;
} {
  const navigationAdapter = new ReactRouterNavigationAdapter({
    navigate: options.navigate,
    location: options.location,
    routes: options.routes,
    useReplace: options.useReplace
  });

  const automationAdapter = options.enableAutomation !== false
    ? new DirectAutomationAdapter()
    : undefined;

  return {
    navigationAdapter,
    automationAdapter
  };
}

