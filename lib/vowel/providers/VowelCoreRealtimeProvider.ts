import type { ProviderType } from "../types/providers";
import {
  type RealtimeProviderCallbacks,
  type RealtimeProviderConfig,
} from "./RealtimeProvider";
import { VowelPrimeRealtimeProvider } from "./VowelPrimeRealtimeProvider";

/**
 * Self-hosted Core realtime provider.
 *
 * This intentionally reuses the Vowel Prime websocket transport because Core
 * still talks to the paired self-hosted engine over the same realtime protocol.
 */
export class VowelCoreRealtimeProvider extends VowelPrimeRealtimeProvider {
  constructor(config: RealtimeProviderConfig, callbacks: RealtimeProviderCallbacks) {
    super(config, callbacks);
  }

  getProviderId(): ProviderType {
    return "vowel-core";
  }
}
