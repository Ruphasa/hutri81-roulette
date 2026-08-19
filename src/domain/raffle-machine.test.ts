import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  stabilizeRestoredState,
  transition,
} from './raffle-machine';
import type { EventConfig, RaffleState } from './types';
import { MAIN_PRIZES } from '../config/event';

const config: EventConfig = {
  id: 'hut-ri-81',
  title: 'Undian HUT RI ke-81',
  neighborhood: 'RT 01 / RW 01',
  lotRanges: [{ prefix: 'L', start: 201, end: 203 }],
  prizes: MAIN_PRIZES,
};

const fullPool = ['L201', 'L202', 'L203'];
const drawnAt = '2026-08-17T12:00:00.000Z';

function startDraw(state = createInitialState(config, fullPool)) {
  return transition(state, { type: 'START_DRAW', lotId: 'L202', drawnAt }, MAIN_PRIZES);
}

describe('two-round raffle state transitions', () => {
  it('handles small prize draw and dynamic count progression', () => {
    let state = createInitialState(config, fullPool);
    expect(state.round).toBe('small');
    expect(state.smallPrizeCount).toBe(0);
    expect(state.mainPrizeIndex).toBe(0);

    state = transition(state, { type: 'START_DRAW', lotId: 'L201', drawnAt: '2026-08-19' }, MAIN_PRIZES);
    expect(state.phase).toBe('spinning');
    expect(state.pendingWinner?.prizeLabel).toBe('Hadiah Hiburan #1');
    expect(state.pendingWinner?.prizeId).toBe('small-1');
    expect(state.pendingWinner?.round).toBe('small');
    expect(state.activeLots).toEqual(['L202', 'L203']);

    state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
    expect(state.phase).toBe('winner');
    expect(state.winners).toHaveLength(1);
    expect(state.smallPrizeCount).toBe(1);
    expect(state.pendingWinner).toBeNull();
    expect(state.winners[0]).toEqual({
      lotId: 'L201',
      prizeId: 'small-1',
      prizeLabel: 'Hadiah Hiburan #1',
      round: 'small',
      drawnAt: '2026-08-19',
    });

    state = transition(state, { type: 'ADVANCE' }, MAIN_PRIZES);
    expect(state.phase).toBe('idle');
    expect(state.round).toBe('small');
    expect(state.smallPrizeCount).toBe(1);

    // Second small prize draw
    state = transition(state, { type: 'START_DRAW', lotId: 'L202', drawnAt: '2026-08-19' }, MAIN_PRIZES);
    expect(state.pendingWinner?.prizeLabel).toBe('Hadiah Hiburan #2');
    expect(state.pendingWinner?.prizeId).toBe('small-2');

    state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
    expect(state.winners).toHaveLength(2);
    expect(state.smallPrizeCount).toBe(2);

    state = transition(state, { type: 'ADVANCE' }, MAIN_PRIZES);
    expect(state.phase).toBe('idle');
    expect(state.round).toBe('small');
  });

  it('switches to main round, resets activeLots to fullPool, and sequences 3 main prizes strictly', () => {
    let state = createInitialState(config, fullPool);
    state = transition(state, { type: 'START_DRAW', lotId: 'L201', drawnAt: '2026-08-19' }, MAIN_PRIZES);
    state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
    state = transition(state, { type: 'ADVANCE' }, MAIN_PRIZES);

    // Switch to main round with full pool reset
    state = transition(state, { type: 'SWITCH_TO_MAIN_ROUND', fullPool: ['L201', 'L202', 'L203'] }, MAIN_PRIZES);
    expect(state.round).toBe('main');
    expect(state.activeLots).toEqual(['L201', 'L202', 'L203']);
    expect(state.mainPrizeIndex).toBe(0);
    expect(state.winners).toHaveLength(1); // Preserves small round winners
    expect(state.winners[0]?.round).toBe('small');

    // Main Prize 1: Karpet
    state = transition(state, { type: 'START_DRAW', lotId: 'L201', drawnAt: '2026-08-19' }, MAIN_PRIZES);
    expect(state.pendingWinner?.prizeLabel).toBe('Karpet');
    expect(state.pendingWinner?.prizeId).toBe('main-karpet');
    expect(state.pendingWinner?.round).toBe('main');
    state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
    expect(state.mainPrizeIndex).toBe(0);
    state = transition(state, { type: 'ADVANCE' }, MAIN_PRIZES);
    expect(state.phase).toBe('idle');
    expect(state.mainPrizeIndex).toBe(1);

    // Main Prize 2: Magicom
    state = transition(state, { type: 'START_DRAW', lotId: 'L202', drawnAt: '2026-08-19' }, MAIN_PRIZES);
    expect(state.pendingWinner?.prizeLabel).toBe('Magicom');
    expect(state.pendingWinner?.prizeId).toBe('main-magicom');
    state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
    expect(state.mainPrizeIndex).toBe(1);
    state = transition(state, { type: 'ADVANCE' }, MAIN_PRIZES);
    expect(state.phase).toBe('idle');
    expect(state.mainPrizeIndex).toBe(2);

    // Main Prize 3: Kipas Angin
    state = transition(state, { type: 'START_DRAW', lotId: 'L203', drawnAt: '2026-08-19' }, MAIN_PRIZES);
    expect(state.pendingWinner?.prizeLabel).toBe('Kipas Angin');
    expect(state.pendingWinner?.prizeId).toBe('main-kipas');
    state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
    expect(state.mainPrizeIndex).toBe(2);
    state = transition(state, { type: 'ADVANCE' }, MAIN_PRIZES);
    expect(state.phase).toBe('complete');
    expect(state.mainPrizeIndex).toBe(3);
    expect(state.winners).toHaveLength(4); // 1 small + 3 main
  });

  it('rejects SWITCH_TO_MAIN_ROUND while draw is spinning', () => {
    const spinning = startDraw();
    expect(() =>
      transition(spinning, { type: 'SWITCH_TO_MAIN_ROUND', fullPool }, MAIN_PRIZES),
    ).toThrow('Pengalihan babak tidak tersedia saat pengundian berlangsung.');
  });

  it('rejects invalid phase actions and a draw from an empty pool', () => {
    const spinning = startDraw();
    const noLots = createInitialState(config, []);

    expect(() => transition(spinning, { type: 'START_DRAW', lotId: 'L201', drawnAt }, MAIN_PRIZES)).toThrow(
      'Pengundian sudah berlangsung.',
    );
    expect(() => transition(spinning, { type: 'ADVANCE' }, MAIN_PRIZES)).toThrow(
      'Tidak dapat melanjutkan saat pengundian berlangsung.',
    );
    expect(() => transition(noLots, { type: 'START_DRAW', lotId: 'L201', drawnAt }, MAIN_PRIZES)).toThrow(
      'Tidak ada nomor kavling aktif untuk diundi.',
    );
  });

  it('never accepts a lot that is not active, preventing repeat winners in same round', () => {
    const winner = transition(startDraw(), { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
    const nextPrize = transition(winner, { type: 'ADVANCE' }, MAIN_PRIZES);

    expect(() =>
      transition(nextPrize, { type: 'START_DRAW', lotId: 'L202', drawnAt }, MAIN_PRIZES),
    ).toThrow('Nomor kavling yang dipilih tidak aktif.');
  });

  it('rejects reset while a selected winner is pending', () => {
    const spinning = startDraw();

    expect(() => transition(spinning, { type: 'RESET', fullPool }, MAIN_PRIZES)).toThrow(
      'Pengaturan ulang tidak tersedia saat pengundian berlangsung.',
    );
  });

  it('resets the supplied full pool and all event progress back to small round', () => {
    const winner = transition(startDraw(), { type: 'REVEAL_WINNER' }, MAIN_PRIZES);
    const reset = transition(winner, { type: 'RESET', fullPool }, MAIN_PRIZES);

    expect(reset).toEqual({
      phase: 'idle',
      round: 'small',
      activeLots: fullPool,
      winners: [],
      smallPrizeCount: 0,
      mainPrizeIndex: 0,
      pendingWinner: null,
    });
  });

  it('rejects an unknown runtime action explicitly', () => {
    const initial = createInitialState(config, fullPool);
    const unknownAction = { type: 'BOGUS' } as unknown as import('./types').RaffleAction;

    expect(() => transition(initial, unknownAction, MAIN_PRIZES)).toThrow(
      'Aksi pengundian tidak dikenal: BOGUS.',
    );
  });
});

describe('forfeit transition', () => {
  it('forfeits small prize winner, decrements smallPrizeCount, and leaves lot permanently removed', () => {
    let state = createInitialState(config, ['A1', 'A2', 'A3']);
    state = transition(state, { type: 'START_DRAW', lotId: 'A2', drawnAt: '2026-08-18' }, MAIN_PRIZES);
    state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);

    expect(state.phase).toBe('winner');
    expect(state.winners.length).toBe(1);
    expect(state.smallPrizeCount).toBe(1);
    expect(state.activeLots).not.toContain('A2');

    state = transition(state, { type: 'FORFEIT' }, MAIN_PRIZES);

    expect(state.phase).toBe('idle');
    expect(state.winners.length).toBe(0);
    expect(state.smallPrizeCount).toBe(0);
    expect(state.activeLots).not.toContain('A2'); // Permanently discarded from pool
  });

  it('forfeits main prize winner, preserves mainPrizeIndex, and leaves lot permanently removed', () => {
    let state = createInitialState(config, ['A1', 'A2', 'A3']);
    state = transition(state, { type: 'SWITCH_TO_MAIN_ROUND', fullPool: ['A1', 'A2', 'A3'] }, MAIN_PRIZES);
    state = transition(state, { type: 'START_DRAW', lotId: 'A2', drawnAt: '2026-08-18' }, MAIN_PRIZES);
    state = transition(state, { type: 'REVEAL_WINNER' }, MAIN_PRIZES);

    expect(state.phase).toBe('winner');
    expect(state.winners.length).toBe(1);
    expect(state.mainPrizeIndex).toBe(0);
    expect(state.activeLots).not.toContain('A2');

    state = transition(state, { type: 'FORFEIT' }, MAIN_PRIZES);

    expect(state.phase).toBe('idle');
    expect(state.winners.length).toBe(0);
    expect(state.mainPrizeIndex).toBe(0); // Still 0, so Karpet can be redrawn
    expect(state.activeLots).not.toContain('A2'); // Permanently discarded from main pool
  });

  it('throws error if FORFEIT is called outside winner phase', () => {
    const state = createInitialState(config, ['A1']);
    expect(() => transition(state, { type: 'FORFEIT' }, MAIN_PRIZES)).toThrow(
      'Hanya bisa hangus setelah pemenang muncul.',
    );
  });
});

describe('stabilizeRestoredState', () => {
  it('promotes a persisted pending winner without selecting another lot in small round', () => {
    const spinning = startDraw();
    const restored = stabilizeRestoredState(spinning, MAIN_PRIZES);

    expect(restored).toEqual(transition(spinning, { type: 'REVEAL_WINNER' }, MAIN_PRIZES));
    expect(restored.activeLots).toEqual(['L201', 'L203']);
    expect(restored.smallPrizeCount).toBe(1);
    expect(restored.round).toBe('small');
  });

  it('promotes a persisted pending winner in main round', () => {
    let state = createInitialState(config, fullPool);
    state = transition(state, { type: 'SWITCH_TO_MAIN_ROUND', fullPool }, MAIN_PRIZES);
    const spinning = transition(state, { type: 'START_DRAW', lotId: 'L201', drawnAt }, MAIN_PRIZES);
    const restored = stabilizeRestoredState(spinning, MAIN_PRIZES);

    expect(restored.phase).toBe('winner');
    expect(restored.round).toBe('main');
    expect(restored.mainPrizeIndex).toBe(0);
    expect(restored.winners[0]).toEqual({
      lotId: 'L201',
      prizeId: 'main-karpet',
      prizeLabel: 'Karpet',
      round: 'main',
      drawnAt,
    });
  });

  it('returns a new immutable state even when restoration needs no stabilization', () => {
    const idle = createInitialState(config, fullPool);
    const restored = stabilizeRestoredState(idle, MAIN_PRIZES);

    expect(restored).toEqual(idle);
    expect(restored).not.toBe(idle);
    expect(Object.isFrozen(restored.winners)).toBe(true);
  });

  it('rejects malformed persisted spinning states without a pending winner', () => {
    const malformed: RaffleState = {
      ...createInitialState(config, fullPool),
      phase: 'spinning',
      pendingWinner: null,
    };

    expect(() => stabilizeRestoredState(malformed, MAIN_PRIZES)).toThrow(
      'Data pengundian tersimpan tidak memiliki pemenang tertunda.',
    );
  });

  it('rejects a stable phase that retains a pending winner', () => {
    const spinning = startDraw();
    const malformed: RaffleState = { ...spinning, phase: 'idle' };

    expect(() => stabilizeRestoredState(malformed, MAIN_PRIZES)).toThrow(
      'Pemenang tertunda hanya diizinkan saat pengundian berlangsung.',
    );
  });

  it('rejects out-of-range main prize indexes for restored states', () => {
    const malformed: RaffleState = {
      ...createInitialState(config, fullPool),
      round: 'main',
      mainPrizeIndex: 5,
    };

    expect(() => stabilizeRestoredState(malformed, MAIN_PRIZES)).toThrow(
      'Indeks hadiah tersimpan tidak valid.',
    );
  });

  it('rejects winner histories whose count does not match the phase and prize index in main round', () => {
    const initialMain: RaffleState = {
      ...createInitialState(config, fullPool),
      round: 'main',
    };
    const missingWinner: RaffleState = { ...initialMain, phase: 'winner' };
    const skippedIdleWinner: RaffleState = { ...initialMain, mainPrizeIndex: 1 };
    const emptyComplete: RaffleState = { ...initialMain, phase: 'complete', mainPrizeIndex: 3 };

    expect(() => stabilizeRestoredState(missingWinner, MAIN_PRIZES)).toThrow(
      'Jumlah pemenang tersimpan tidak cocok dengan kemajuan hadiah.',
    );
    expect(() => stabilizeRestoredState(skippedIdleWinner, MAIN_PRIZES)).toThrow(
      'Jumlah pemenang tersimpan tidak cocok dengan kemajuan hadiah.',
    );
    expect(() => stabilizeRestoredState(emptyComplete, MAIN_PRIZES)).toThrow(
      'Jumlah pemenang tersimpan tidak cocok dengan kemajuan hadiah.',
    );
  });

  it('rejects winner histories whose prize order differs from the configured order', () => {
    const wrongPrizeOrder: RaffleState = {
      ...createInitialState(config, ['L202', 'L203']),
      round: 'main',
      mainPrizeIndex: 1,
      winners: [{ lotId: 'L201', prizeId: 'main-magicom', prizeLabel: 'Magicom', round: 'main', drawnAt }],
    };

    expect(() => stabilizeRestoredState(wrongPrizeOrder, MAIN_PRIZES)).toThrow(
      'Urutan hadiah pemenang tersimpan tidak cocok dengan konfigurasi.',
    );
  });

  it('rejects restored pools and histories with duplicate lots in the same round', () => {
    const duplicateActiveLots: RaffleState = {
      ...createInitialState(config, fullPool),
      activeLots: ['L201', 'L201'],
    };
    const activeWinnerOverlap: RaffleState = {
      ...createInitialState(config, fullPool),
      smallPrizeCount: 1,
      winners: [{ lotId: 'L201', prizeId: 'small-1', prizeLabel: 'Hadiah Hiburan #1', round: 'small', drawnAt }],
    };
    const duplicateWinnerLots: RaffleState = {
      ...createInitialState(config, ['L203']),
      smallPrizeCount: 2,
      winners: [
        { lotId: 'L201', prizeId: 'small-1', prizeLabel: 'Hadiah Hiburan #1', round: 'small', drawnAt },
        { lotId: 'L201', prizeId: 'small-2', prizeLabel: 'Hadiah Hiburan #2', round: 'small', drawnAt },
      ],
    };

    expect(() => stabilizeRestoredState(duplicateActiveLots, MAIN_PRIZES)).toThrow(
      'Nomor kavling aktif tersimpan mengandung duplikat.',
    );
    expect(() => stabilizeRestoredState(activeWinnerOverlap, MAIN_PRIZES)).toThrow(
      'Nomor kavling pemenang masih aktif.',
    );
    expect(() => stabilizeRestoredState(duplicateWinnerLots, MAIN_PRIZES)).toThrow(
      'Riwayat pemenang tersimpan mengandung nomor kavling duplikat.',
    );
  });
});
