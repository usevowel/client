import { OpenAIRealtimeWebSocket } from '@openai/agents-realtime';

/**
 * xAI's realtime API is close to OpenAI's WebSocket protocol, but it rejects
 * some OpenAI-only client events that the stock transport auto-emits.
 */
export class GrokRealtimeWebSocketTransport extends OpenAIRealtimeWebSocket {
  private normalizeIncomingEvent(event: any): any {
    const rawData = event?.data;
    if (typeof rawData !== 'string') {
      return event;
    }

    try {
      const parsed = JSON.parse(rawData);
      const eventType = parsed?.type;
      const item = parsed?.item;
      const itemEventTypes = new Set([
        'conversation.item.added',
        'conversation.item.done',
        'conversation.item.retrieved',
        'response.output_item.added',
        'response.output_item.done',
      ]);

      if (!itemEventTypes.has(eventType) || !item || item.type !== 'message') {
        return event;
      }

      if (!Array.isArray(item.content)) {
        const normalizedContent = item.content == null
          ? []
          : Array.isArray(item.content)
            ? item.content
            : [item.content];

        const normalizedEvent = {
          ...parsed,
          item: {
            ...item,
            content: normalizedContent,
          },
        };

        console.warn('[grok] Normalized message item with invalid content shape:', {
          eventType,
          itemType: item.type,
          originalContentType: typeof item.content,
        });

        return {
          ...event,
          data: JSON.stringify(normalizedEvent),
        };
      }
    } catch {
      return event;
    }

    return event;
  }

  override _onMessage(event: any): void {
    super._onMessage(this.normalizeIncomingEvent(event));
  }

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
