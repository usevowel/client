/**
 * Adapters for Vowel
 *
 * Provides navigation and automation adapters for various platforms:
 * - Navigation: Handles WHERE to go (routing)
 * - Automation: Handles WHAT to do (page interaction)
 */

// ========================================
// New Dual Adapter Architecture
// ========================================

// Navigation Adapters
export {
  createTanStackHookAdapter,
  createReactRouterAdapter,
  createReactRouterHookAdapter
} from "./navigation";
export type { DirectNavigationAdapterOptions } from "./navigation/direct-navigation-adapter";
export type { ControlledNavigationAdapterOptions } from "./navigation/controlled-navigation-adapter";
export type {
  ReactRouterNavigationAdapterOptions,
  ReactRouterLocation,
  ReactRouterNavigateFunction
} from "./navigation/react-router-navigation-adapter";

// Automation Adapters
export { createControlledAutomationListener } from "./automation";

// Helper Functions
export {
  createDirectAdapters,
  createControlledAdapters,
  createTanStackAdapters,
  createNextJSAdapters,
  createVueRouterAdapters,
  createReactRouterAdapters,
} from "./helpers";
export type {
  DirectAdaptersOptions,
  ControlledAdaptersOptions,
  TanStackAdaptersOptions,
  ReactRouterAdaptersOptions
} from "./helpers";

// Types
export type {
  NavigationAdapter,
  AutomationAdapter,
  AutomationSearchOptions,
  AutomationSearchResult,
  AutomationSearchResults,
  AutomationActionResult
} from "../types";
