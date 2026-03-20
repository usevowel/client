import { describe, expect, test } from 'bun:test'
import { SessionManager } from './SessionManager'
import { RealtimeMessageType } from '../providers/RealtimeProvider'

function createSessionManager(): SessionManager {
  return new SessionManager({
    routes: [],
    toolManager: {} as any,
    audioManager: {
      clearInterrupt: () => {},
      isStreaming: () => false,
    } as any,
    voiceConfig: {
      initialGreetingPrompt: 'Welcome the student and explain you can help compare programs.',
    },
  })
}

function createConnectedProvider(sentPrompts: string[]): any {
  return {
    getConnectionState: () => 'connected',
    getProviderId: () => 'grok',
    sendText: (text: string) => {
      sentPrompts.push(text)
    },
  }
}

async function waitForGreetingWindow(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200))
}

describe('SessionManager', () => {
  test('cancels hosted initial greeting when user speech starts first', async () => {
    const sessionManager = createSessionManager()
    const sentPrompts: string[] = []

    ;(sessionManager as any).provider = createConnectedProvider(sentPrompts)
    ;(sessionManager as any).scheduleHostedInitialGreeting('grok')

    await (sessionManager as any).handleProviderMessage({
      type: RealtimeMessageType.AUDIO_BUFFER_SPEECH_STARTED,
      payload: {},
    }, {} as any)

    await waitForGreetingWindow()

    expect(sentPrompts).toHaveLength(0)
  })

  test('cancels hosted initial greeting when text is sent before the timer fires', async () => {
    const sessionManager = createSessionManager()
    const sentPrompts: string[] = []

    ;(sessionManager as any).provider = createConnectedProvider(sentPrompts)
    ;(sessionManager as any).scheduleHostedInitialGreeting('grok')

    await sessionManager.sendText('Compare a graduate and undergraduate certificate.')
    await waitForGreetingWindow()

    expect(sentPrompts).toEqual([
      'Compare a graduate and undergraduate certificate.',
    ])
  })
})
