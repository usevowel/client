import { OpenAIRealtimeWebSocket } from '@openai/agents-realtime';

/**
 * xAI's realtime API is close to OpenAI's WebSocket protocol, but it rejects
 * some OpenAI-only client events that the stock transport auto-emits.
 *
 * Incoming frame normalization is applied in {@link createGrokNormalizingWebSocket}
 * (via `createWebSocket` in {@link GrokRealtimeProvider}) so both `_onMessage` and
 * the transport's internal `message` listener see the same payload.
 */
export class GrokRealtimeWebSocketTransport extends OpenAIRealtimeWebSocket {
  override sendEvent(event: any): void {
    if (event?.type === 'conversation.item.retrieve') {
      console.debug('[grok] Skipping unsupported client event:', event.type, event);
      return;
    }

    if (event?.type === 'response.create') {
      console.log('[grok] Sending client event: response.create');
    }

    if (event?.type === 'conversation.item.create' && event?.item?.type === 'function_call_output') {
      console.log('[grok] Sending client event: function_call_output', {
        call_id: event.item.call_id,
      });
    }

    super.sendEvent(event);
  }
}
