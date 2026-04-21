export function normalizeRealtimeEvent(event: any): any {
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
      delete normalizedEvent.previous_item_id;
      didNormalize = true;

      console.warn('[realtime] Removed unsupported previous_item_id field:', {
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

      console.warn('[realtime] Normalized response status_details string:', {
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

      console.warn('[realtime] Normalized missing content part:', {
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

      console.warn('[realtime] Normalized message item with invalid content shape:', {
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
