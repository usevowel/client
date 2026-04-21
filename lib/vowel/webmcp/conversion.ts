/**
 * @fileoverview WebMCP Schema Conversion Utilities
 * 
 * This module provides functions for converting between Vowel legacy action format
 * and WebMCP JSON Schema format.
 * 
 * @module @vowel.to/client/webmcp/conversion
 */

import type { VowelLegacyAction, JSONSchema, VowelAction, VowelActionDefinition, VowelActionParameter } from "../types";

/**
 * Tool definition in WebMCP format
 */
export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
}

/**
 * Convert a legacy Vowel action to WebMCP JSON Schema format
 * 
 * @param name - Tool name
 * @param legacy - Legacy action definition
 * @returns WebMCP tool definition
 * 
 * @example
 * ```ts
 * const tool = convertLegacyToWebMCPSchema('searchProducts', {
 *   description: 'Search for products',
 *   parameters: {
 *     query: { type: 'string', description: 'Search query' }
 *   }
 * });
 * ```
 */
export function convertLegacyToWebMCPSchema(name: string, legacy: VowelLegacyAction): WebMCPTool {
  const properties: Record<string, JSONSchema> = {};
  const required: string[] = [];

  for (const [paramName, paramDef] of Object.entries(legacy.parameters)) {
    properties[paramName] = {
      type: paramDef.type,
      description: paramDef.description,
    };
    
    if (paramDef.enum) {
      properties[paramName].enum = paramDef.enum;
    }
    
    if (!paramDef.optional) {
      required.push(paramName);
    }
  }

  return {
    name,
    description: legacy.description,
    inputSchema: {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    },
  };
}

/**
 * Convert a WebMCP tool to Vowel legacy action format
 * (for backward compatibility)
 * 
 * @param tool - WebMCP tool definition
 * @returns Legacy action definition
 * 
 * @example
 * ```ts
 * const legacy = convertWebMCPToLegacy({
 *   name: 'searchProducts',
 *   description: 'Search for products',
 *   inputSchema: { ... }
 * });
 * ```
 */
export function convertWebMCPToLegacy(tool: WebMCPTool): VowelLegacyAction {
  const parameters: Record<string, VowelActionParameter> = {};
  
  if (tool.inputSchema.properties) {
    const required = new Set(tool.inputSchema.required ?? []);
    
    for (const [paramName, schema] of Object.entries(tool.inputSchema.properties)) {
      const jsonSchema = schema as JSONSchema;
      const paramType = (jsonSchema.type || 'string') as 'string' | 'number' | 'boolean' | 'array' | 'object';
      parameters[paramName] = {
        type: paramType,
        description: jsonSchema.description || '',
        optional: !required.has(paramName),
      };
    }
  }

  return {
    description: tool.description,
    parameters,
  } as VowelLegacyAction;
}

/**
 * Check if an action definition is in WebMCP format
 * 
 * @param action - Action definition
 * @returns true if WebMCP format
 * 
 * @example
 * ```ts
 * const isWebMCP = isWebMCPActionFormat({
 *   name: 'searchProducts',
 *   description: 'Search for products',
 *   inputSchema: { ... }
 * });
 * ```
 */
export function isWebMCPActionFormat(action: VowelActionDefinition): action is VowelAction {
  return 'inputSchema' in action && 'name' in action;
}

/**
 * Check if an action definition is in legacy format
 * 
 * @param action - Action definition
 * @returns true if legacy format
 * 
 * @example
 * ```ts
 * const isLegacy = isLegacyActionFormat({
 *   description: 'Search for products',
 *   parameters: { ... }
 * });
 * ```
 */
export function isLegacyActionFormat(action: VowelActionDefinition): action is VowelLegacyAction {
  return 'parameters' in action && !('inputSchema' in action);
}