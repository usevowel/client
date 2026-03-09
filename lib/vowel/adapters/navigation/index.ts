/**
 * Navigation Adapters
 * 
 * Export all navigation adapter implementations
 */

export { DirectNavigationAdapter } from './direct-navigation-adapter';
export type { DirectNavigationAdapterOptions } from './direct-navigation-adapter';

export { ControlledNavigationAdapter } from './controlled-navigation-adapter';
export type { ControlledNavigationAdapterOptions } from './controlled-navigation-adapter';

export { 
  TanStackNavigationAdapter,
  createTanStackHookAdapter 
} from './tanstack-navigation-adapter';

export {
  ReactRouterNavigationAdapter,
  createReactRouterAdapter,
  createReactRouterHookAdapter
} from './react-router-navigation-adapter';
export type {
  ReactRouterNavigationAdapterOptions,
  ReactRouterLocation,
  ReactRouterNavigateFunction
} from './react-router-navigation-adapter';

