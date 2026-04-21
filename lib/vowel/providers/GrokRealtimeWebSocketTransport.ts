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
      let normalizedEvent = parsed;
      let didNormalize = false;

      if ('previous_item_id' in parsed) {
        normalizedEvent = { ...normalizedEvent };
        // delete normalizedEvent.previous_item_id;
        didNormalize = true;

        console.warn('[grok] Removed unsupported previous_item_id field:', {
          eventType,
        });
      }

      if (
        (eventType === 'response.created' || eventType === 'response.done') &&
        typeof parsed?.response?.status_details === 'string'
      ) {
        normalizedEvent = {
          ...normalizedEvent,
          response: {
            ...normalizedEvent.response,
            status_details: {
              type: normalizedEvent.response.status_details,
            },
          },
        };
        didNormalize = true;

        console.warn('[grok] Normalized response status_details string:', {
          eventType,
          status: normalizedEvent.response.status,
          originalStatusDetailsType: typeof parsed.response.status_details,
        });
      }

      if (eventType === 'response.content_part.done' && parsed?.part == null) {
        normalizedEvent = {
          ...normalizedEvent,
          part: {},
        };
        didNormalize = true;

        console.warn('[grok] Normalized missing content part:', {
          eventType,
        });
      }

      const itemEventTypes = new Set([
        'conversation.item.added',
        'conversation.item.done',
        'conversation.item.retrieved',
        'response.output_item.added',
        'response.output_item.done',
      ]);

      if (!itemEventTypes.has(eventType) || !item || item.type !== 'message') {
        if (!didNormalize) {
          return event;
        }

        return {
          ...event,
          data: JSON.stringify(normalizedEvent),
        };
      }

      if (!Array.isArray(item.content)) {
        const normalizedContent = item.content == null
          ? []
          : Array.isArray(item.content)
            ? item.content
            : [item.content];

        normalizedEvent = {
          ...normalizedEvent,
          item: {
            ...item,
            content: normalizedContent,
          },
        };
        didNormalize = true;

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
