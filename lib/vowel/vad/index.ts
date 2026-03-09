/**
 * @fileoverview VAD Module Index
 * 
 * Main entry point for the VAD (Voice Activity Detection) module.
 * Exports all VAD-related types, interfaces, and utilities.
 * 
 * @module @vowel.to/client/vad
 * @author vowel.to
 * @license Proprietary
 */

// Export adapter interfaces and types
export type {
  VADAdapter,
  VADConfig,
  VADState,
  VADMetadata,
  VADFactory,
  VADSpeechStartEvent,
  VADSpeechEndEvent,
  VADSpeechProgressEvent,
  VADStateChangeEvent,
  VADReadyEvent,
  VADErrorEvent,
  VADEvent,
} from './VADAdapter';

// Export error classes and event emitter
export { VADInitializationError, VADProcessingError, VADEventEmitter } from './VADAdapter';

// Export registry
export { VADRegistry } from './VADRegistry';

// Export Smart Turn adapter
export { SmartTurnAdapter, SmartTurnFactory, registerSmartTurnAdapter } from './adapters/SmartTurnAdapter';
export type { SmartTurnConfig } from './adapters/SmartTurnAdapter';

// Export Silero VAD adapter (new default)
export { SileroVADAdapter, SileroVADFactory, registerSileroVADAdapter } from './adapters/SileroVADAdapter';
export type { SileroVADConfig } from './adapters/SileroVADAdapter';

// Export Simple VAD adapter (energy-based)
export { SimpleVADAdapter, SimpleVADFactory, registerSimpleVADAdapter } from './adapters/SimpleVADAdapter';
export type { SimpleVADConfig } from './adapters/SimpleVADAdapter';
