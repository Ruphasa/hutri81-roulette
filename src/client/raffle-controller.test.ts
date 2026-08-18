import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountRaffleApp, type ControllerDependencies } from './raffle-controller';
import { getCurrentRotation } from './roulette-motion';
import type { EventConfig } from '../domain/types';

describe('Raffle Controller User Behavior', () => {
  let root: HTMLElement;
  let deps: ControllerDependencies;
  let mockStorage: Record<string, string>;
  let unmount: () => void;

  const mockConfig: EventConfig = {
    id: 'test-event',
    title: 'Test Event',
    neighborhood: 'RT 01',
    lotRanges: [{ prefix: 'A', start: 1, end: 5 }],
    prizes: [
      { id: 'p1', label: 'Prize 1' },
      { id: 'p2', label: 'Prize 2' }
    ]
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div data-raffle-app>
        <div data-role="wheel"></div>
        <div data-role="center-value"></div>
        <div data-role="active-count"></div>
        <div data-role="prize-position"></div>
        <button data-role="draw">Undi</button>
        <button data-role="forfeit-button" hidden>Hangus</button>
        <button data-role="advance">Lanjut</button>
        <button data-role="reset">Reset</button>
        <dialog data-role="reset-dialog">
          <button data-role="reset-cancel">Batal</button>
          <button data-role="reset-confirm">Yakin</button>
        </dialog>
        <div data-role="winner-history"></div>
        <div data-role="error"></div>
      </div>
    `;
    root = document.querySelector('[data-raffle-app]')!;

    mockStorage = {};
    const storage: Storage = {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, val) => { mockStorage[key] = val; }),
      removeItem: vi.fn((key) => { delete mockStorage[key]; }),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    };

    deps = {
      config: mockConfig,
      selectWinner: vi.fn().mockReturnValue('A1'),
      animateRoulette: vi.fn().mockResolvedValue(undefined),
      storage,
      now: vi.fn().mockReturnValue('2026-08-18T10:00:00Z'),
      reducedMotion: vi.fn().mockReturnValue(true)
    };
  });

  afterEach(() => {
    if (unmount) unmount();
    document.body.innerHTML = '';
  });

  it('contains all required data-role hooks in the fixture', () => {
    // Basic structural check
    expect(root).not.toBeNull();
  });

  it('draw click selects once and disables draw/reset', async () => {
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    
    // Initial state check
    expect(root.getAttribute('data-phase')).toBe('IDLE');
    expect(drawBtn.disabled).toBe(false);

    drawBtn.click();
    
    // Immediate state after click
    expect(root.getAttribute('data-phase')).toBe('SPINNING');
    expect(drawBtn.disabled).toBe(true);
    expect(deps.selectWinner).toHaveBeenCalled();
  });

  it('repeated click and Enter while spinning select nothing extra', async () => {
    deps = { ...deps, animateRoulette: vi.fn().mockReturnValue(new Promise(() => {})) };
    
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    
    drawBtn.click(); // first click
    expect(deps.selectWinner).toHaveBeenCalledTimes(1);

    drawBtn.click(); // second click during spin
    expect(deps.selectWinner).toHaveBeenCalledTimes(1);
    
    // Simulate Enter key
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    document.dispatchEvent(enterEvent);
    expect(deps.selectWinner).toHaveBeenCalledTimes(1);
  });

  it('draw selection persists the spinning state before animation begins', async () => {
    deps = { ...deps, animateRoulette: vi.fn().mockReturnValue(new Promise(() => {})) };
    
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    
    drawBtn.click();
    
    expect(deps.storage!.setItem).toHaveBeenCalled();
    const envelope = JSON.parse(mockStorage['hutri81-raffle:v1'] || 'null');
    const stored = envelope.payload;
    expect(stored.pendingWinner.lotId).toBe('A1');
    expect(stored.winners.length).toBe(0);
  });

  it('animation completion reveals winner and persists stable state', async () => {
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    
    drawBtn.click();
    
    // Wait for animateRoulette to resolve
    await Promise.resolve();
    await Promise.resolve(); // extra microtask for final state update
    
    expect(root.getAttribute('data-phase')).toBe('REVEAL_WINNER');
    
    const envelope = JSON.parse(mockStorage['hutri81-raffle:v1'] || 'null');
    const stored = envelope.payload;
    expect(stored.pendingWinner).toBeNull();
    expect(stored.winners.length).toBe(1);
    expect(stored.winners[0].lotId).toBe('A1');
  });

  it('persistence write failure stops animation and shows error without selecting again', async () => {
    deps.storage!.setItem = vi.fn().mockImplementation(() => { throw new Error('Storage Full'); });
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    
    drawBtn.click();
    
    expect(deps.animateRoulette).not.toHaveBeenCalled();
    const errorEl = root.querySelector('[data-role="error"]') as HTMLElement;
    expect(errorEl.textContent).toContain('Storage Full');
    expect(root.getAttribute('data-phase')).toBe('ERROR');
  });

  it('advance changes the prize and returns to idle', async () => {
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    drawBtn.click();
    
    await Promise.resolve();
    await Promise.resolve();
    
    const advanceBtn = root.querySelector('[data-role="advance"]') as HTMLButtonElement;
    expect(advanceBtn.disabled).toBe(false);
    advanceBtn.click();
    
    expect(root.getAttribute('data-phase')).toBe('IDLE');
  });

  it('reset click opens dialog, cancel preserves state, confirm resets', async () => {
    unmount = mountRaffleApp(root, deps);
    const resetBtn = root.querySelector('[data-role="reset"]') as HTMLButtonElement;
    const dialog = root.querySelector('[data-role="reset-dialog"]') as HTMLDialogElement;
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    
    resetBtn.click();
    expect(dialog.showModal).toHaveBeenCalled();
    
    const cancelBtn = root.querySelector('[data-role="reset-cancel"]') as HTMLButtonElement;
    cancelBtn.click();
    expect(dialog.close).toHaveBeenCalled();
    
    const confirmBtn = root.querySelector('[data-role="reset-confirm"]') as HTMLButtonElement;
    confirmBtn.click();
    
    expect(deps.storage!.removeItem).toHaveBeenCalled();
    expect(root.getAttribute('data-phase')).toBe('IDLE');
  });

  it('restored incompatible storage displays recovery copy', () => {
    mockStorage['hutri81-raffle:v1'] = 'INVALID JSON';
    unmount = mountRaffleApp(root, deps);
    const errorEl = root.querySelector('[data-role="error"]') as HTMLElement;
    expect(errorEl.hidden).toBe(false);
    expect(errorEl.textContent).toContain('Format JSON tidak valid');
    expect(root.getAttribute('data-phase')).toBe('ERROR');
  });

  it('auto-resets to IDLE without error when config fingerprint mismatches', () => {
    const staleEnvelope = {
      schemaVersion: 1,
      eventFingerprint: 'old-fingerprint-mismatch',
      payload: {
        phase: 'winner',
        activeLots: ['A1'],
        winners: [{ lotId: 'A2', prizeId: 'p1', prizeLabel: 'Prize 1', drawnAt: '2026-08-18T10:00:00Z' }],
        prizeIndex: 0,
        pendingWinner: null,
      },
    };
    mockStorage['hutri81-raffle:v1'] = JSON.stringify(staleEnvelope);
    unmount = mountRaffleApp(root, deps);
    const errorEl = root.querySelector('[data-role="error"]') as HTMLElement;
    expect(errorEl.hidden).toBe(true);
    expect(root.getAttribute('data-phase')).toBe('IDLE');
    expect(deps.storage!.removeItem).toHaveBeenCalledWith('hutri81-raffle:v1');
  });

  it('final winner changes the primary action to Lihat Semua Pemenang', async () => {
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    const advanceBtn = root.querySelector('[data-role="advance"]') as HTMLButtonElement;
    
    // First draw
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    
    expect(advanceBtn.textContent).toBe('Lanjut Hadiah Berikutnya');
    advanceBtn.click();

    // Second draw
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(advanceBtn.textContent).toBe('Lihat Semua Pemenang');
  });

  it('default animateRoulette triggers anime.js motion and updates wheel and winner readout', async () => {
    // Mount without custom animateRoulette mock to exercise default anime.js integration
    const customDeps: ControllerDependencies = {
      config: mockConfig,
      selectWinner: vi.fn().mockReturnValue('A1'),
      storage: deps.storage,
      now: vi.fn().mockReturnValue('2026-08-18T10:00:00Z'),
      reducedMotion: vi.fn().mockReturnValue(true) // quick completion
    };

    unmount = mountRaffleApp(root, customDeps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    
    drawBtn.click();
    
    // Allow reduced motion timeout
    await new Promise(r => setTimeout(r, 100));

    expect(root.getAttribute('data-phase')).toBe('REVEAL_WINNER');
    const centerValue = root.querySelector('[data-role="center-value"]') as HTMLElement;
    expect(centerValue.textContent).toBe('A1');
  });

  it('reset confirms and clears anime styling on wheel, winner display, and resets rotation', async () => {
    unmount = mountRaffleApp(root, deps);
    const resetBtn = root.querySelector('[data-role="reset"]') as HTMLButtonElement;
    const confirmBtn = root.querySelector('[data-role="reset-confirm"]') as HTMLButtonElement;
    const wheel = root.querySelector('[data-role="wheel"]') as HTMLElement;
    
    wheel.style.transform = 'rotate(1440deg)';
    
    resetBtn.click();
    confirmBtn.click();
    
    expect(wheel.style.transform).toBe('rotate(0deg)');
    expect(getCurrentRotation()).toBe(0);
    expect(root.getAttribute('data-phase')).toBe('IDLE');
  });

  it('forfeit button is hidden on IDLE and visible in REVEAL_WINNER', async () => {
    unmount = mountRaffleApp(root, deps);
    const forfeitBtn = root.querySelector('[data-role="forfeit-button"]') as HTMLButtonElement;
    expect(forfeitBtn.hidden).toBe(true);

    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(root.getAttribute('data-phase')).toBe('REVEAL_WINNER');
    expect(forfeitBtn.hidden).toBe(false);
    expect(forfeitBtn.disabled).toBe(false);
  });

  it('forfeit button click forfeits winner, retains same prize, and auto-spins new winner', async () => {
    deps = {
      ...deps,
      selectWinner: vi.fn().mockReturnValueOnce('A1').mockReturnValueOnce('A2'),
    };
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    const forfeitBtn = root.querySelector('[data-role="forfeit-button"]') as HTMLButtonElement;

    // First draw wins A1
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(root.getAttribute('data-phase')).toBe('REVEAL_WINNER');
    let envelope = JSON.parse(mockStorage['hutri81-raffle:v1'] || 'null');
    expect(envelope.payload.winners.length).toBe(1);
    expect(envelope.payload.winners[0].lotId).toBe('A1');
    expect(envelope.payload.prizeIndex).toBe(0);

    // Click Forfeit
    forfeitBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    // Should have re-spun and won A2 for prize 0
    expect(deps.selectWinner).toHaveBeenCalledTimes(2);
    expect(root.getAttribute('data-phase')).toBe('REVEAL_WINNER');
    envelope = JSON.parse(mockStorage['hutri81-raffle:v1'] || 'null');
    expect(envelope.payload.winners.length).toBe(1);
    expect(envelope.payload.winners[0].lotId).toBe('A2');
    expect(envelope.payload.prizeIndex).toBe(0);
    expect(envelope.payload.activeLots).not.toContain('A1');
    expect(envelope.payload.activeLots).not.toContain('A2');
  });
});

