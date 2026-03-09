/**
 * @fileoverview Tool Manager - Manages tool definitions and execution for Vowel voice agent
 * 
 * This file contains the `ToolManager` class which handles the registration, validation,
 * and execution of custom actions (tools) that the AI voice agent can perform. It provides
 * a type-safe interface for defining tools with parameters and executing them with proper
 * context and error handling.
 * 
 * Responsibilities:
 * - Tool registration and unregistration
 * - Tool definition validation
 * - Tool execution with context
 * - Error handling and result formatting
 * - Maintaining tool registry
 * 
 * @module @vowel.to/client/managers
 * @author vowel.to
 * @license Proprietary
 */

import type { VowelAction, VowelRoute, RouterAdapter } from "../types";

function sanitizeLooseValue(value: any): any {
  if (value === null) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeLooseValue(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    const sanitizedEntries = Object.entries(value)
      .map(([key, nestedValue]) => [key, sanitizeLooseValue(nestedValue)] as const)
      .filter(([, nestedValue]) => nestedValue !== undefined);

    return Object.fromEntries(sanitizedEntries);
  }

  return value;
}

function sanitizeToolParams(params: any, definition: VowelAction): any {
  if (params === null || params === undefined) {
    return {};
  }

  if (Array.isArray(params) || typeof params !== "object") {
    return sanitizeLooseValue(params);
  }

  const parameterDefinitions = definition.parameters || {};
  const sanitizedEntries = Object.entries(params)
    .map(([key, value]) => {
      const parameterDefinition = parameterDefinitions[key];

      if (value === null) {
        if (parameterDefinition?.type === "array") {
          return [key, []] as const;
        }

        if (parameterDefinition?.type === "object") {
          return [key, {}] as const;
        }

        return [key, undefined] as const;
      }

      return [key, sanitizeLooseValue(value)] as const;
    })
    .filter(([, value]) => value !== undefined);

  return Object.fromEntries(sanitizedEntries);
}

/**
 * Tool execution context
 */
export interface ToolContext {
  /** Router adapter for navigation */
  router?: RouterAdapter;
  /** Available routes */
  routes?: VowelRoute[];
  /** Current path */
  currentPath?: string;
}

/**
 * Tool handler function
 */
export type ToolHandler<T = any> = (params: T, context: ToolContext) => Promise<any> | any;

/**
 * Tool definition with handler
 */
export interface Tool {
  /** Tool definition for AI */
  definition: VowelAction;
  /** Execution handler */
  handler: ToolHandler;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  message?: string;
  data?: any;
  result?: any;  // Alias for data (for compatibility)
  response?: string;  // Alias for message (for compatibility)
  error?: string;
}

/**
 * Tool Manager class
 * Manages registration and execution of tools for the voice agent
 */
export class ToolManager {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    // Register default tools
    this.registerDefaultTools();
  }

  /**
   * Register a tool
   */
  registerTool(name: string, definition: VowelAction, handler: ToolHandler): void {
    console.log(`%c🔧 TOOL REGISTRATION`, 'background: #00D9FF; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 3px;');
    console.log(`%cTool: ${name}`, 'color: #00D9FF; font-weight: bold; font-size: 13px;');
    console.log(`  Description: %c${definition.description || '(no description)'}`, 'color: #88FF88;');
    console.log(`  Parameters:`, definition.parameters || {});
    console.log(`  Parameter Count: %c${Object.keys(definition.parameters || {}).length}`, 'color: #FFD700; font-weight: bold;');
    
    // Log each parameter in detail
    if (definition.parameters && Object.keys(definition.parameters).length > 0) {
      console.log(`%c  📋 Parameter Details:`, 'color: #FF6B6B; font-weight: bold;');
      Object.entries(definition.parameters).forEach(([paramName, paramDef]: [string, any]) => {
        console.log(`    %c${paramName}%c: type=%c${paramDef.type || 'unknown'}%c, optional=%c${paramDef.optional || false}`, 
          'color: #FFD700; font-weight: bold;',
          'color: #CCC;',
          'color: #00D9FF;',
          'color: #CCC;',
          'color: #FF6B6B; font-weight: bold;'
        );
        console.log(`      %c${paramDef.description || '(no description)'}`, 'color: #AAA; font-style: italic;');
        if (paramDef.enum) {
          console.log(`      enum: %c[${paramDef.enum.join(', ')}]`, 'color: #FF6B6B;');
        }
      });
    }
    
    console.log(`%c✅ Tool "${name}" registered successfully\n`, 'color: #00FF88; font-weight: bold;');
    
    this.tools.set(name, { definition, handler });
  }

  /**
   * Register multiple tools at once
   */
  registerTools(tools: Record<string, { definition: VowelAction; handler: ToolHandler }>): void {
    for (const [name, tool] of Object.entries(tools)) {
      this.registerTool(name, tool.definition, tool.handler);
    }
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): void {
    this.tools.delete(name);
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool definitions for AI configuration
   */
  getToolDefinitions(): Record<string, VowelAction> {
    const definitions: Record<string, VowelAction> = {};
    for (const [name, tool] of this.tools.entries()) {
      definitions[name] = tool.definition;
    }
    return definitions;
  }

  /**
   * Execute a tool
   */
  async executeTool(name: string, params: any, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found`,
      };
    }

    try {
      const sanitizedParams = sanitizeToolParams(params, tool.definition);
      const result = await tool.handler(sanitizedParams, context);

      // Ensure we always return a ToolResult object
      if (result && typeof result === 'object' && ('success' in result || 'data' in result || 'error' in result)) {
        return {
          success: result.success ?? true,
          data: result.data ?? result.result ?? result,
          message: result.message ?? result.response ?? `Tool '${name}' executed successfully`,
          error: result.error,
        };
      }

      // If handler returns a simple value, wrap it in a ToolResult
      return {
        success: true,
        data: result,
        message: `Tool '${name}' executed successfully`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || `Tool '${name}' execution failed`,
      };
    }
  }

  /**
   * Get list of registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Register all default tools
   */
  private registerDefaultTools(): void {
    // Navigation tool
    this.registerTool("navigate", {
      description: "Navigate to a different page or route in the application. ALWAYS provide a concise action description.",
      parameters: {
        path: {
          type: "string",
          description: "The path to navigate to (e.g., '/products', '/cart', '/users/123')",
        },
        reason: {
          type: "string",
          description: "REQUIRED: Concise action description in present continuous tense (e.g., 'Going to contact page', 'Opening checkout', 'Navigating to products'). Keep it SHORT - maximum 4-5 words. This will be shown to the user.",
        },
      },
    }, async (params = {}, context) => {
      if (!context.router) {
        throw new Error("Router not available");
      }
      
      if (!params.path) {
        throw new Error("Path parameter is required");
      }
      
      // Show cursor with AI's reasoning BEFORE navigation
      // Access global cursor manager if available (set by VowelClient or controlled tab)
      const cursorManager = (window as any).__vowelFloatingCursorManager;
      if (cursorManager?.isActive?.()) {
        cursorManager.showAt({
          x: 50,  // Center of screen
          y: 50,
          text: params.reason || `Going to ${params.path}`,
          isIdle: false
        });
        console.log(`🎯 [ToolManager] Showing navigation cursor: "${params.reason}"`);
      }
      
      await context.router.navigate(params.path);
      return {
        navigated: true,
        path: params.path,
        reason: params.reason,
      };
    });

    // Get current page context tool
    this.registerTool("getCurrentPageContext", {
      description: "Get information about the current page/route",
      parameters: {},
    }, async (/*params,*/ context) => {
      return {
        currentPath: context.currentPath || context.router?.getCurrentPath() || window.location.pathname,
        timestamp: Date.now(),
        availableRoutes: context.routes?.length || 0,
      };
    });

    // List routes tool
    this.registerTool("listRoutes", {
      description: "Get a list of all available routes in the application",
      parameters: {
        includeParams: {
          type: "boolean",
          description: "Whether to include route parameters information",
          optional: true,
        },
      },
    }, async (params = {}, context) => {
      if (!context.routes || context.routes.length === 0) {
        // Try to extract routes from router if available
        const extractedRoutes = this.extractRoutesFromRouter(context.router);
        return {
          routes: extractedRoutes,
          total: extractedRoutes.length,
          source: "router",
        };
      }

      const routes = params.includeParams 
        ? context.routes 
        : context.routes.map(route => ({
            path: route.path,
            description: route.description,
          }));

      return {
        routes,
        total: routes.length,
        source: "configuration",
      };
    });
  }

  /**
   * Extract routes from router adapter
   */
  private extractRoutesFromRouter(router?: RouterAdapter): VowelRoute[] {
    if (!router || !router.getContext) {
      return [];
    }

    try {
      const context = router.getContext();
      
      // For TanStack Router, extract routes from router state
      if (context?.matches) {
        return context.matches.map((match: any) => ({
          path: match.pathname || match.routeId || 'unknown',
          description: `Route: ${match.routeId || match.pathname || 'Unknown route'}`,
          queryParams: match.params ? Object.keys(match.params) : undefined,
        }));
      }

      return [];
    } catch (error) {
      console.warn("Failed to extract routes from router:", error);
      return [];
    }
  }
}
