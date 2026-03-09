/**
 * @fileoverview Audio Worklet Processor for microphone input
 * 
 * This AudioWorklet runs on a separate audio rendering thread, providing
 * better performance and lower latency than the deprecated ScriptProcessorNode.
 * It processes microphone input, converts to PCM16 format, and sends to main thread.
 * 
 * @module @vowel.to/client/managers
 * @author vowel.to
 * @license Proprietary
 */

/**
 * Base64 encoding table
 * btoa() is not available in AudioWorklet context, so we implement our own
 */
const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Encode Uint8Array to base64 string
 * Custom implementation for AudioWorklet context
 * @param {Uint8Array} bytes - Bytes to encode
 * @returns {string} Base64 encoded string
 */
function encodeBase64(bytes) {
  let result = '';
  const len = bytes.length;
  
  for (let i = 0; i < len; i += 3) {
    const byte1 = bytes[i];
    const byte2 = i + 1 < len ? bytes[i + 1] : 0;
    const byte3 = i + 2 < len ? bytes[i + 2] : 0;
    
    const encoded1 = byte1 >> 2;
    const encoded2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
    const encoded3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
    const encoded4 = byte3 & 0x3f;
    
    result += base64Chars[encoded1];
    result += base64Chars[encoded2];
    result += i + 1 < len ? base64Chars[encoded3] : '=';
    result += i + 2 < len ? base64Chars[encoded4] : '=';
  }
  
  return result;
}

/**
 * VowelAudioProcessor - processes microphone audio for streaming to Gemini Live
 * Runs on the audio rendering thread for optimal performance
 */
class VowelAudioProcessor extends AudioWorkletProcessor {
  /**
   * @param {Object} options - Processor options
   */
  constructor(options) {
    super();
    
    // Get sample rates from options
    this.inputSampleRate = options.processorOptions?.inputSampleRate || 16000;
    this.targetSampleRate = options.processorOptions?.targetSampleRate || 16000;
    this.needsResampling = this.inputSampleRate !== this.targetSampleRate;
    
    // Buffer for accumulating samples before sending
    // Configurable via processorOptions.bufferSize (see AUDIO_CAPTURE_CONFIG in constants.ts)
    // 2048 = smaller chunks, more responsive; 4096 = larger chunks, original behavior
    this.bufferSize = options.processorOptions?.bufferSize ?? 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    
    console.log(`🎤 AudioWorklet initialized: ${this.inputSampleRate}Hz → ${this.targetSampleRate}Hz (resampling: ${this.needsResampling}), buffer: ${this.bufferSize} samples`);
  }
  
  /**
   * Resample audio from input sample rate to target sample rate
   * Uses linear interpolation for downsampling
   * 
   * @param {Float32Array} inputData - Input audio samples
   * @returns {Float32Array} Resampled audio
   */
  resampleAudio(inputData) {
    if (!this.needsResampling) {
      return inputData;
    }
    
    const ratio = this.inputSampleRate / this.targetSampleRate;
    const outputLength = Math.round(inputData.length / ratio);
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const position = i * ratio;
      const index = Math.floor(position);
      const fraction = position - index;
      
      if (index + 1 < inputData.length) {
        // Linear interpolation
        const sample1 = inputData[index];
        const sample2 = inputData[index + 1];
        output[i] = sample1 + (sample2 - sample1) * fraction;
      } else {
        output[i] = inputData[index];
      }
    }
    
    return output;
  }
  
  /**
   * Process audio samples from microphone
   * Called automatically by the audio rendering thread
   * 
   * @param {Float32Array[][]} inputs - Audio input buffers
   * @param {Float32Array[][]} outputs - Audio output buffers (unused)
   * @param {Record<string, Float32Array>} parameters - Parameter values (unused)
   * @returns {boolean} true to keep processor alive
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // No input data available
    if (!input || !input[0]) {
      return true;
    }

    let pcmData = input[0]; // First channel (mono)
    
    // Resample if needed (e.g., 48kHz → 24kHz on Safari/Firefox)
    if (this.needsResampling) {
      pcmData = this.resampleAudio(pcmData);
    }
    
    // Accumulate samples into buffer
    for (let i = 0; i < pcmData.length; i++) {
      this.buffer[this.bufferIndex++] = pcmData[i];
      
      // Buffer full? Send it!
      if (this.bufferIndex >= this.bufferSize) {
        this.sendBuffer();
        this.bufferIndex = 0;
      }
    }

    return true; // Keep processor alive
  }
  
  /**
   * Convert accumulated buffer to PCM16 and send to main thread
   */
  sendBuffer() {
    // Use configured bufferSize to ensure we always send full chunks
    const samplesToSend = this.bufferSize;
    
    // Convert Float32Array to Int16Array for PCM16 encoding
    const int16 = new Int16Array(samplesToSend);
    for (let i = 0; i < samplesToSend; i++) {
      // Convert float32 -1 to 1 to int16 -32768 to 32767
      // Clamp to prevent overflow
      let sample = Math.max(-1, Math.min(1, this.buffer[i]));
      // Use asymmetric scaling: -32768 for negative, +32767 for positive
      // This matches the Int16 range and prevents distortion
      int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    // Encode to base64 using custom encoder (btoa not available in AudioWorklet)
    const uint8 = new Uint8Array(int16.buffer);
    const base64Data = encodeBase64(uint8);

    // Send encoded audio to main thread
    this.port.postMessage({
      type: 'audio',
      data: base64Data
    });
  }
}

// Register the processor
registerProcessor('vowel-audio-processor', VowelAudioProcessor);

