import { OpenAIRealtimeWebSocket } from '@openai/agents-realtime';

/**
 * xAI's realtime API is close to OpenAI's WebSocket protocol, but it rejects
 * some OpenAI-only client events that the stock transport auto-emits.
 */
export class GrokRealtimeWebSocketTransport extends OpenAIRealtimeWebSocket {
  static sanitizeEvent(event: any): any {
    if (event?.type !== 'session.update' || !event.session) {
      return event;
    }

    const sanitizedEvent = {
      ...event,
      session: {
        ...event.session,
      },
    };

    delete sanitizedEvent.session.model;

    const audioInput = sanitizedEvent.session.audio?.input;
    if (!audioInput) {
      return sanitizedEvent;
    }

    const turnDetection = audioInput.turn_detection;
    if (!turnDetection || typeof turnDetection !== 'object') {
      return sanitizedEvent;
    }

    if (turnDetection.type === 'semantic_vad') {
      audioInput.turn_detection = {
        ...turnDetection,
        type: 'server_vad',
      };
    }

    return sanitizedEvent;
  }

  override sendEvent(event: any): void {
    if (event?.type === 'conversation.item.retrieve') {
      console.debug('[grok] Skipping unsupported client event:', event.type, event);
      return;
    }

    super.sendEvent(GrokRealtimeWebSocketTransport.sanitizeEvent(event));
  }
}
