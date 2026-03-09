/**
 * TanStack Router Navigation Adapter
 * 
 * Specialized adapter for TanStack Router with automatic route extraction.
 * Implements the new NavigationAdapter interface while maintaining compatibility
 * with TanStack Router's type-safe routing.
 * 
 * @example
 * ```ts
 * import { TanStackNavigationAdapter } from '@vowel.to/client/adapters/navigation';
 * import { useRouter } from '@tanstack/react-router';
 * 
 * const router = useRouter();
 * 
 * const navigationAdapter = new TanStackNavigationAdapter(router);
 * ```
 */

import type { NavigationAdapter, VowelRoute } from '../../types';
import type { Router } from '@tanstack/react-router';

/**
 * Extract route information from TanStack Router
 */
function extractRoutesFromTanStackRouter(router: Router<any, any>): VowelRoute[] {
  try {
    const routes: VowelRoute[] = [];
    
    // Get all route definitions from the router
    const routeTree = router.routeTree;
    
    function traverseRoutes(route: any, parentPath = ''): void {
      if (!route) return;
      
      const fullPath = parentPath + (route.path || '');
      
      // Only add routes that have actual paths
      if (route.path && route.path !== '/') {
        const routeInfo: VowelRoute = {
          path: fullPath,
          description: route.options?.meta?.description || 
                      route.options?.meta?.title ||
                      `Route: ${fullPath}`,
        };

        // Extract possible parameters from the path
        const paramMatches = fullPath.match(/\$([^/]+)/g);
        if (paramMatches) {
          routeInfo.queryParams = paramMatches.map(param => param.substring(1));
        }

        routes.push(routeInfo);
      }
      
      // Traverse child routes
      if (route.children) {
        route.children.forEach((child: any) => {
          traverseRoutes(child, fullPath);
        });
      }
    }
    
    traverseRoutes(routeTree);
    
    // Also add current matches for dynamic routes
    if (router.state.matches) {
      router.state.matches.forEach((match: any) => {
        const matchPath = match.pathname;
        const routeId = match.routeId;
        
        // Check if this route is already in our list
        const existing = routes.find(r => r.path === matchPath);
        if (!existing && matchPath && matchPath !== '/') {
          routes.push({
            path: matchPath,
            description: `Dynamic route: ${routeId || matchPath}`,
            queryParams: match.params ? Object.keys(match.params) : undefined,
          });
        }
      });
    }
    
    return routes;
  } catch (error) {
    console.warn('Failed to extract routes from TanStack Router:', error);
    return [];
  }
}

/**
 * TanStack Router Navigation Adapter
 * 
 * Provides seamless integration with TanStack Router, including:
 * - Type-safe navigation
 * - Automatic route discovery
 * - Support for dynamic routes
 */
export class TanStackNavigationAdapter implements NavigationAdapter {
  private router: Router<any, any>;

  constructor(router: Router<any, any>) {
    this.router = router;
    console.log('🧭 [TanStackNavigationAdapter] Initialized with TanStack Router');
  }

  /**
   * Navigate to a path using TanStack Router
   * Parses query strings from URLs and passes them as search params
   */
  async navigate(path: string): Promise<void> {
    console.log(`🧭 [TanStackNavigationAdapter] Navigating to: ${path}`);
    
    try {
      // Parse query string from path if present
      const [pathname, queryString] = path.split('?');
      const searchParams: Record<string, string> = {};
      
      if (queryString) {
        // Parse query string into search params object
        // Keep values as strings - let route's validateSearch handle type conversion
        const params = new URLSearchParams(queryString);
        params.forEach((value, key) => {
          searchParams[key] = value;
        });
      }
      
      // Navigate with parsed path and search params
      await this.router.navigate({ 
        to: pathname,
        search: Object.keys(searchParams).length > 0 ? searchParams : undefined
      });
      console.log(`   ✅ Navigation successful`);
    } catch (error) {
      console.error(`   ❌ Navigation failed:`, error);
      throw error;
    }
  }

  /**
   * Get current path from TanStack Router
   */
  getCurrentPath(): string {
    return this.router.state.location.pathname;
  }

  /**
   * Get routes automatically extracted from TanStack Router
   */
  async getRoutes(): Promise<VowelRoute[]> {
    const routes = extractRoutesFromTanStackRouter(this.router);
    console.log(`🧭 [TanStackNavigationAdapter] Extracted ${routes.length} routes from router`);
    return routes;
  }

  /**
   * Get additional context from TanStack Router
   */
  getContext(): any {
    const routes = extractRoutesFromTanStackRouter(this.router);
    
    return {
      location: this.router.state.location,
      matches: this.router.state.matches,
      routes,
      routeTree: this.router.routeTree,
    };
  }
}

/**
 * Create a TanStack Router adapter using navigation hooks
 * This version is for use within React components
 * 
 * @param navigate - navigate function from useNavigate() hook
 * @param pathname - current pathname from useRouterState() or similar
 * @returns NavigationAdapter
 * 
 * @example
 * ```tsx
 * import { useNavigate, useRouterState } from '@tanstack/react-router';
 * import { createTanStackHookAdapter } from '@vowel.to/client/adapters/navigation';
 * 
 * function App() {
 *   const navigate = useNavigate();
 *   const pathname = useRouterState({ select: s => s.location.pathname });
 *   
 *   const navigationAdapter = useMemo(
 *     () => createTanStackHookAdapter(navigate, pathname),
 *     [navigate, pathname]
 *   );
 *   
 *   return <Vowel navigationAdapter={navigationAdapter} />;
 * }
 * ```
 */
export function createTanStackHookAdapter(
  navigate: (opts: { to: string }) => Promise<void>,
  pathname: string
): NavigationAdapter {
  return {
    navigate: async (path: string) => {
      console.log(`🧭 [TanStackHookAdapter] Navigating to: ${path}`);
      await navigate({ to: path });
    },
    
    getCurrentPath: () => {
      return pathname;
    },

    getRoutes: async () => {
      // Cannot extract routes from hooks - return empty array
      // Routes should be provided via Vowel config in this case
      return [];
    }
  };
}

