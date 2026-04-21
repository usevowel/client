import { normalizeRealtimeEvent } from './normalizeRealtimeEvent';

/**
 * Wraps a browser {@link WebSocket} so every `message` listener receives payloads
 * after {@link normalizeRealtimeEvent} has been applied to the frame.
 *
 * The OpenAI Agents `OpenAIRealtimeWebSocket` transport parses each incoming frame
 * twice: once inside `_onMessage` and again in its own `message` listener for audio,
 * interruption, and response sequencing. Overriding `_onMessage` alone does not affect
 * that second parse, so normalization must happen before any SDK listener runs.
 *
 * This wrapper intercepts `addEventListener` / `removeEventListener` for `message`
 * only; all other behavior is delegated to the underlying socket.
 */
export class GrokNormalizingWebSocket {
  private readonly inner: WebSocket;
  private readonly messageWrappers = new WeakMap<
    EventListenerOrEventListenerObject,
    EventListener
  >();

  public constructor(url: string | URL, protocols?: string | string[]) {
    this.inner = new WebSocket(url, protocols);
  }

  public get binaryType(): BinaryType {
    return this.inner.binaryType;
  }

  public set binaryType(value: BinaryType) {
    this.inner.binaryType = value;
  }

  public get bufferedAmount(): number {
    return this.inner.bufferedAmount;
  }

  public get extensions(): string {
    return this.inner.extensions;
  }

  public get onclose(): ((this: WebSocket, ev: CloseEvent) => unknown) | null {
    return this.inner.onclose;
  }

  public set onclose(value: ((this: WebSocket, ev: CloseEvent) => unknown) | null) {
    this.inner.onclose = value;
  }

  public get onerror(): ((this: WebSocket, ev: Event) => unknown) | null {
    return this.inner.onerror;
  }

  public set onerror(value: ((this: WebSocket, ev: Event) => unknown) | null) {
    this.inner.onerror = value;
  }

  public get onmessage(): ((this: WebSocket, ev: MessageEvent) => unknown) | null {
    return this.inner.onmessage;
  }

  public set onmessage(value: ((this: WebSocket, ev: MessageEvent) => unknown) | null) {
    this.inner.onmessage = value;
  }

  public get onopen(): ((this: WebSocket, ev: Event) => unknown) | null {
    return this.inner.onopen;
  }

  public set onopen(value: ((this: WebSocket, ev: Event) => unknown) | null) {
    this.inner.onopen = value;
  }

  public get protocol(): string {
    return this.inner.protocol;
  }

  public get readyState(): number {
    return this.inner.readyState;
  }

  public get url(): string {
    return this.inner.url;
  }

  public close(code?: number, reason?: string): void {
    this.inner.close(code, reason);
  }

  public send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    this.inner.send(data);
  }

  public addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (type === 'message' && listener != null) {
      const wrapped = this.wrapMessageListener(listener);
      this.messageWrappers.set(listener, wrapped);
      this.inner.addEventListener(type, wrapped, options);
      return;
    }
    this.inner.addEventListener(type, listener as EventListener, options);
  }

  public removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    if (type === 'message' && listener != null) {
      const wrapped = this.messageWrappers.get(listener);
      if (wrapped) {
        this.inner.removeEventListener(type, wrapped, options);
        this.messageWrappers.delete(listener);
      }
      return;
    }
    this.inner.removeEventListener(type, listener as EventListener, options);
  }

  public dispatchEvent(event: Event): boolean {
    return this.inner.dispatchEvent(event);
  }

  /**
   * Builds a `message` handler that applies Grok/OpenAI shape normalization
   * before invoking the SDK's listener.
   */
  private wrapMessageListener(
    listener: EventListenerOrEventListenerObject,
  ): EventListener {
    if (typeof listener === 'function') {
      return (ev: Event) => {
        const normalized = normalizeRealtimeEvent(ev as MessageEvent);
        listener.call(this, normalized as Event);
      };
    }
    return (ev: Event) => {
      const normalized = normalizeRealtimeEvent(ev as MessageEvent);
      listener.handleEvent(normalized);
    };
  }
}

/**
 * Opens a realtime WebSocket with Grok/xAI protocol headers and incoming
 * message normalization compatible with the OpenAI Agents transport.
 *
 * @param url - WebSocket URL (e.g. xAI realtime endpoint).
 * @param protocols - Subprotocol list; must include `realtime` and the xAI secret subprotocol.
 * @returns A socket compatible with {@link WebSocket} for the Agents SDK transport.
 */
export function createGrokNormalizingWebSocket(
  url: string | URL,
  protocols: string | string[],
): WebSocket {
  return new GrokNormalizingWebSocket(url, protocols) as unknown as WebSocket;
}
