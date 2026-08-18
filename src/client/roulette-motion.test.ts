import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { animateRoulette } from './roulette-motion';

describe('animateRoulette', () => {
  let wheel: HTMLElement;
  let readout: HTMLElement;
  
  beforeEach(() => {
    vi.useFakeTimers();
    wheel = document.createElement('div');
    readout = document.createElement('div');
    
    // Mock Web Animations API
    wheel.animate = vi.fn().mockImplementation((_keyframes, options) => {
      const duration = typeof options === 'number' ? options : options?.duration || 0;
      const animation = {
        onfinish: null as (() => void) | null,
        play: vi.fn(),
        cancel: vi.fn()
      };
      
      // Simulate finish after duration
      setTimeout(() => {
        if (animation.onfinish) animation.onfinish();
      }, duration as number);
      
      return animation as unknown as Animation;
    });
  });
  
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('cycles active lot labels and resolves on the chosen winner for normal motion', async () => {
    const activeLots = ['A1', 'A2', 'A3'];
    const winner = 'A2';
    
    const promise = animateRoulette({
      wheel,
      readout,
      activeLots,
      winner,
      reducedMotion: false,
      durationMs: 6500
    });

    // Advance time partly to see cycling
    vi.advanceTimersByTime(100);
    expect(readout.textContent).not.toBe(winner);
    expect(['A1', 'A2', 'A3']).toContain(readout.textContent);
    
    // Advance time to end
    vi.advanceTimersByTime(6500);
    await promise;
    
    expect(readout.textContent).toBe(winner);
    expect(wheel.animate).toHaveBeenCalled();
  });

  it('resolves immediately to the winner for reduced motion, skipping rapid cycling', async () => {
    const activeLots = ['A1', 'A2', 'A3'];
    const winner = 'A3';
    
    const promise = animateRoulette({
      wheel,
      readout,
      activeLots,
      winner,
      reducedMotion: true
    });
    
    vi.advanceTimersByTime(250); // duration for reduced motion
    await promise;
    
    expect(readout.textContent).toBe(winner);
  });
});
