import { describe, expect, test } from 'bun:test';
import { BargeInDetector } from './BargeInDetector';

const SR = 24000;
const FRAME_SIZE = 2048;

function makeSilence(): Float32Array {
  return new Float32Array(FRAME_SIZE);
}

function makeTone(freq: number, amp: number, samples = FRAME_SIZE): Float32Array {
  const arr = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    arr[i] = Math.sin((2 * Math.PI * freq * i) / SR) * amp;
  }
  return arr;
}

function makeNoise(amp: number, samples = FRAME_SIZE): Float32Array {
  const arr = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    arr[i] = (Math.random() * 2 - 1) * amp;
  }
  return arr;
}

function floatToPcm16(float: Float32Array): Int16Array {
  const pcm = new Int16Array(float.length);
  for (let i = 0; i < float.length; i++) {
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round(float[i] * 32768)));
  }
  return pcm;
}

describe('BargeInDetector', () => {
  test('passthrough when AI is not speaking', () => {
    const det = new BargeInDetector(SR);
    const mic = makeNoise(0.1);
    const pcm = floatToPcm16(mic);
    const result = det.observeMic(mic, SR, pcm, false);
    expect(result.triggered).toBe(false);
  });

  test('pure echo does not trigger barge-in', () => {
    const det = new BargeInDetector(SR);
    const playback = makeTone(440, 0.5, SR * 2);
    det.handlePlaybackAudio(playback, SR);

    for (let i = 0; i < 10; i++) {
      const frame = playback.slice(i * FRAME_SIZE, (i + 1) * FRAME_SIZE);
      const framePcm = floatToPcm16(frame);
      const result = det.observeMic(frame, SR, framePcm, true);
      expect(result.triggered).toBe(false);
    }
  });

  test('real speech triggers barge-in after consecutive frames', () => {
    const det = new BargeInDetector(SR, { micThreshold: 0.01, residualThreshold: 0.3 });
    const playback = makeTone(200, 0.3, SR * 2);
    det.handlePlaybackAudio(playback, SR);

    let triggered = false;
    for (let i = 0; i < 20; i++) {
      const speech = makeTone(800 + i * 50, 0.3, FRAME_SIZE);
      const pcm = floatToPcm16(speech);
      const result = det.observeMic(speech, SR, pcm, true);
      if (result.triggered) {
        triggered = true;
        expect(result.preroll).toBeDefined();
        expect(result.preroll!.length).toBeGreaterThan(0);
        break;
      }
    }
    expect(triggered).toBe(true);
  });

  test('silence does not trigger barge-in', () => {
    const det = new BargeInDetector(SR);
    const playback = makeTone(440, 0.5, SR);
    det.handlePlaybackAudio(playback, SR);

    for (let i = 0; i < 10; i++) {
      const silence = makeSilence();
      const pcm = floatToPcm16(silence);
      const result = det.observeMic(silence, SR, pcm, true);
      expect(result.triggered).toBe(false);
    }
  });

  test('hysteresis: 4 triggers then 1 non-trigger does not fire', () => {
    const det = new BargeInDetector(SR, {
      micThreshold: 0.001,
      residualThreshold: 0.001,
      triggerFrames: 5,
    });
    const playback = makeTone(200, 0.3, SR * 2);
    det.handlePlaybackAudio(playback, SR);

    for (let i = 0; i < 4; i++) {
      const speech = makeTone(900, 0.3, FRAME_SIZE);
      const pcm = floatToPcm16(speech);
      const result = det.observeMic(speech, SR, pcm, true);
      expect(result.triggered).toBe(false);
    }

    const silence = makeSilence();
    const pcm = floatToPcm16(silence);
    const result = det.observeMic(silence, SR, pcm, true);
    expect(result.triggered).toBe(false);
  });

  test('resetStreaming allows barge-in to fire again', () => {
    const det = new BargeInDetector(SR, {
      micThreshold: 0.001,
      residualThreshold: 0.001,
      triggerFrames: 3,
    });
    const playback = makeTone(200, 0.3, SR * 2);
    det.handlePlaybackAudio(playback, SR);

    let triggered = false;
    for (let i = 0; i < 10; i++) {
      const speech = makeTone(900, 0.3, FRAME_SIZE);
      const pcm = floatToPcm16(speech);
      const result = det.observeMic(speech, SR, pcm, true);
      if (result.triggered) {
        triggered = true;
        break;
      }
    }
    expect(triggered).toBe(true);

    det.resetStreaming();
    expect(det.isStreaming()).toBe(false);

    triggered = false;
    for (let i = 0; i < 10; i++) {
      const speech = makeTone(900, 0.3, FRAME_SIZE);
      const pcm = floatToPcm16(speech);
      const result = det.observeMic(speech, SR, pcm, true);
      if (result.triggered) {
        triggered = true;
        break;
      }
    }
    expect(triggered).toBe(true);
  });

  test('empty playback reference returns passthrough', () => {
    const det = new BargeInDetector(SR);
    const mic = makeNoise(0.1);
    const pcm = floatToPcm16(mic);
    const result = det.observeMic(mic, SR, pcm, true);
    expect(result.triggered).toBe(false);
  });

  test('sample rate mismatch returns passthrough', () => {
    const det = new BargeInDetector(SR);
    const playback = makeTone(440, 0.5, 48000);
    det.handlePlaybackAudio(playback, 48000);

    const mic = makeNoise(0.1);
    const pcm = floatToPcm16(mic);
    const result = det.observeMic(mic, SR, pcm, true);
    expect(result.triggered).toBe(false);
  });

  test('reset clears all buffers and state', () => {
    const det = new BargeInDetector(SR);
    const playback = makeTone(440, 0.5, SR);
    det.handlePlaybackAudio(playback, SR);
    const mic = makeNoise(0.1);
    const pcm = floatToPcm16(mic);
    det.observeMic(mic, SR, pcm, true);

    det.reset();
    expect(det.isStreaming()).toBe(false);
  });

  test('preroll buffer captures mic audio before barge-in', () => {
    const det = new BargeInDetector(SR, {
      micThreshold: 0.001,
      residualThreshold: 0.001,
      triggerFrames: 3,
      prerollSeconds: 0.5,
    });
    const playback = makeTone(200, 0.3, SR * 2);
    det.handlePlaybackAudio(playback, SR);

    let preroll: Int16Array | undefined;
    for (let i = 0; i < 10; i++) {
      const speech = makeTone(900, 0.3, FRAME_SIZE);
      const pcm = floatToPcm16(speech);
      const result = det.observeMic(speech, SR, pcm, true);
      if (result.triggered) {
        preroll = result.preroll;
        break;
      }
    }

    expect(preroll).toBeDefined();
    expect(preroll!.length).toBeGreaterThan(0);
    expect(preroll!.length).toBeLessThanOrEqual(Math.ceil(SR * 0.5));
  });
});
