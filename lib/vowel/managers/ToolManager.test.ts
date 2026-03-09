import { describe, expect, test } from 'bun:test'
import { ToolManager } from './ToolManager'

describe('ToolManager', () => {
  test('sanitizes null scalar tool params to omitted values', async () => {
    const toolManager = new ToolManager()

    let receivedParams: Record<string, unknown> | undefined

    toolManager.registerTool('testNullSanitization', {
      description: 'Test tool',
      parameters: {
        query: { type: 'string', description: 'Optional query', optional: true },
        minPrice: { type: 'number', description: 'Optional min price', optional: true },
        onSale: { type: 'boolean', description: 'Optional sale flag', optional: true },
      },
    }, async (params) => {
      receivedParams = params
      return { success: true }
    })

    await toolManager.executeTool('testNullSanitization', {
      query: null,
      minPrice: null,
      onSale: null,
    }, {})

    expect(receivedParams).toEqual({})
  })

  test('sanitizes null arrays and objects to empty values', async () => {
    const toolManager = new ToolManager()

    let receivedParams: Record<string, unknown> | undefined

    toolManager.registerTool('testStructuredNullSanitization', {
      description: 'Test tool',
      parameters: {
        tags: { type: 'array', description: 'Optional tags', optional: true },
        metadata: { type: 'object', description: 'Optional metadata', optional: true },
      },
    }, async (params) => {
      receivedParams = params
      return { success: true }
    })

    await toolManager.executeTool('testStructuredNullSanitization', {
      tags: null,
      metadata: null,
    }, {})

    expect(receivedParams).toEqual({
      tags: [],
      metadata: {},
    })
  })
})
