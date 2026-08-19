import { describe, it, expect, beforeEach } from 'vitest';
import {
  animateRoulette,
  getCurrentRotation,
  resetCurrentRotation,
  DEFAULT_ROULETTE_DURATION_MS,
  REDUCED_MOTION_DURATION_MS
} from './roulette-motion';

describe('animateRoulette', () => {
  let wheel: HTMLElement;
  let readout: HTMLElement;
  
  beforeEach(() => {
    resetCurrentRotation();
    wheel = document.createElement('div');
    readout = document.createElement('div');
  });

  it('exports expected timing constants for stage suspense', () => {
    expect(DEFAULT_ROULETTE_DURATION_MS).toBe(7000);
    expect(REDUCED_MOTION_DURATION_MS).toBe(50);
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

  it('handles empty activeLots gracefully without throwing', async () => {
    const winner = 'A99';
    await animateRoulette({
      wheel,
      readout,
      activeLots: [],
      winner,
      reducedMotion: false,
      durationMs: 50
    });

    expect(readout.textContent).toBe(winner);
  });

  it('invokes onTick callback with rate between 0 and 1 as spin progresses', async () => {
    const activeLots = ['A1', 'A2', 'A3'];
    const winner = 'A2';
    const tickRates: number[] = [];
    
    await animateRoulette({
      wheel,
      readout,
      activeLots,
      winner,
      reducedMotion: false,
      durationMs: 300,
      onTick: (rate) => {
        tickRates.push(rate);
      }
    });

    expect(tickRates.length).toBeGreaterThan(1);
    expect(tickRates[0]).toBeGreaterThan(0);
    expect(tickRates[0]).toBeLessThanOrEqual(1.0);
    expect(tickRates[tickRates.length - 1]!).toBeLessThanOrEqual(tickRates[0]!);
  });

  it('invokes onTick even if readout element is null', async () => {
    const activeLots = ['A1', 'A2', 'A3'];
    const winner = 'A2';
    let tickCount = 0;
    
    await animateRoulette({
      wheel,
      activeLots,
      winner,
      reducedMotion: false,
      durationMs: 300,
      onTick: () => {
        tickCount++;
      }
    });

    expect(tickCount).toBeGreaterThan(0);
  });

  it('resolves cleanly when given explicit durationMs and fullPool', async () => {
    const activeLots = ['A1', 'A2'];
    const fullPool = ['A1', 'A2', 'A3', 'A4', 'A5'];
    const winner = 'A4';
    const tickRates: number[] = [];

    await animateRoulette({
      wheel,
      readout,
      activeLots,
      fullPool,
      winner,
      reducedMotion: false,
      durationMs: 100,
      onTick: (rate) => {
        tickRates.push(rate);
      }
    });

    expect(readout.textContent).toBe('A4');
    expect(tickRates.length).toBeGreaterThan(0);
  });
});



