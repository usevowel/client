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

  test('registers navigation tools by default', () => {
    const toolManager = new ToolManager()
    const names = toolManager.getToolNames()
    expect(names).toContain('navigate')
    expect(names).toContain('getCurrentPageContext')
    expect(names).toContain('listRoutes')
  })

  test('skips navigation tools when enableNavigation is false', () => {
    const toolManager = new ToolManager({ enableNavigation: false })
    const names = toolManager.getToolNames()
    expect(names).not.toContain('navigate')
    expect(names).not.toContain('getCurrentPageContext')
    expect(names).not.toContain('listRoutes')
  })

  test('registers navigation tools when enableNavigation is true', () => {
    const toolManager = new ToolManager({ enableNavigation: true })
    const names = toolManager.getToolNames()
    expect(names).toContain('navigate')
    expect(names).toContain('getCurrentPageContext')
    expect(names).toContain('listRoutes')
  })
})
