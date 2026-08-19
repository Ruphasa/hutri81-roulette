import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createConfetti } from './confetti';

describe('ConfettiManager', () => {
  let canvas: HTMLCanvasElement;
  let mockCtx: any;
  let rafCallbacks: FrameRequestCallback[] = [];
  let rafIdCounter = 0;

  beforeEach(() => {
    rafCallbacks = [];
    rafIdCounter = 0;

    // Stub requestAnimationFrame and cancelAnimationFrame
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++rafIdCounter;
    });

    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((_id: number) => {
      // noop
    });

    mockCtx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      globalAlpha: 1.0,
      fillStyle: '',
    };

    canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 1000, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
    canvas.getContext = vi.fn().mockReturnValue(mockCtx);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes ConfettiManager with fire and stop methods', () => {
    const confetti = createConfetti(canvas);
    expect(confetti).toBeDefined();
    expect(typeof confetti.fire).toBe('function');
    expect(typeof confetti.stop).toBe('function');
  });

  it('triggers confetti particle animation on fire and schedules animation frame', () => {
    const confetti = createConfetti(canvas);
    expect(() => confetti.fire({ count: 40 })).not.toThrow();
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(rafCallbacks.length).toBe(1);

    // Run one animation frame step
    const step = rafCallbacks.shift()!;
    step(16);

    expect(mockCtx.clearRect).toHaveBeenCalled();
    expect(mockCtx.save).toHaveBeenCalledTimes(40);
    expect(mockCtx.fillRect).toHaveBeenCalledTimes(40);
    expect(mockCtx.restore).toHaveBeenCalledTimes(40);
  });

  it('fires default particle count (80) when options are omitted', () => {
    const confetti = createConfetti(canvas);
    confetti.fire();
    expect(rafCallbacks.length).toBe(1);

    const step = rafCallbacks.shift()!;
    step(16);

    expect(mockCtx.fillRect).toHaveBeenCalledTimes(80);
  });

  it('cleans up animation frame and clears canvas on stop', () => {
    const confetti = createConfetti(canvas);
    confetti.fire({ count: 20 });
    expect(window.requestAnimationFrame).toHaveBeenCalled();

    confetti.stop();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(mockCtx.clearRect).toHaveBeenCalled();
  });

  it('handles repeated calls to fire() without creating multiple overlapping loops', () => {
    const confetti = createConfetti(canvas);
    confetti.fire({ count: 20 });
    const initialRafCalls = (window.requestAnimationFrame as any).mock.calls.length;

    // Fire again while first loop is already active
    confetti.fire({ count: 20 });
    const secondRafCalls = (window.requestAnimationFrame as any).mock.calls.length;

    // Should not start a second concurrent rAF loop if already scheduled
    expect(secondRafCalls).toBe(initialRafCalls);
  });

  it('gracefully handles canvas with null 2D context', () => {
    const nullCanvas = document.createElement('canvas');
    nullCanvas.getContext = vi.fn().mockReturnValue(null);

    const confetti = createConfetti(nullCanvas);
    expect(() => confetti.fire({ count: 10 })).not.toThrow();

    if (rafCallbacks.length > 0) {
      const step = rafCallbacks.shift()!;
      expect(() => step(16)).not.toThrow();
    }

    expect(() => confetti.stop()).not.toThrow();
  });

  it('uses parentElement dimensions for resize if available', () => {
    const parent = document.createElement('div');
    Object.defineProperty(parent, 'clientWidth', { value: 1280, configurable: true });
    Object.defineProperty(parent, 'clientHeight', { value: 720, configurable: true });
    parent.appendChild(canvas);

    const confetti = createConfetti(canvas);
    confetti.fire({ count: 10 });

    expect(canvas.width).toBe(1280);
    expect(canvas.height).toBe(720);
  });

  it('falls back to window inner dimensions if parentElement has 0 or no dimensions', () => {
    const confetti = createConfetti(canvas);
    confetti.fire({ count: 10 });

    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
  });

  it('animates particles until all particles fade out or fall out of view', () => {
    const confetti = createConfetti(canvas);
    confetti.fire({ count: 2 });

    // Step through multiple animation frames until particles are exhausted
    let frames = 0;
    while (rafCallbacks.length > 0 && frames < 500) {
      const cb = rafCallbacks.shift()!;
      cb(16 * frames);
      frames++;
    }

    // After enough frames, all particles will have faded out and loop will stop
    expect(frames).toBeGreaterThan(1);
    expect(rafCallbacks.length).toBe(0);
  });

  it('handles calling stop() when no animation is running', () => {
    const confetti = createConfetti(canvas);
    expect(() => confetti.stop()).not.toThrow();
    expect(mockCtx.clearRect).toHaveBeenCalled();
  });
});
