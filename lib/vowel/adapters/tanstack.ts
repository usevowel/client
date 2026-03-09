/**
 * TanStack Router adapter for Vowel
 */

import type { RouterAdapter, VowelRoute } from "../types";
import type { Router } from "@tanstack/react-router";

/**
 * Extract route information from TanStack Router
 */
function extractRoutesFromTanStackRouter(router: Router<any, any>): VowelRoute[] {
  try {
    const routes: VowelRoute[] = [];
    
    // Get all route definitions from the router
    const routeTree = router.routeTree;
    
    function traverseRoutes(route: any, parentPath = ""): void {
      if (!route) return;
      
      const fullPath = parentPath + (route.path || "");
      
      // Only add routes that have actual paths
      if (route.path && route.path !== "/") {
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
        if (!existing && matchPath && matchPath !== "/") {
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
    console.warn("Failed to extract routes from TanStack Router:", error);
    return [];
  }
}

/**
 * Create a TanStack Router adapter
 * 
 * @param router - TanStack Router instance
 * @returns RouterAdapter for use with Vowel
 * 
 * @example
 * ```ts
 * import { createRouter } from '@tanstack/react-router';
 * import { tanstackRouterAdapter } from '@/lib/vowel/adapters';
 * import { Vowel } from '@/lib/vowel';
 * 
 * const router = createRouter({ ... });
 * 
 * export const vowel = new Vowel({
 *   appId: 'your-app-id',
 *   router: tanstackRouterAdapter(router)
 * });
 * ```
 */
export function tanstackRouterAdapter(router: any): RouterAdapter {
  return {
    navigate: async (path: string) => {
      await router.navigate({ to: path });
    },
    
    getCurrentPath: () => {
      return router.state.location.pathname;
    },
    
    getContext: () => {
      const routes = extractRoutesFromTanStackRouter(router);
      
      return {
        location: router.state.location,
        matches: router.state.matches,
        routes,
        routeTree: router.routeTree,
      };
    },
    
    getRoutes: () => {
      return extractRoutesFromTanStackRouter(router);
    },
  };
}

/**
 * Create a TanStack Router adapter with useNavigate hook
 * This version is for use within React components
 * 
 * @param navigate - navigate function from useNavigate() hook
 * @param pathname - current pathname from useLocation() or similar
 * @returns RouterAdapter
 * 
 * @example
 * ```tsx
 * import { useNavigate, useRouterState } from '@tanstack/react-router';
 * import { tanstackRouterHookAdapter } from '@/lib/vowel/adapters';
 * import { Vowel } from '@/lib/vowel';
 * 
 * function App() {
 *   const navigate = useNavigate();
 *   const pathname = useRouterState({ select: s => s.location.pathname });
 *   
 *   const vowel = useMemo(() => new Vowel({
 *     appId: 'your-app-id',
 *     router: tanstackRouterHookAdapter(navigate, pathname)
 *   }), [navigate, pathname]);
 *   
 *   return <vowel.Provider>...</vowel.Provider>;
 * }
 * ```
 */
export function tanstackRouterHookAdapter(
  navigate: (opts: { to: string }) => Promise<void>,
  pathname: string
): RouterAdapter {
  return {
    navigate: async (path: string) => {
      await navigate({ to: path });
    },
    
    getCurrentPath: () => {
      return pathname;
    },
  };
}

