import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountRaffleApp, type ControllerDependencies } from './raffle-controller';
import { getCurrentRotation } from './roulette-motion';
import type { EventConfig } from '../domain/types';
import type { SoundEngine } from './sound-effects';
import type { ConfettiManager } from './confetti';

describe('Raffle Controller Two-Round Flow & Intermission Integration', () => {
  let root: HTMLElement;
  let deps: ControllerDependencies;
  let mockStorage: Record<string, string>;
  let mockSoundEngine: SoundEngine;
  let mockConfetti: ConfettiManager;
  let unmount: () => void;

  const mockConfig: EventConfig = {
    id: 'test-event',
    title: 'Test Event',
    neighborhood: 'RT 01',
    lotRanges: [{ prefix: 'A', start: 1, end: 5 }],
    prizes: [
      { id: 'main-karpet', label: 'Karpet' },
      { id: 'main-magicom', label: 'Magicom' },
      { id: 'main-kipas', label: 'Kipas Angin' },
    ],
  };

  beforeEach(() => {
    // Setup dialog showModal and close polyfills for jsdom
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function () {
        this.setAttribute('open', '');
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function () {
        this.removeAttribute('open');
      };
    }

    document.body.innerHTML = `
      <div data-raffle-app>
        <button class="top-left-diamond" data-role="secret-reset"></button>
        <div class="round-badge" data-role="round-badge">BABAK HADIAH HIBURAN</div>
        <button class="mute-toggle-btn" data-role="mute-button">🔊 SUARA: AKTIF</button>
        <canvas class="confetti-canvas" data-role="confetti-canvas"></canvas>
        <div class="forfeit-flash" data-role="forfeit-flash"></div>
        <div data-role="wheel"></div>
        <div data-role="center-value"></div>
        <div data-role="active-count"></div>
        <div data-role="prize-position"></div>
        <button data-role="draw">Undi</button>
        <button data-role="forfeit-button" hidden>Hangus</button>
        <button data-role="advance">Lanjut</button>
        <button data-role="switch-round-button" hidden>Ke Hadiah Utama</button>
        <button data-role="reset">Reset</button>
        <dialog data-role="reset-dialog">
          <button data-role="reset-cancel">Batal</button>
          <button data-role="reset-confirm">Yakin</button>
        </dialog>
        <dialog data-role="intermission-dialog">
          <div data-role="intermission-winners"></div>
          <button data-role="start-main-round-btn">Mulai Hadiah Utama</button>
        </dialog>
        <div data-role="winner-history"></div>
        <div data-role="error"></div>
        <div class="finale-overlay" data-role="finale-overlay" hidden>
          <div class="finale-title">SELURUH HADIAH TELAH DIUNDI!</div>
          <div class="finale-winners-list" data-role="finale-winners"></div>
          <div data-role="finale-small-winners"></div>
          <div data-role="finale-main-winners"></div>
          <button data-role="finale-reset-btn">Reset Acara</button>
          <button data-role="finale-close-btn">Tutup Overlay</button>
          <div class="finale-greeting">Dirgahayu Republik Indonesia ke-81 &mdash; Griya Shanta RT 08</div>
        </div>
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
      key: vi.fn(),
    };

    let isMutedState = false;
    mockSoundEngine = {
      playTick: vi.fn(),
      playLockImpact: vi.fn(),
      playFanfare: vi.fn(),
      playForfeit: vi.fn(),
      toggleMute: vi.fn().mockImplementation(() => {
        isMutedState = !isMutedState;
        return isMutedState;
      }),
      isMuted: vi.fn().mockImplementation(() => isMutedState),
      setMuted: vi.fn().mockImplementation((val: boolean) => {
        isMutedState = val;
      }),
    };

    mockConfetti = {
      fire: vi.fn(),
      stop: vi.fn(),
    };

    deps = {
      config: mockConfig,
      selectWinner: vi.fn().mockReturnValue('A1'),
      animateRoulette: vi.fn().mockResolvedValue(undefined),
      storage,
      now: vi.fn().mockReturnValue('2026-08-18T10:00:00Z'),
      reducedMotion: vi.fn().mockReturnValue(true),
      soundEngine: mockSoundEngine,
      confetti: mockConfetti,
    };
  });

  afterEach(() => {
    if (unmount) unmount();
    document.body.innerHTML = '';
  });

  it('contains all required data-role hooks in the fixture', () => {
    expect(root).not.toBeNull();
  });

  it('initializes in Round 1 (Hadiah Hiburan) with correct badge, prize position, and switch round button', () => {
    unmount = mountRaffleApp(root, deps);
    const roundBadge = root.querySelector('[data-role="round-badge"]') as HTMLElement;
    const prizePosition = root.querySelector('[data-role="prize-position"]') as HTMLElement;
    const switchRoundBtn = root.querySelector('[data-role="switch-round-button"]') as HTMLButtonElement;
    const activeCount = root.querySelector('[data-role="active-count"]') as HTMLElement;

    expect(roundBadge.textContent).toBe('BABAK HADIAH HIBURAN');
    expect(roundBadge.classList.contains('gold')).toBe(false);
    expect(prizePosition.textContent).toBe('Hadiah Hiburan #1');
    expect(switchRoundBtn.hidden).toBe(false);
    expect(switchRoundBtn.disabled).toBe(false);
    expect(activeCount.textContent).toBe('5');
  });

  it('draw click in small round selects once and disables draw/reset/switch buttons', async () => {
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    const switchRoundBtn = root.querySelector('[data-role="switch-round-button"]') as HTMLButtonElement;
    const resetBtn = root.querySelector('[data-role="reset"]') as HTMLButtonElement;

    expect(root.getAttribute('data-phase')).toBe('IDLE');
    expect(drawBtn.disabled).toBe(false);

    drawBtn.click();

    expect(root.getAttribute('data-phase')).toBe('SPINNING');
    expect(drawBtn.disabled).toBe(true);
    expect(resetBtn.disabled).toBe(true);
    expect(switchRoundBtn.disabled).toBe(true);
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
    expect(stored.pendingWinner.prizeLabel).toBe('Hadiah Hiburan #1');
    expect(stored.round).toBe('small');
    expect(stored.winners.length).toBe(0);
  });

  it('animation completion reveals winner and persists stable state', async () => {
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;

    drawBtn.click();

    await Promise.resolve();
    await Promise.resolve();

    expect(root.getAttribute('data-phase')).toBe('REVEAL_WINNER');

    const envelope = JSON.parse(mockStorage['hutri81-raffle:v1'] || 'null');
    const stored = envelope.payload;
    expect(stored.pendingWinner).toBeNull();
    expect(stored.winners.length).toBe(1);
    expect(stored.winners[0].lotId).toBe('A1');
    expect(stored.winners[0].prizeLabel).toBe('Hadiah Hiburan #1');
    expect(stored.winners[0].round).toBe('small');
    expect(stored.smallPrizeCount).toBe(1);
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

  it('advance in small round increments smallPrizeCount and updates prize position', async () => {
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    drawBtn.click();

    await Promise.resolve();
    await Promise.resolve();

    const advanceBtn = root.querySelector('[data-role="advance"]') as HTMLButtonElement;
    const prizePosition = root.querySelector('[data-role="prize-position"]') as HTMLElement;
    expect(advanceBtn.disabled).toBe(false);
    advanceBtn.click();

    expect(root.getAttribute('data-phase')).toBe('IDLE');
    expect(prizePosition.textContent).toBe('Hadiah Hiburan #2');
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

  it('forfeit button click in small round forfeits winner, decrements smallPrizeCount, and auto-spins new winner', async () => {
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
    expect(envelope.payload.smallPrizeCount).toBe(1);

    // Click Forfeit
    forfeitBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    // Should have re-spun and won A2 for Hadiah Hiburan #1
    expect(deps.selectWinner).toHaveBeenCalledTimes(2);
    expect(root.getAttribute('data-phase')).toBe('REVEAL_WINNER');
    envelope = JSON.parse(mockStorage['hutri81-raffle:v1'] || 'null');
    expect(envelope.payload.winners.length).toBe(1);
    expect(envelope.payload.winners[0].lotId).toBe('A2');
    expect(envelope.payload.winners[0].prizeLabel).toBe('Hadiah Hiburan #1');
    expect(envelope.payload.smallPrizeCount).toBe(1);
    expect(envelope.payload.activeLots).not.toContain('A1');
    expect(envelope.payload.activeLots).not.toContain('A2');
  });

  it('switch round button opens intermission dialog and populates small round winners', async () => {
    deps = {
      ...deps,
      selectWinner: vi.fn().mockReturnValueOnce('A1').mockReturnValueOnce('A2'),
    };
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    const advanceBtn = root.querySelector('[data-role="advance"]') as HTMLButtonElement;
    const switchRoundBtn = root.querySelector('[data-role="switch-round-button"]') as HTMLButtonElement;
    const intermissionDialog = root.querySelector('[data-role="intermission-dialog"]') as HTMLDialogElement;
    const intermissionWinners = root.querySelector('[data-role="intermission-winners"]') as HTMLElement;

    intermissionDialog.showModal = vi.fn().mockImplementation(() => { intermissionDialog.setAttribute('open', ''); });

    // Draw 1: A1
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    // Draw 2: A2
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    switchRoundBtn.click();
    expect(intermissionDialog.showModal).toHaveBeenCalled();

    const winnerCards = intermissionWinners.querySelectorAll('.finale-winner-card');
    expect(winnerCards.length).toBe(2);
    expect(winnerCards[0]?.textContent).toContain('A1');
    expect(winnerCards[0]?.textContent).toContain('Hadiah Hiburan #1');
    expect(winnerCards[1]?.textContent).toContain('A2');
    expect(winnerCards[1]?.textContent).toContain('Hadiah Hiburan #2');
  });

  it('starting main round from intermission resets active pool, switches to main round, plays fanfare, and updates UI', async () => {
    deps = {
      ...deps,
      selectWinner: vi.fn().mockReturnValueOnce('A1'),
    };
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    const advanceBtn = root.querySelector('[data-role="advance"]') as HTMLButtonElement;
    const switchRoundBtn = root.querySelector('[data-role="switch-round-button"]') as HTMLButtonElement;
    const intermissionDialog = root.querySelector('[data-role="intermission-dialog"]') as HTMLDialogElement;
    const startMainRoundBtn = root.querySelector('[data-role="start-main-round-btn"]') as HTMLButtonElement;
    const roundBadge = root.querySelector('[data-role="round-badge"]') as HTMLElement;
    const prizePosition = root.querySelector('[data-role="prize-position"]') as HTMLElement;
    const activeCount = root.querySelector('[data-role="active-count"]') as HTMLElement;

    intermissionDialog.showModal = vi.fn().mockImplementation(() => { intermissionDialog.setAttribute('open', ''); });
    intermissionDialog.close = vi.fn().mockImplementation(() => { intermissionDialog.removeAttribute('open'); });

    // Draw 1 small prize
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    // Open intermission and start main round
    switchRoundBtn.click();
    startMainRoundBtn.click();

    expect(intermissionDialog.close).toHaveBeenCalled();
    expect(deps.soundEngine?.playFanfare).toHaveBeenCalled();

    // Check state and UI in Round 2
    expect(roundBadge.textContent).toBe('BABAK HADIAH UTAMA');
    expect(roundBadge.classList.contains('gold')).toBe(true);
    expect(prizePosition.textContent).toBe('HADIAH UTAMA #1: Karpet');
    expect(activeCount.textContent).toBe('5'); // Full pool reset to 5
    expect(switchRoundBtn.hidden).toBe(true);

    const envelope = JSON.parse(mockStorage['hutri81-raffle:v1'] || 'null');
    expect(envelope.payload.round).toBe('main');
    expect(envelope.payload.activeLots).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
    expect(envelope.payload.mainPrizeIndex).toBe(0);
    expect(envelope.payload.winners.length).toBe(1); // 1 small prize winner retained
  });

  it('draws 3 main prizes sequentially in exact order (Karpet, Magicom, Kipas Angin)', async () => {
    deps = {
      ...deps,
      selectWinner: vi.fn()
        .mockReturnValueOnce('A1') // Small prize 1
        .mockReturnValueOnce('A1') // Main prize 1 (Karpet) - can be drawn again because pool reset
        .mockReturnValueOnce('A2') // Main prize 2 (Magicom)
        .mockReturnValueOnce('A3'), // Main prize 3 (Kipas Angin)
    };
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    const advanceBtn = root.querySelector('[data-role="advance"]') as HTMLButtonElement;
    const switchRoundBtn = root.querySelector('[data-role="switch-round-button"]') as HTMLButtonElement;
    const startMainRoundBtn = root.querySelector('[data-role="start-main-round-btn"]') as HTMLButtonElement;
    const prizePosition = root.querySelector('[data-role="prize-position"]') as HTMLElement;

    // Small prize 1
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    // Switch to main round
    switchRoundBtn.click();
    startMainRoundBtn.click();

    // Main prize 1: Karpet
    expect(prizePosition.textContent).toBe('HADIAH UTAMA #1: Karpet');
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(advanceBtn.textContent).toBe('Lanjut Hadiah Berikutnya');
    advanceBtn.click();

    // Main prize 2: Magicom
    expect(prizePosition.textContent).toBe('HADIAH UTAMA #2: Magicom');
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(advanceBtn.textContent).toBe('Lanjut Hadiah Berikutnya');
    advanceBtn.click();

    // Main prize 3: Kipas Angin
    expect(prizePosition.textContent).toBe('HADIAH UTAMA #3: Kipas Angin');
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(advanceBtn.textContent).toBe('Lihat Semua Pemenang');
  });

  it('forfeit in main round preserves mainPrizeIndex and auto-spins new winner for the same main prize', async () => {
    deps = {
      ...deps,
      selectWinner: vi.fn()
        .mockReturnValueOnce('A1') // Main prize 1 initial winner
        .mockReturnValueOnce('A2'), // Main prize 1 forfeit replacement
    };
    unmount = mountRaffleApp(root, deps);
    const switchRoundBtn = root.querySelector('[data-role="switch-round-button"]') as HTMLButtonElement;
    const startMainRoundBtn = root.querySelector('[data-role="start-main-round-btn"]') as HTMLButtonElement;
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    const forfeitBtn = root.querySelector('[data-role="forfeit-button"]') as HTMLButtonElement;
    const prizePosition = root.querySelector('[data-role="prize-position"]') as HTMLElement;

    // Switch to main round immediately
    switchRoundBtn.click();
    startMainRoundBtn.click();

    expect(prizePosition.textContent).toBe('HADIAH UTAMA #1: Karpet');

    // Draw A1
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(root.getAttribute('data-phase')).toBe('REVEAL_WINNER');

    // Click Forfeit
    forfeitBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(deps.selectWinner).toHaveBeenCalledTimes(2);
    expect(root.getAttribute('data-phase')).toBe('REVEAL_WINNER');

    const envelope = JSON.parse(mockStorage['hutri81-raffle:v1'] || 'null');
    expect(envelope.payload.round).toBe('main');
    expect(envelope.payload.mainPrizeIndex).toBe(0);
    expect(envelope.payload.winners.length).toBe(1);
    expect(envelope.payload.winners[0].lotId).toBe('A2');
    expect(envelope.payload.winners[0].prizeLabel).toBe('Karpet');
    expect(prizePosition.textContent).toBe('HADIAH UTAMA #1: Karpet');
  });

  it('grand finale overlay displays small and main winners into separate columns upon completion', async () => {
    deps = {
      ...deps,
      selectWinner: vi.fn()
        .mockReturnValueOnce('A1') // Small 1
        .mockReturnValueOnce('A2') // Small 2
        .mockReturnValueOnce('A1') // Main 1: Karpet
        .mockReturnValueOnce('A3') // Main 2: Magicom
        .mockReturnValueOnce('A4'), // Main 3: Kipas Angin
    };
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    const advanceBtn = root.querySelector('[data-role="advance"]') as HTMLButtonElement;
    const switchRoundBtn = root.querySelector('[data-role="switch-round-button"]') as HTMLButtonElement;
    const startMainRoundBtn = root.querySelector('[data-role="start-main-round-btn"]') as HTMLButtonElement;
    const finaleOverlay = root.querySelector('[data-role="finale-overlay"]') as HTMLElement;
    const finaleSmallWinners = root.querySelector('[data-role="finale-small-winners"]') as HTMLElement;
    const finaleMainWinners = root.querySelector('[data-role="finale-main-winners"]') as HTMLElement;

    expect(finaleOverlay.hidden).toBe(true);

    // Draw 2 small prizes
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    // Switch to main round
    switchRoundBtn.click();
    startMainRoundBtn.click();

    // Main 1: Karpet
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    // Main 2: Magicom
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    // Main 3: Kipas Angin
    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    // Phase complete
    expect(root.getAttribute('data-phase')).toBe('COMPLETE');
    expect(finaleOverlay.hidden).toBe(false);

    const smallCards = finaleSmallWinners.querySelectorAll('.finale-winner-card');
    expect(smallCards.length).toBe(2);
    expect(smallCards[0]?.textContent).toContain('A1');
    expect(smallCards[0]?.textContent).toContain('Hadiah Hiburan #1');
    expect(smallCards[1]?.textContent).toContain('A2');
    expect(smallCards[1]?.textContent).toContain('Hadiah Hiburan #2');

    const mainCards = finaleMainWinners.querySelectorAll('.finale-winner-card');
    expect(mainCards.length).toBe(3);
    expect(mainCards[0]?.textContent).toContain('A1');
    expect(mainCards[0]?.textContent).toContain('Karpet');
    expect(mainCards[1]?.textContent).toContain('A3');
    expect(mainCards[1]?.textContent).toContain('Magicom');
    expect(mainCards[2]?.textContent).toContain('A4');
    expect(mainCards[2]?.textContent).toContain('Kipas Angin');

    expect(finaleOverlay.textContent).toContain('Dirgahayu Republik Indonesia');
  });

  it('finale close button hides finale overlay allowing operator to view stage', async () => {
    deps = {
      ...deps,
      selectWinner: vi.fn()
        .mockReturnValueOnce('A1')
        .mockReturnValueOnce('A2')
        .mockReturnValueOnce('A3'),
    };
    unmount = mountRaffleApp(root, deps);
    const switchRoundBtn = root.querySelector('[data-role="switch-round-button"]') as HTMLButtonElement;
    const startMainRoundBtn = root.querySelector('[data-role="start-main-round-btn"]') as HTMLButtonElement;
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    const advanceBtn = root.querySelector('[data-role="advance"]') as HTMLButtonElement;
    const finaleOverlay = root.querySelector('[data-role="finale-overlay"]') as HTMLElement;
    const finaleCloseBtn = root.querySelector('[data-role="finale-close-btn"]') as HTMLButtonElement;

    // Switch to main round and complete 3 main prizes
    switchRoundBtn.click();
    startMainRoundBtn.click();

    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    expect(finaleOverlay.hidden).toBe(false);

    finaleCloseBtn.click();
    expect(finaleOverlay.hidden).toBe(true);
  });

  it('finale reset button opens reset confirmation dialog and resets whole event', async () => {
    deps = {
      ...deps,
      selectWinner: vi.fn()
        .mockReturnValueOnce('A1')
        .mockReturnValueOnce('A2')
        .mockReturnValueOnce('A3'),
    };
    unmount = mountRaffleApp(root, deps);
    const switchRoundBtn = root.querySelector('[data-role="switch-round-button"]') as HTMLButtonElement;
    const startMainRoundBtn = root.querySelector('[data-role="start-main-round-btn"]') as HTMLButtonElement;
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    const advanceBtn = root.querySelector('[data-role="advance"]') as HTMLButtonElement;
    const finaleResetBtn = root.querySelector('[data-role="finale-reset-btn"]') as HTMLButtonElement;
    const resetDialog = root.querySelector('[data-role="reset-dialog"]') as HTMLDialogElement;
    const resetConfirmBtn = root.querySelector('[data-role="reset-confirm"]') as HTMLButtonElement;
    const finaleOverlay = root.querySelector('[data-role="finale-overlay"]') as HTMLElement;
    const roundBadge = root.querySelector('[data-role="round-badge"]') as HTMLElement;

    resetDialog.showModal = vi.fn().mockImplementation(() => { resetDialog.setAttribute('open', ''); });
    resetDialog.close = vi.fn().mockImplementation(() => { resetDialog.removeAttribute('open'); });

    switchRoundBtn.click();
    startMainRoundBtn.click();

    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    advanceBtn.click();

    expect(finaleOverlay.hidden).toBe(false);

    finaleResetBtn.click();
    expect(resetDialog.showModal).toHaveBeenCalled();

    resetConfirmBtn.click();
    expect(resetDialog.close).toHaveBeenCalled();

    expect(root.getAttribute('data-phase')).toBe('IDLE');
    expect(roundBadge.textContent).toBe('BABAK HADIAH HIBURAN');
    expect(roundBadge.classList.contains('gold')).toBe(false);
    expect(finaleOverlay.hidden).toBe(true);
    expect(deps.confetti?.stop).toHaveBeenCalled();
  });

  it('single button layout (without advance button) cycles draw and auto-advance seamlessly', async () => {
    // Re-render fixture without advance button
    document.body.innerHTML = `
      <div data-raffle-app>
        <button class="top-left-diamond" data-role="secret-reset"></button>
        <div class="round-badge" data-role="round-badge">BABAK HADIAH HIBURAN</div>
        <button class="mute-toggle-btn" data-role="mute-button">🔊 SUARA: AKTIF</button>
        <canvas class="confetti-canvas" data-role="confetti-canvas"></canvas>
        <div class="forfeit-flash" data-role="forfeit-flash"></div>
        <div data-role="wheel"></div>
        <div data-role="winner-display"></div>
        <div data-role="active-count"></div>
        <div data-role="prize-position"></div>
        <button data-role="spin-button">PUTAR SEKARANG</button>
        <button data-role="forfeit-button" hidden>Hangus</button>
        <button data-role="switch-round-button" hidden>Ke Hadiah Utama</button>
        <dialog data-role="intermission-dialog">
          <div data-role="intermission-winners"></div>
          <button data-role="start-main-round-btn">Mulai Hadiah Utama</button>
        </dialog>
        <dialog data-role="reset-dialog">
          <button data-role="reset-cancel">Batal</button>
          <button data-role="reset-confirm">Yakin</button>
        </dialog>
        <div data-role="winner-history"></div>
        <div data-role="error"></div>
        <div class="finale-overlay" data-role="finale-overlay" hidden>
          <div data-role="finale-small-winners"></div>
          <div data-role="finale-main-winners"></div>
          <button data-role="finale-reset-btn">Reset</button>
          <button data-role="finale-close-btn">Tutup</button>
        </div>
      </div>
    `;
    root = document.querySelector('[data-raffle-app]')!;

    deps = {
      ...deps,
      selectWinner: vi.fn()
        .mockReturnValueOnce('A1') // Small 1
        .mockReturnValueOnce('A1') // Main 1 (Karpet)
        .mockReturnValueOnce('A2') // Main 2 (Magicom)
        .mockReturnValueOnce('A3'), // Main 3 (Kipas Angin)
    };

    unmount = mountRaffleApp(root, deps);
    const spinBtn = root.querySelector('[data-role="spin-button"]') as HTMLButtonElement;
    const switchRoundBtn = root.querySelector('[data-role="switch-round-button"]') as HTMLButtonElement;
    const startMainRoundBtn = root.querySelector('[data-role="start-main-round-btn"]') as HTMLButtonElement;

    // First draw in small round
    expect(spinBtn.textContent).toContain('PUTAR SEKARANG');
    spinBtn.click();
    expect(spinBtn.textContent).toBe('MEMUTAR...');
    await Promise.resolve();
    await Promise.resolve();

    expect(spinBtn.textContent).toBe('LANJUT & PUTAR');

    // Switch to main round from REVEAL_WINNER
    switchRoundBtn.click();
    startMainRoundBtn.click();

    expect(spinBtn.textContent).toContain('PUTAR SEKARANG');

    // Main 1: Karpet
    spinBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(spinBtn.textContent).toBe('LANJUT & PUTAR');

    // Click LANJUT & PUTAR advances and spins for Main 2
    spinBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(spinBtn.textContent).toBe('LANJUT & PUTAR');

    // Click LANJUT & PUTAR advances and spins for Main 3 (last)
    spinBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(spinBtn.textContent).toBe('LIHAT SEMUA PEMENANG');

    // Click LIHAT SEMUA PEMENANG completes the raffle
    spinBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(root.getAttribute('data-phase')).toBe('COMPLETE');
    expect(spinBtn.textContent).toBe('SEMUA PEMENANG SELESAI');
    expect(spinBtn.disabled).toBe(true);
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
        round: 'small',
        activeLots: ['A1'],
        winners: [{ lotId: 'A2', prizeId: 'small-1', prizeLabel: 'Hadiah Hiburan #1', round: 'small', drawnAt: '2026-08-18T10:00:00Z' }],
        smallPrizeCount: 1,
        mainPrizeIndex: 0,
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

  it('default animateRoulette triggers anime.js motion and updates wheel and winner readout', async () => {
    const customDeps: ControllerDependencies = {
      config: mockConfig,
      selectWinner: vi.fn().mockReturnValue('A1'),
      storage: deps.storage,
      now: vi.fn().mockReturnValue('2026-08-18T10:00:00Z'),
      reducedMotion: vi.fn().mockReturnValue(true),
    };

    unmount = mountRaffleApp(root, customDeps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;

    drawBtn.click();

    await new Promise((r) => setTimeout(r, 100));

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

  it('mute button click toggles mute status and updates button label', () => {
    unmount = mountRaffleApp(root, deps);
    const muteBtn = root.querySelector('[data-role="mute-button"]') as HTMLButtonElement;
    expect(muteBtn.textContent).toBe('🔊 SUARA: AKTIF');

    muteBtn.click();
    expect(deps.soundEngine?.toggleMute).toHaveBeenCalledTimes(1);
    expect(muteBtn.textContent).toBe('🔇 SUARA: SENYAP');

    muteBtn.click();
    expect(deps.soundEngine?.toggleMute).toHaveBeenCalledTimes(2);
    expect(muteBtn.textContent).toBe('🔊 SUARA: AKTIF');
  });

  it('keyboard m / M / KeyM toggles mute status and updates button label', () => {
    unmount = mountRaffleApp(root, deps);
    const muteBtn = root.querySelector('[data-role="mute-button"]') as HTMLButtonElement;
    expect(muteBtn.textContent).toBe('🔊 SUARA: AKTIF');

    // Press 'm'
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'm' }));
    expect(deps.soundEngine?.toggleMute).toHaveBeenCalledTimes(1);
    expect(muteBtn.textContent).toBe('🔇 SUARA: SENYAP');

    // Press 'M'
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'M' }));
    expect(deps.soundEngine?.toggleMute).toHaveBeenCalledTimes(2);
    expect(muteBtn.textContent).toBe('🔊 SUARA: AKTIF');
  });

  it('restores initial muted button label if soundEngine is already muted', () => {
    deps.soundEngine?.setMuted(true);
    unmount = mountRaffleApp(root, deps);
    const muteBtn = root.querySelector('[data-role="mute-button"]') as HTMLButtonElement;
    expect(muteBtn.textContent).toBe('🔇 SUARA: SENYAP');
  });

  it('secret reset diamond click opens reset confirmation dialog', () => {
    unmount = mountRaffleApp(root, deps);
    const diamond = root.querySelector('[data-role="secret-reset"]') as HTMLElement;
    const dialog = root.querySelector('[data-role="reset-dialog"]') as HTMLDialogElement;
    dialog.showModal = vi.fn();

    diamond.click();
    expect(dialog.showModal).toHaveBeenCalled();
  });

  it('winner reveal triggers lock impact, fanfare sound, and confetti burst', async () => {
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;

    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(root.getAttribute('data-phase')).toBe('REVEAL_WINNER');
    expect(deps.soundEngine?.playLockImpact).toHaveBeenCalledTimes(1);
    expect(deps.soundEngine?.playFanfare).toHaveBeenCalledTimes(1);
    expect(deps.confetti?.fire).toHaveBeenCalledWith({ count: 90 });
  });

  it('passes onTick callback to animateRoulette forwarding to soundEngine', async () => {
    let capturedOptions: any = null;
    deps = {
      ...deps,
      animateRoulette: vi.fn().mockImplementation((opts) => {
        capturedOptions = opts;
        opts.onTick?.(0.75);
        return Promise.resolve();
      }),
    };

    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;

    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(capturedOptions).not.toBeNull();
    expect(deps.soundEngine?.playTick).toHaveBeenCalledWith(0.75);
  });

  it('forfeit activates forfeit-flash, plays forfeit sound, stops confetti, and auto-spins', async () => {
    deps = {
      ...deps,
      selectWinner: vi.fn().mockReturnValueOnce('A1').mockReturnValueOnce('A2'),
    };
    unmount = mountRaffleApp(root, deps);
    const drawBtn = root.querySelector('[data-role="draw"]') as HTMLButtonElement;
    const forfeitBtn = root.querySelector('[data-role="forfeit-button"]') as HTMLButtonElement;
    const forfeitFlash = root.querySelector('[data-role="forfeit-flash"]') as HTMLElement;

    drawBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(root.getAttribute('data-phase')).toBe('REVEAL_WINNER');

    forfeitBtn.click();
    expect(deps.soundEngine?.playForfeit).toHaveBeenCalledTimes(1);
    expect(forfeitFlash.classList.contains('active')).toBe(true);

    // Wait for flash timeout (>400ms)
    await new Promise((r) => setTimeout(r, 450));
    expect(forfeitFlash.classList.contains('active')).toBe(false);

    await Promise.resolve();
    await Promise.resolve();

    expect(deps.selectWinner).toHaveBeenCalledTimes(2);
  });
});
