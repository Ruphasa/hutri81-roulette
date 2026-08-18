import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  stabilizeRestoredState,
  transition,
} from './raffle-machine';
import type { EventConfig, Prize, RaffleState } from './types';

const config: EventConfig = {
  id: 'hut-ri-81',
  title: 'Undian HUT RI ke-81',
  neighborhood: 'RT 01 / RW 01',
  lotRanges: [{ prefix: 'L', start: 201, end: 203 }],
  prizes: [
    { id: 'hadiah-1', label: 'Hadiah ke-1' },
    { id: 'hadiah-2', label: 'Hadiah ke-2' },
  ],
};

const prizes: readonly Prize[] = config.prizes;
const fullPool = ['L201', 'L202', 'L203'];
const drawnAt = '2026-08-17T12:00:00.000Z';

function startDraw(state = createInitialState(config, fullPool)) {
  return transition(state, { type: 'START_DRAW', lotId: 'L202', drawnAt }, prizes);
}

describe('raffle state transitions', () => {
  it('starts a draw by consuming the selected lot and keeping it pending during animation', () => {
    const initial = createInitialState(config, fullPool);
    const spinning = startDraw(initial);

    expect(spinning).toEqual({
      phase: 'spinning',
      activeLots: ['L201', 'L203'],
      winners: [],
      prizeIndex: 0,
      pendingWinner: {
        lotId: 'L202',
        prizeId: 'hadiah-1',
        prizeLabel: 'Hadiah ke-1',
        drawnAt,
      },
    });
    expect(spinning).not.toBe(initial);
    expect(Object.isFrozen(spinning)).toBe(true);
    expect(Object.isFrozen(spinning.activeLots)).toBe(true);
  });

  it('reveals one pending winner after spinning', () => {
    const winner = transition(startDraw(), { type: 'REVEAL_WINNER' }, prizes);

    expect(winner).toEqual({
      phase: 'winner',
      activeLots: ['L201', 'L203'],
      winners: [{ lotId: 'L202', prizeId: 'hadiah-1', prizeLabel: 'Hadiah ke-1', drawnAt }],
      prizeIndex: 0,
      pendingWinner: null,
    });
  });

  it('advances to the next prize, then completes after the final prize', () => {
    const firstWinner = transition(startDraw(), { type: 'REVEAL_WINNER' }, prizes);
    const nextPrize = transition(firstWinner, { type: 'ADVANCE' }, prizes);
    const secondWinner = transition(
      transition(nextPrize, { type: 'START_DRAW', lotId: 'L201', drawnAt }, prizes),
      { type: 'REVEAL_WINNER' },
      prizes,
    );

    expect(nextPrize).toMatchObject({ phase: 'idle', prizeIndex: 1, pendingWinner: null });
    expect(transition(secondWinner, { type: 'ADVANCE' }, prizes)).toMatchObject({
      phase: 'complete',
      prizeIndex: 2,
      pendingWinner: null,
    });
  });

  it('rejects invalid phase actions and a draw from an empty pool', () => {
    const spinning = startDraw();
    const noLots = createInitialState(config, []);

    expect(() => transition(spinning, { type: 'START_DRAW', lotId: 'L201', drawnAt }, prizes)).toThrow(
      'Pengundian sudah berlangsung.',
    );
    expect(() => transition(spinning, { type: 'ADVANCE' }, prizes)).toThrow(
      'Tidak dapat melanjutkan saat pengundian berlangsung.',
    );
    expect(() => transition(noLots, { type: 'START_DRAW', lotId: 'L201', drawnAt }, prizes)).toThrow(
      'Tidak ada nomor kavling aktif untuk diundi.',
    );
  });

  it('never accepts a lot that is not active, preventing repeat winners', () => {
    const winner = transition(startDraw(), { type: 'REVEAL_WINNER' }, prizes);
    const nextPrize = transition(winner, { type: 'ADVANCE' }, prizes);

    expect(() =>
      transition(nextPrize, { type: 'START_DRAW', lotId: 'L202', drawnAt }, prizes),
    ).toThrow('Nomor kavling yang dipilih tidak aktif.');
  });

  it('rejects reset while a selected winner is pending', () => {
    const spinning = startDraw();

    expect(() => transition(spinning, { type: 'RESET', fullPool }, prizes)).toThrow(
      'Pengaturan ulang tidak tersedia saat pengundian berlangsung.',
    );
  });

  it('resets the supplied full pool and all event progress from a stable phase', () => {
    const winner = transition(startDraw(), { type: 'REVEAL_WINNER' }, prizes);
    const reset = transition(winner, { type: 'RESET', fullPool }, prizes);

    expect(reset).toEqual({
      phase: 'idle',
      activeLots: fullPool,
      winners: [],
      prizeIndex: 0,
      pendingWinner: null,
    });
  });

  it('rejects an unknown runtime action explicitly', () => {
    const initial = createInitialState(config, fullPool);
    const unknownAction = { type: 'BOGUS' } as unknown as import('./types').RaffleAction;

    expect(() => transition(initial, unknownAction, prizes)).toThrow(
      'Aksi pengundian tidak dikenal: BOGUS.',
    );
  });
});

describe('stabilizeRestoredState', () => {
  it('promotes a persisted pending winner without selecting another lot', () => {
    const spinning = startDraw();
    const restored = stabilizeRestoredState(spinning, prizes);

    expect(restored).toEqual(transition(spinning, { type: 'REVEAL_WINNER' }, prizes));
    expect(restored.activeLots).toEqual(['L201', 'L203']);
  });

  it('returns a new immutable state even when restoration needs no stabilization', () => {
    const idle = createInitialState(config, fullPool);
    const restored = stabilizeRestoredState(idle, prizes);

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

    expect(() => stabilizeRestoredState(malformed, prizes)).toThrow(
      'Data pengundian tersimpan tidak memiliki pemenang tertunda.',
    );
  });

  it('rejects a stable phase that retains a pending winner', () => {
    const spinning = startDraw();
    const malformed: RaffleState = { ...spinning, phase: 'idle' };

    expect(() => stabilizeRestoredState(malformed, prizes)).toThrow(
      'Pemenang tertunda hanya diizinkan saat pengundian berlangsung.',
    );
  });

  it('rejects out-of-range prize indexes for restored states', () => {
    const malformed: RaffleState = { ...createInitialState(config, fullPool), prizeIndex: 2 };

    expect(() => stabilizeRestoredState(malformed, prizes)).toThrow(
      'Indeks hadiah tersimpan tidak valid.',
    );
  });

  it('rejects restored pools and histories with duplicate or overlapping lots', () => {
    const duplicateActiveLots: RaffleState = {
      ...createInitialState(config, fullPool),
      activeLots: ['L201', 'L201'],
    };
    const activeWinnerOverlap: RaffleState = {
      ...createInitialState(config, fullPool),
      winners: [{ lotId: 'L201', prizeId: 'hadiah-1', prizeLabel: 'Hadiah ke-1', drawnAt }],
    };
    const duplicateWinnerLots: RaffleState = {
      ...createInitialState(config, ['L202', 'L203']),
      winners: [
        { lotId: 'L201', prizeId: 'hadiah-1', prizeLabel: 'Hadiah ke-1', drawnAt },
        { lotId: 'L201', prizeId: 'hadiah-1', prizeLabel: 'Hadiah ke-1', drawnAt },
      ],
    };

    expect(() => stabilizeRestoredState(duplicateActiveLots, prizes)).toThrow(
      'Nomor kavling aktif tersimpan mengandung duplikat.',
    );
    expect(() => stabilizeRestoredState(activeWinnerOverlap, prizes)).toThrow(
      'Nomor kavling pemenang masih aktif.',
    );
    expect(() => stabilizeRestoredState(duplicateWinnerLots, prizes)).toThrow(
      'Riwayat pemenang tersimpan mengandung nomor kavling duplikat.',
    );
  });

  it('rejects a pending winner that was not removed or does not match the active prize', () => {
    const spinning = startDraw();
    const pendingWinner = spinning.pendingWinner;

    if (pendingWinner === null) {
      throw new Error('Fixture pengundian tidak memiliki pemenang tertunda.');
    }

    const activePendingLot: RaffleState = {
      ...spinning,
      activeLots: [...spinning.activeLots, pendingWinner.lotId],
    };
    const wrongPendingPrize: RaffleState = {
      ...spinning,
      pendingWinner: { ...pendingWinner, prizeId: 'hadiah-2', prizeLabel: 'Hadiah ke-2' },
    };
    const pendingAlreadyWon: RaffleState = {
      ...spinning,
      winners: [pendingWinner],
    };

    expect(() => stabilizeRestoredState(activePendingLot, prizes)).toThrow(
      'Pemenang tertunda masih aktif.',
    );
    expect(() => stabilizeRestoredState(wrongPendingPrize, prizes)).toThrow(
      'Pemenang tertunda tidak cocok dengan hadiah saat ini.',
    );
    expect(() => stabilizeRestoredState(pendingAlreadyWon, prizes)).toThrow(
      'Pemenang tertunda sudah tercatat sebagai pemenang.',
    );
  });
});
