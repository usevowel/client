/**
 * @fileoverview WebMCP Integration Module
 * 
 * This module provides WebMCP (Web Model Context Protocol) integration for the Vowel client.
 * It enables bidirectional tool/action sharing between Vowel and WebMCP-compatible AI agents.
 * 
 * Features:
 * - Discover WebMCP tools registered via navigator.modelContext.registerTool()
 * - Expose Vowel actions as WebMCP tools
 * - Schema conversion between legacy and WebMCP formats
 * - Polyfill detection for browsers without native support
 * 
 * @module @vowel.to/client/webmcp
 * @author vowel.to
 * @license Proprietary
 */

import type { VowelActionDefinition, JSONSchema } from "../types";
import { convertLegacyToWebMCPSchema } from "./conversion";

/**
 * WebMCP tool definition from the browser's native API
 */
export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

/**
 * WebMCP execution result
 */
export interface WebMCPExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Check if WebMCP native API is available in the browser
 * 
 * @returns true if navigator.modelContext.registerTool is available
 * 
 * @example
 * ```ts
 * if (isWebMCPAvailable()) {
 *   console.log('WebMCP is available!');
 * }
 * ```
 */
export function isWebMCPAvailable(): boolean {
  return typeof navigator !== 'undefined' &&
    'modelContext' in navigator &&
    typeof (navigator as unknown as { modelContext?: { registerTool?: unknown } }).modelContext?.registerTool === 'function';
}

/**
 * Check if WebMCP testing API is available (for tool discovery)
 * 
 * @returns true if navigator.modelContextTesting.getTools is available
 * 
 * @example
 * ```ts
 * if (isWebMCPTestingAvailable()) {
 *   const tools = await discoverWebMCPTools();
 * }
 * ```
 */
export function isWebMCPTestingAvailable(): boolean {
  return typeof navigator !== 'undefined' &&
    'modelContextTesting' in navigator &&
    typeof (navigator as unknown as { modelContextTesting?: { getTools?: unknown } }).modelContextTesting?.getTools === 'function';
}

/**
 * Discover WebMCP tools registered in the browser
 * 
 * @returns Promise resolving to array of discovered WebMCP tools
 * 
 * @example
 * ```ts
 * const tools = await discoverWebMCPTools();
 * console.log('Discovered tools:', tools.map(t => t.name));
 * ```
 */
export async function discoverWebMCPTools(): Promise<WebMCPTool[]> {
  // First try the native testing API
  if (isWebMCPTestingAvailable()) {
    try {
      const nav = navigator as unknown as { modelContextTesting: { getTools: () => Promise<WebMCPTool[]> } };
      const tools = await nav.modelContextTesting.getTools();
      console.log('[webmcp] Discovered', tools.length, 'WebMCP tools via testing API');
      return tools;
    } catch (error) {
      console.warn('[webmcp] Failed to discover tools via testing API:', error);
    }
  }

  // Fallback: check global __webmcp_tools registry (used by rooter and other apps)
  if (typeof window !== 'undefined') {
    const globalTools = (window as unknown as { __webmcp_tools?: WebMCPTool[] }).__webmcp_tools;
    if (globalTools && Array.isArray(globalTools)) {
      console.log('[webmcp] Discovered', globalTools.length, 'WebMCP tools via global registry');
      return globalTools;
    }
  }

  console.log('[webmcp] No WebMCP tools discovered');
  return [];
}

/**
 * Register a Vowel action as a WebMCP tool
 * 
 * @param name - Tool name
 * @param definition - Vowel action definition (WebMCP or legacy format)
 * @param handler - Execution handler
 * @returns AbortController for cleanup, or null if WebMCP not available
 * 
 * @example
 * ```ts
 * const controller = await registerVowelActionAsWebMCP('searchProducts', {
 *   name: 'searchProducts',
 *   description: 'Search for products',
 *   inputSchema: { ... }
 * }, async (params) => { ... });
 * 
 * // Later, to unregister:
 * controller?.abort();
 * ```
 */
export async function registerVowelActionAsWebMCP(
  name: string,
  definition: VowelActionDefinition,
  handler: (params: unknown) => Promise<unknown>
): Promise<AbortController | null> {
  if (!isWebMCPAvailable()) {
    console.log('[webmcp] Native WebMCP API not available, skipping registration');
    return null;
  }

  // Convert to WebMCP format if needed
  const webMCPDefinition = convertToWebMCPTool(name, definition);
  
  if (!webMCPDefinition) {
    console.warn('[webmcp] Failed to convert action to WebMCP format:', name);
    return null;
  }

  const controller = new AbortController();

  try {
    const nav = navigator as unknown as {
      modelContext: {
        registerTool: (tool: unknown, options?: unknown) => void;
      };
    };

    // Create the tool with execute handler
    const tool = {
      name: webMCPDefinition.name,
      description: webMCPDefinition.description,
      inputSchema: webMCPDefinition.inputSchema,
      execute: async (params: unknown): Promise<WebMCPExecutionResult> => {
        try {
          const result = await handler(params);
          return {
            success: true,
            result,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    };

    nav.modelContext.registerTool(tool, { signal: controller.signal });
    console.log('[webmcp] Registered tool:', name);
    
    return controller;
  } catch (error) {
    console.error('[webmcp] Failed to register tool:', name, error);
    return null;
  }
}

/**
 * Unregister a WebMCP tool
 * 
 * @param controller - AbortController from registerVowelActionAsWebMCP
 * 
 * @example
 * ```ts
 * const controller = await registerVowelActionAsWebMCP(...);
 * // Later, to unregister:
 * unregisterWebMCPTool(controller);
 * ```
 */
export function unregisterWebMCPTool(controller: AbortController | null): void {
  if (controller) {
    controller.abort();
    console.log('[webmcp] Unregistered WebMCP tool');
  }
}

/**
 * Convert a Vowel action definition to WebMCP tool format
 * 
 * @param name - Tool name
 * @param definition - Vowel action definition
 * @returns WebMCP tool definition or null if conversion fails
 * 
 * @example
 * ```ts
 * const tool = convertToWebMCPTool('searchProducts', {
 *   description: 'Search for products',
 *   parameters: { query: { type: 'string', description: 'Search query' } }
 * });
 * ```
 */
export function convertToWebMCPTool(name: string, definition: VowelActionDefinition): WebMCPTool | null {
  // Already in WebMCP format
  if ('inputSchema' in definition && 'name' in definition) {
    return {
      name: definition.name || name,
      description: definition.description,
      inputSchema: definition.inputSchema,
    };
  }

  // Legacy format - convert to WebMCP
  if ('parameters' in definition) {
    return convertLegacyToWebMCPSchema(name, definition);
  }

  console.warn('[webmcp] Unknown action format:', name);
  return null;
}

/**
 * Call a WebMCP tool directly (for testing)
 * 
 * @param name - Tool name
 * @param params - Tool parameters
 * @returns Promise resolving to tool execution result
 * 
 * @example
 * ```ts
 * const result = await callWebMCPTool('searchProducts', { query: 'iphone' });
 * console.log(result);
 * ```
 */
export async function callWebMCPTool(name: string, params: unknown): Promise<WebMCPExecutionResult> {
  if (!isWebMCPTestingAvailable()) {
    return {
      success: false,
      error: 'WebMCP testing API not available',
    };
  }

  try {
    const nav = navigator as unknown as {
      modelContextTesting: {
        callTool: (name: string, params: unknown) => Promise<WebMCPExecutionResult>;
      };
    };

    const result = await nav.modelContextTesting.callTool(name, params);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get all registered WebMCP tool names
 * 
 * @returns Array of registered tool names
 * 
 * @example
 * ```ts
 * const names = getRegisteredWebMCPToolNames();
 * console.log('Registered tools:', names);
 * ```
 */
export function getRegisteredWebMCPToolNames(): string[] {
  if (isWebMCPTestingAvailable()) {
    // Try to get from testing API
    // Note: This may not be supported in all browsers
    return [];
  }

  // Fallback to global registry
  if (typeof window !== 'undefined') {
    const globalTools = (window as unknown as { __webmcp_tools?: WebMCPTool[] }).__webmcp_tools;
    if (globalTools && Array.isArray(globalTools)) {
      return globalTools.map(t => t.name);
    }
  }

  return [];
}