import { describe, it, expect, beforeEach } from 'vitest';
import { animateRoulette, getCurrentRotation, resetCurrentRotation } from './roulette-motion';

describe('animateRoulette', () => {
  let wheel: HTMLElement;
  let readout: HTMLElement;
  
  beforeEach(() => {
    resetCurrentRotation();
    wheel = document.createElement('div');
    readout = document.createElement('div');
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
      durationMs: 50 // Short duration for fast unit test
    });

    await promise;
    
    expect(readout.textContent).toBe(winner);
    expect(getCurrentRotation()).toBeGreaterThan(0);
    expect(wheel.style.transform).toContain('rotate');
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
    
    await promise;
    
    expect(readout.textContent).toBe(winner);
  });

  it('accumulates rotation over multiple spins', async () => {
    const activeLots = ['A1', 'A2', 'A3'];
    
    await animateRoulette({
      wheel,
      readout,
      activeLots,
      winner: 'A1',
      reducedMotion: false,
      durationMs: 50
    });

    const firstRotation = getCurrentRotation();
    expect(firstRotation).toBeGreaterThan(0);

    await animateRoulette({
      wheel,
      readout,
      activeLots,
      winner: 'A2',
      reducedMotion: false,
      durationMs: 50
    });

    const secondRotation = getCurrentRotation();
    expect(secondRotation).toBeGreaterThan(firstRotation);
  });
});

