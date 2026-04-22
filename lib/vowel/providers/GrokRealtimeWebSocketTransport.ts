import { OpenAIRealtimeWebSocket } from '@openai/agents-realtime';
import { normalizeRealtimeEvent } from './normalizeRealtimeEvent';

/**
 * xAI's realtime API is close to OpenAI's WebSocket protocol, but it rejects
 * some OpenAI-only client events that the stock transport auto-emits.
 */
export class GrokRealtimeWebSocketTransport extends OpenAIRealtimeWebSocket {
  private normalizeIncomingEvent(event: any): any {
    return normalizeRealtimeEvent(event);
  }

  override _onMessage(event: any): void {
    super._onMessage(this.normalizeIncomingEvent(event));
  }

  override sendEvent(event: any): void {
    if (event?.type === 'conversation.item.retrieve') {
      console.debug('[grok] Skipping unsupported client event:', event.type, event);
      return;
    }

    super.sendEvent(event);
  }
}
