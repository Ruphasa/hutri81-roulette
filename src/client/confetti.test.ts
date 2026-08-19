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

  it('spawns flanked cannons relative to originEl bounding box when provided', () => {
    // Set up canvas rect: 0, 0, 1000, 600
    canvas.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 600,
      width: 1000,
      height: 600,
    });

    const originEl = document.createElement('div');
    // Wheel element rect: left 300, top 100, right 700, bottom 500, width 400, height 400
    originEl.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 300,
      top: 100,
      right: 700,
      bottom: 500,
      width: 400,
      height: 400,
    });

    const confetti = createConfetti(canvas);
    confetti.fire({ count: 2, originEl });

    expect(rafCallbacks.length).toBe(1);
    const step = rafCallbacks.shift()!;
    step(16);

    // Left cannon: x = 300 + 400 * 0.05 = 320, y = 500 - 400 * 0.1 = 460
    // Right cannon: x = 700 - 400 * 0.05 = 680, y = 500 - 400 * 0.1 = 460
    // Particles move by vx, vy in first frame
    const calls = mockCtx.translate.mock.calls;
    expect(calls.length).toBe(2);

    const [leftX, leftY] = calls[0];
    const [rightX, rightY] = calls[1];

    // Left particle should have spawned near 320 and moved right (leftX > 320) and up (leftY < 460)
    expect(leftX).toBeGreaterThan(320);
    expect(leftY).toBeLessThan(460);

    // Right particle should have spawned near 680 and moved left (rightX < 680) and up (rightY < 460)
    expect(rightX).toBeLessThan(680);
    expect(rightY).toBeLessThan(460);
  });

  it('falls back to 20% and 80% canvas width when originEl is null or omitted', () => {
    canvas.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      right: 1000,
      bottom: 600,
      width: 1000,
      height: 600,
    });

    const confetti = createConfetti(canvas);
    confetti.fire({ count: 2, originEl: null });

    const step = rafCallbacks.shift()!;
    step(16);

    const calls = mockCtx.translate.mock.calls;
    expect(calls.length).toBe(2);

    const [leftX, leftY] = calls[0];
    const [rightX, rightY] = calls[1];

    // Left particle: spawned at canvas.width * 0.2, y at canvas.height * 0.85, moved right (vx > 0) and up (vy < 0)
    expect(leftX).toBeGreaterThan(canvas.width * 0.2);
    expect(leftY).toBeLessThan(canvas.height * 0.85);

    // Right particle: spawned at canvas.width * 0.8, y at canvas.height * 0.85, moved left (vx < 0) and up (vy < 0)
    expect(rightX).toBeLessThan(canvas.width * 0.8);
    expect(rightY).toBeLessThan(canvas.height * 0.85);
  });
});
