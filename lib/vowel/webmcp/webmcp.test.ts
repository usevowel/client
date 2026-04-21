/**
 * @fileoverview WebMCP Module Tests
 * 
 * Tests for WebMCP integration functionality including:
 * - Schema conversion (legacy <-> WebMCP)
 * - Tool registration and discovery
 * - API availability detection
 * 
 * @module @vowel.to/client/webmcp/test
 */

import { describe, test, expect } from 'bun:test';
import {
  isWebMCPAvailable,
  isWebMCPTestingAvailable,
  convertToWebMCPTool,
} from './index';
import {
  convertLegacyToWebMCPSchema,
  convertWebMCPToLegacy,
  isWebMCPActionFormat,
  isLegacyActionFormat,
} from './conversion';

describe('WebMCP Schema Conversion', () => {
  describe('convertLegacyToWebMCPSchema', () => {
    test('converts legacy action to WebMCP format', () => {
      const legacy = {
        description: 'Search for products',
        parameters: {
          query: {
            type: 'string' as const,
            description: 'Search query',
          },
          limit: {
            type: 'number' as const,
            description: 'Maximum results',
            optional: true,
          },
        },
      };

      const result = convertLegacyToWebMCPSchema('searchProducts', legacy);

      expect(result.name).toBe('searchProducts');
      expect(result.description).toBe('Search for products');
      expect(result.inputSchema.type).toBe('object');
      expect(result.inputSchema.properties?.query?.type).toBe('string');
      expect(result.inputSchema.properties?.limit?.type).toBe('number');
      expect(result.inputSchema.required).toContain('query');
      expect(result.inputSchema.required).not.toContain('limit');
    });

    test('handles empty parameters', () => {
      const legacy = {
        description: 'Get current time',
        parameters: {},
      };

      const result = convertLegacyToWebMCPSchema('getTime', legacy);

      expect(result.name).toBe('getTime');
      expect(result.description).toBe('Get current time');
      expect(result.inputSchema.properties).toEqual({});
    });

    test('handles enum values', () => {
      const legacy = {
        description: 'Set status',
        parameters: {
          status: {
            type: 'string' as const,
            description: 'User status',
            enum: ['active', 'away', 'busy'],
          },
        },
      };

      const result = convertLegacyToWebMCPSchema('setStatus', legacy);

      expect(result.inputSchema.properties?.status?.enum).toEqual(['active', 'away', 'busy']);
    });
  });

  describe('convertWebMCPToLegacy', () => {
    test('converts WebMCP tool to legacy format', () => {
      const webMCP = {
        name: 'searchProducts',
        description: 'Search for products',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string' as const,
              description: 'Search query',
            },
          },
          required: ['query'],
        },
      };

      const result = convertWebMCPToLegacy(webMCP);

      expect(result.description).toBe('Search for products');
      expect(result.parameters.query.type).toBe('string');
      expect(result.parameters.query.description).toBe('Search query');
      expect(result.parameters.query.optional).toBe(false);
    });

    test('handles optional parameters', () => {
      const webMCP = {
        name: 'searchProducts',
        description: 'Search for products',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string' as const,
              description: 'Search query',
            },
            limit: {
              type: 'number' as const,
              description: 'Max results',
            },
          },
        },
      };

      const result = convertWebMCPToLegacy(webMCP);

      expect(result.parameters.query.optional).toBe(true);
      expect(result.parameters.limit.optional).toBe(true);
    });
  });

  describe('convertToWebMCPTool', () => {
    test('converts WebMCP-style action', () => {
      const action = {
        name: 'searchProducts',
        description: 'Search for products',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' as const, description: 'Search query' },
          },
          required: ['query'],
        },
      };

      const result = convertToWebMCPTool('searchProducts', action);

      expect(result?.name).toBe('searchProducts');
      expect(result?.description).toBe('Search for products');
    });

    test('converts legacy action', () => {
      const action = {
        description: 'Search for products',
        parameters: {
          query: { type: 'string' as const, description: 'Search query' },
        },
      };

      const result = convertToWebMCPTool('searchProducts', action);

      expect(result?.name).toBe('searchProducts');
      expect(result?.description).toBe('Search for products');
      expect(result?.inputSchema.properties?.query?.type).toBe('string');
    });
  });

  describe('isWebMCPActionFormat', () => {
    test('returns true for WebMCP format', () => {
      const action = {
        name: 'searchProducts',
        description: 'Search for products',
        inputSchema: { type: 'object' as const },
      };

      expect(isWebMCPActionFormat(action)).toBe(true);
    });

    test('returns false for legacy format', () => {
      const action = {
        description: 'Search for products',
        parameters: { query: { type: 'string' as const, description: 'Search query' } },
      };

      expect(isWebMCPActionFormat(action)).toBe(false);
    });
  });

  describe('isLegacyActionFormat', () => {
    test('returns true for legacy format', () => {
      const action = {
        description: 'Search for products',
        parameters: { query: { type: 'string' as const, description: 'Search query' } },
      };

      expect(isLegacyActionFormat(action)).toBe(true);
    });

    test('returns false for WebMCP format', () => {
      const action = {
        name: 'searchProducts',
        description: 'Search for products',
        inputSchema: { type: 'object' as const },
      };

      expect(isLegacyActionFormat(action)).toBe(false);
    });
  });
});

describe('WebMCP API Detection', () => {
  describe('isWebMCPAvailable', () => {
    test('returns false in test environment', () => {
      // In test environment, navigator is not defined
      expect(isWebMCPAvailable()).toBe(false);
    });
  });

  describe('isWebMCPTestingAvailable', () => {
    test('returns false in test environment', () => {
      expect(isWebMCPTestingAvailable()).toBe(false);
    });
  });
});

describe('WebMCP Integration', () => {
  test('WebMCP module exports are available', () => {
    // Verify all expected exports exist
    expect(typeof isWebMCPAvailable).toBe('function');
    expect(typeof isWebMCPTestingAvailable).toBe('function');
    expect(typeof convertToWebMCPTool).toBe('function');
    expect(typeof convertLegacyToWebMCPSchema).toBe('function');
    expect(typeof convertWebMCPToLegacy).toBe('function');
    expect(typeof isWebMCPActionFormat).toBe('function');
    expect(typeof isLegacyActionFormat).toBe('function');
  });
});