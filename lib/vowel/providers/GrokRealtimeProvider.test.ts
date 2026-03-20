import { describe, expect, test } from 'bun:test'
import { GrokRealtimeProvider } from './GrokRealtimeProvider'
import { RealtimeMessageType } from './RealtimeProvider'
import { GrokRealtimeWebSocketTransport } from './GrokRealtimeWebSocketTransport'

class MockEmitter {
  private listeners = new Map<string, Array<(event: any) => void>>()
  transport?: MockEmitter

  on(eventName: string, listener: (event: any) => void): void {
    const listeners = this.listeners.get(eventName) ?? []
    listeners.push(listener)
    this.listeners.set(eventName, listeners)
  }

  emit(eventName: string, event: any): void {
    for (const listener of this.listeners.get(eventName) ?? []) {
      listener(event)
    }
  }
}

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

  test('omits model but keeps minimal server_vad turn detection for Grok voice sessions', () => {
    const provider = new GrokRealtimeProvider({
      token: 'test-token',
      model: 'grok-4-voice',
    }, {})

    const sessionConfig = (provider as any).buildSessionConfig({} as any, 'Rex')

    expect(sessionConfig.model).toBeUndefined()
    expect(sessionConfig.config.audio.input.turnDetection).toEqual({
      type: 'server_vad',
    })
  })

  test('passes through explicit Grok turn detection overrides only when configured', () => {
    const provider = new GrokRealtimeProvider({
      token: 'test-token',
      model: 'grok-4-voice',
      metadata: {
        turnDetection: {
          serverVAD: {
            threshold: 0.55,
            silenceDurationMs: 900,
          },
        },
      },
    }, {})

    const sessionConfig = (provider as any).buildSessionConfig({} as any, 'Rex')

    expect(sessionConfig.config.audio.input.turnDetection).toEqual({
      type: 'server_vad',
      threshold: 0.55,
      silenceDurationMs: 900,
    })
  })

  test('sanitizes SDK semantic_vad defaults into server_vad for outgoing Grok session updates', () => {
    const sanitizedEvent = GrokRealtimeWebSocketTransport.sanitizeEvent({
      type: 'session.update',
      session: {
        model: 'gpt-realtime',
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            turn_detection: {
              type: 'semantic_vad',
            },
          },
        },
      },
    })

    expect(sanitizedEvent.session.model).toBeUndefined()
    expect(sanitizedEvent.session.audio.input.turn_detection).toEqual({
      type: 'server_vad',
    })
  })

  test('normalizes explicit semantic_vad Grok overrides to server_vad', () => {
    const sanitizedEvent = GrokRealtimeWebSocketTransport.sanitizeEvent({
      type: 'session.update',
      session: {
        audio: {
          input: {
            turn_detection: {
              type: 'semantic_vad',
              threshold: 0.6,
              silence_duration_ms: 700,
            },
          },
        },
      },
    })

    expect(sanitizedEvent.session.audio.input.turn_detection).toEqual({
      type: 'server_vad',
      threshold: 0.6,
      silence_duration_ms: 700,
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

  test('deduplicates Grok transport and turn lifecycle events for a single response', () => {
    const messages: Array<{ type: string; payload: any }> = []
    const provider = new GrokRealtimeProvider({
      token: 'test-token',
      model: 'grok-4-voice',
    }, {
      onMessage: (message) => {
        messages.push({
          type: message.type,
          payload: message.payload,
        })
      },
    })

    const session = new MockEmitter()
    session.transport = new MockEmitter()

    ;(provider as any).session = session
    ;(provider as any).setupEventListeners()

    session.emit('transport_event', {
      type: 'response.created',
      response: { id: 'resp-1' },
    })
    session.emit('turn_started', {
      providerData: {
        response: {
          id: 'resp-1',
          output: [{ id: 'item-1' }],
        },
      },
    })

    session.emit('transport_event', {
      type: 'response.text.done',
      text: 'Graduate certificates focus on advanced specialization.',
      response_id: 'resp-1',
      item_id: 'item-1',
    })
    session.emit('turn_done', {
      response: {
        id: 'resp-1',
        usage: { total_tokens: 42 },
        output: [{
          id: 'item-1',
          content: [{
            type: 'audio',
            transcript: 'Graduate certificates focus on advanced specialization and assume prior undergraduate work.',
          }],
        }],
      },
    })

    session.emit('transport_event', {
      type: 'conversation.item.input_audio_transcription.completed',
      transcript: 'Compare a graduate and undergraduate certificate.',
      item_id: 'user-item-1',
    })
    session.emit('conversation.item.input_audio_transcription.completed', {
      transcript: 'Compare a graduate and undergraduate certificate.',
      item_id: 'user-item-1',
    })

    expect(messages.filter((message) => message.type === RealtimeMessageType.RESPONSE_CREATED)).toHaveLength(1)
    expect(messages.filter((message) => message.type === RealtimeMessageType.RESPONSE_DONE)).toHaveLength(1)
    expect(
      messages.filter((message) =>
        message.type === RealtimeMessageType.TRANSCRIPT_DONE && message.payload.role === 'assistant'
      )
    ).toHaveLength(1)
    expect(
      messages.filter((message) =>
        message.type === RealtimeMessageType.TRANSCRIPT_DONE && message.payload.role === 'user'
      )
    ).toHaveLength(1)
  })
})
