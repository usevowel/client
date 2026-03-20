import { describe, expect, test } from 'bun:test'
import { GrokRealtimeProvider } from './GrokRealtimeProvider'

describe('GrokRealtimeProvider', () => {
  test('uses Grok-specific audio defaults tuned for websocket streaming', () => {
    const provider = new GrokRealtimeProvider({
      token: 'test-token',
      model: 'grok-4-voice',
    }, {})

    expect(provider.getPreferredInputChunkSizeSamples()).toBe(768)
    expect(provider.getPreferredCommitChunkSizeBytes()).toBe(1536)
    expect(provider.getOutputAudioFormat()).toEqual({
      mimeType: 'audio/pcm;rate=24000',
      sampleRate: 24000,
      channels: 1,
      encoding: 'pcm16',
    })
  })

  test('uses less aggressive server VAD defaults for Grok turns', () => {
    const provider = new GrokRealtimeProvider({
      token: 'test-token',
      model: 'grok-4-voice',
    }, {})

    expect((provider as any).buildTurnDetectionConfig()).toEqual({
      type: 'server_vad',
      threshold: 0.6,
      silenceDurationMs: 800,
      prefixPaddingMs: 333,
      interruptResponse: true,
    })
  })

  test('sends instructions-only session.update payload for live updates', () => {
    const provider = new GrokRealtimeProvider({
      token: 'test-token',
      model: 'grok-4-voice',
      voice: 'Rex',
      systemInstructions: 'initial instructions',
    }, {})

    const sentEvents: unknown[] = []

    ;(provider as any).session = {
      transport: {
        sendEvent: (event: unknown) => {
          sentEvents.push(event)
        },
      },
    }
    ;(provider as any).isConnected = true

    provider.sendSessionUpdate({
      instructions: 'updated instructions with context',
    })

    expect(sentEvents).toHaveLength(1)
    expect(sentEvents[0]).toEqual({
      type: 'session.update',
      session: {
        instructions: 'updated instructions with context',
      },
    })
    expect((provider as any).config.systemInstructions).toBe('updated instructions with context')
    expect((provider as any).originalAgentConfig).toBeNull()
  })
})
