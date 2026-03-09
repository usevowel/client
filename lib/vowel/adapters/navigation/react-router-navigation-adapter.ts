/**
 * React Router Navigation Adapter
 * 
 * Specialized adapter for React Router (v6+) with automatic route extraction.
 * Implements the NavigationAdapter interface while maintaining compatibility
 * with React Router's routing system.
 * 
 * @example
 * ```ts
 * import { ReactRouterNavigationAdapter } from '@vowel.to/client/adapters/navigation';
 * import { useNavigate, useLocation } from 'react-router-dom';
 * 
 * const navigate = useNavigate();
 * const location = useLocation();
 * 
 * const navigationAdapter = new ReactRouterNavigationAdapter({
 *   navigate,
 *   location
 * });
 * ```
 */

import type { NavigationAdapter, VowelRoute } from '../../types';

/**
 * React Router location interface (simplified)
 */
export interface ReactRouterLocation {
  pathname: string;
  search?: string;
  hash?: string;
  state?: any;
  key?: string;
}

/**
 * React Router navigate function type
 */
export type ReactRouterNavigateFunction = (to: string | number, options?: {
  replace?: boolean;
  state?: any;
  preventScrollReset?: boolean;
  relative?: 'route' | 'path';
}) => void;

/**
 * Options for ReactRouterNavigationAdapter
 */
export interface ReactRouterNavigationAdapterOptions {
  /**
   * Navigate function from useNavigate() hook
   */
  navigate: ReactRouterNavigateFunction;

  /**
   * Location object from useLocation() hook
   */
  location: ReactRouterLocation;

  /**
   * Optional: Array of routes to provide to the AI
   * Since React Router doesn't expose route configuration at runtime,
   * you should provide this manually
   */
  routes?: VowelRoute[];

  /**
   * Optional: Whether to use replace instead of push for navigation
   * Default: false
   */
  useReplace?: boolean;
}

/**
 * React Router Navigation Adapter
 * 
 * Provides seamless integration with React Router, including:
 * - Navigation using useNavigate() hook
 * - Current path tracking using useLocation() hook
 * - Support for manual route configuration
 * 
 * Note: Unlike TanStack Router, React Router doesn't expose route configuration
 * at runtime, so routes should be provided manually via the routes option.
 */
export class ReactRouterNavigationAdapter implements NavigationAdapter {
  private navigateFunction: ReactRouterNavigateFunction;
  private location: ReactRouterLocation;
  private routes?: VowelRoute[];
  private useReplace: boolean;

  constructor(options: ReactRouterNavigationAdapterOptions) {
    this.navigateFunction = options.navigate;
    this.location = options.location;
    this.routes = options.routes;
    this.useReplace = options.useReplace ?? false;
    
    console.log('🧭 [ReactRouterNavigationAdapter] Initialized with React Router');
    if (this.routes) {
      console.log(`   📍 Provided ${this.routes.length} routes`);
    } else {
      console.log('   ⚠️  No routes provided - consider adding routes for better AI navigation');
    }
  }

  /**
   * Navigate to a path using React Router
   */
  async navigate(path: string): Promise<void> {
    console.log(`🧭 [ReactRouterNavigationAdapter] Navigating to: ${path}`);
    
    try {
      this.navigateFunction(path, {
        replace: this.useReplace
      });
      console.log(`   ✅ Navigation successful`);
    } catch (error) {
      console.error(`   ❌ Navigation failed:`, error);
      throw error;
    }
  }

  /**
   * Get current path from React Router location
   */
  getCurrentPath(): string {
    return this.location.pathname;
  }

  /**
   * Get routes (if provided during initialization)
   */
  async getRoutes(): Promise<VowelRoute[]> {
    if (this.routes) {
      console.log(`🧭 [ReactRouterNavigationAdapter] Returning ${this.routes.length} configured routes`);
      return this.routes;
    }
    
    console.log('🧭 [ReactRouterNavigationAdapter] No routes configured');
    return [];
  }

  /**
   * Get additional context from React Router
   */
  getContext(): any {
    return {
      location: this.location,
      routes: this.routes || [],
      pathname: this.location.pathname,
      search: this.location.search,
      hash: this.location.hash,
      state: this.location.state
    };
  }

  /**
   * Update the location reference
   * Call this when the location changes to keep the adapter in sync
   * 
   * @param location - New location object from useLocation()
   */
  updateLocation(location: ReactRouterLocation): void {
    this.location = location;
  }

  /**
   * Update the routes configuration
   * Useful if routes are loaded dynamically
   * 
   * @param routes - New routes array
   */
  updateRoutes(routes: VowelRoute[]): void {
    this.routes = routes;
    console.log(`🧭 [ReactRouterNavigationAdapter] Routes updated: ${routes.length} routes`);
  }
}

/**
 * Create a React Router adapter using navigation hooks
 * This is a convenience function for quick setup
 * 
 * @param navigate - navigate function from useNavigate() hook
 * @param location - location object from useLocation() hook
 * @param routes - Optional array of routes
 * @returns NavigationAdapter
 * 
 * @example
 * ```tsx
 * import { useNavigate, useLocation } from 'react-router-dom';
 * import { createReactRouterAdapter } from '@vowel.to/client/adapters/navigation';
 * 
 * function App() {
 *   const navigate = useNavigate();
 *   const location = useLocation();
 *   
 *   const navigationAdapter = useMemo(
 *     () => createReactRouterAdapter(navigate, location, [
 *       { path: '/', description: 'Home page' },
 *       { path: '/about', description: 'About page' },
 *       { path: '/products', description: 'Products listing' }
 *     ]),
 *     [navigate, location]
 *   );
 *   
 *   return <Vowel navigationAdapter={navigationAdapter} />;
 * }
 * ```
 */
export function createReactRouterAdapter(
  navigate: ReactRouterNavigateFunction,
  location: ReactRouterLocation,
  routes?: VowelRoute[]
): NavigationAdapter {
  return new ReactRouterNavigationAdapter({
    navigate,
    location,
    routes
  });
}

/**
 * Create a React Router adapter with just pathname (simpler version)
 * 
 * @param navigate - navigate function from useNavigate() hook
 * @param pathname - current pathname from useLocation().pathname
 * @param routes - Optional array of routes
 * @returns NavigationAdapter
 * 
 * @example
 * ```tsx
 * import { useNavigate, useLocation } from 'react-router-dom';
 * import { createReactRouterHookAdapter } from '@vowel.to/client/adapters/navigation';
 * 
 * function App() {
 *   const navigate = useNavigate();
 *   const { pathname } = useLocation();
 *   
 *   const navigationAdapter = useMemo(
 *     () => createReactRouterHookAdapter(navigate, pathname),
 *     [navigate, pathname]
 *   );
 *   
 *   return <Vowel navigationAdapter={navigationAdapter} />;
 * }
 * ```
 */
export function createReactRouterHookAdapter(
  navigate: ReactRouterNavigateFunction,
  pathname: string,
  routes?: VowelRoute[]
): NavigationAdapter {
  return {
    navigate: async (path: string) => {
      console.log(`🧭 [ReactRouterHookAdapter] Navigating to: ${path}`);
      navigate(path);
    },
    
    getCurrentPath: () => {
      return pathname;
    },

    getRoutes: async () => {
      return routes || [];
    }
  };
}

