import type {
  EventConfig,
  Prize,
  RaffleAction,
  RaffleState,
  WinnerRecord,
} from './types';

function freezeWinner(winner: WinnerRecord): WinnerRecord {
  return Object.freeze({ ...winner });
}

function freezeState(
  phase: RaffleState['phase'],
  activeLots: readonly string[],
  winners: readonly WinnerRecord[],
  prizeIndex: number,
  pendingWinner: WinnerRecord | null,
): RaffleState {
  return Object.freeze({
    phase,
    activeLots: Object.freeze([...activeLots]),
    winners: Object.freeze(winners.map(freezeWinner)),
    prizeIndex,
    pendingWinner: pendingWinner === null ? null : freezeWinner(pendingWinner),
  });
}

function assertDistinctLots(lots: readonly string[]): void {
  if (new Set(lots).size !== lots.length) {
    throw new Error('Kumpulan nomor kavling tidak boleh mengandung duplikat.');
  }
}

function assertStoredStateInvariants(state: RaffleState, prizes: readonly Prize[]): void {
  if (!['idle', 'spinning', 'winner', 'complete'].includes(state.phase)) {
    throw new Error('Fase pengundian tersimpan tidak valid.');
  }

  if (
    !Number.isSafeInteger(state.prizeIndex)
    || state.prizeIndex < 0
    || (state.phase === 'complete'
      ? state.prizeIndex !== prizes.length
      : state.prizeIndex >= prizes.length)
  ) {
    throw new Error('Indeks hadiah tersimpan tidak valid.');
  }

  if (state.phase === 'spinning' && state.pendingWinner === null) {
    throw new Error('Data pengundian tersimpan tidak memiliki pemenang tertunda.');
  }

  if (state.phase !== 'spinning' && state.pendingWinner !== null) {
    throw new Error('Pemenang tertunda hanya diizinkan saat pengundian berlangsung.');
  }

  if (new Set(state.activeLots).size !== state.activeLots.length) {
    throw new Error('Nomor kavling aktif tersimpan mengandung duplikat.');
  }

  const winnerLots = new Set<string>();

  for (const winner of state.winners) {
    if (winnerLots.has(winner.lotId)) {
      throw new Error('Riwayat pemenang tersimpan mengandung nomor kavling duplikat.');
    }

    if (state.activeLots.includes(winner.lotId)) {
      throw new Error('Nomor kavling pemenang masih aktif.');
    }

    if (!prizes.some((prize) => prize.id === winner.prizeId && prize.label === winner.prizeLabel)) {
      throw new Error('Hadiah pemenang tersimpan tidak dikenal.');
    }

    winnerLots.add(winner.lotId);
  }

  if (state.pendingWinner !== null) {
    if (state.activeLots.includes(state.pendingWinner.lotId)) {
      throw new Error('Pemenang tertunda masih aktif.');
    }

    if (winnerLots.has(state.pendingWinner.lotId)) {
      throw new Error('Pemenang tertunda sudah tercatat sebagai pemenang.');
    }

    const prize = currentPrize(state, prizes);

    if (prize.id !== state.pendingWinner.prizeId || prize.label !== state.pendingWinner.prizeLabel) {
      throw new Error('Pemenang tertunda tidak cocok dengan hadiah saat ini.');
    }
  }

  const expectedWinnerCount = state.phase === 'winner'
    ? state.prizeIndex + 1
    : state.phase === 'complete'
      ? prizes.length
      : state.prizeIndex;

  if (state.winners.length !== expectedWinnerCount) {
    throw new Error('Jumlah pemenang tersimpan tidak cocok dengan kemajuan hadiah.');
  }

  for (const [index, winner] of state.winners.entries()) {
    const prize = prizes[index];

    if (prize === undefined || prize.id !== winner.prizeId || prize.label !== winner.prizeLabel) {
      throw new Error('Urutan hadiah pemenang tersimpan tidak cocok dengan konfigurasi.');
    }
  }
}

function initialPhase(prizes: readonly Prize[]): RaffleState['phase'] {
  return prizes.length === 0 ? 'complete' : 'idle';
}

function currentPrize(state: RaffleState, prizes: readonly Prize[]): Prize {
  const prize = prizes[state.prizeIndex];

  if (prize === undefined) {
    throw new Error('Hadiah untuk pengundian saat ini tidak tersedia.');
  }

  return prize;
}

function startDraw(
  state: RaffleState,
  action: Extract<RaffleAction, { readonly type: 'START_DRAW' }>,
  prizes: readonly Prize[],
): RaffleState {
  if (state.phase === 'spinning') {
    throw new Error('Pengundian sudah berlangsung.');
  }

  if (state.phase !== 'idle') {
    throw new Error('Pengundian hanya dapat dimulai saat siap.');
  }

  if (state.activeLots.length === 0) {
    throw new Error('Tidak ada nomor kavling aktif untuk diundi.');
  }

  const lotIndex = state.activeLots.indexOf(action.lotId);

  if (lotIndex === -1) {
    throw new Error('Nomor kavling yang dipilih tidak aktif.');
  }

  const prize = currentPrize(state, prizes);
  const pendingWinner: WinnerRecord = {
    lotId: action.lotId,
    prizeId: prize.id,
    prizeLabel: prize.label,
    drawnAt: action.drawnAt,
  };

  return freezeState(
    'spinning',
    [...state.activeLots.slice(0, lotIndex), ...state.activeLots.slice(lotIndex + 1)],
    state.winners,
    state.prizeIndex,
    pendingWinner,
  );
}

function revealWinner(state: RaffleState): RaffleState {
  if (state.phase !== 'spinning') {
    throw new Error('Tidak ada pengundian yang sedang berlangsung untuk diumumkan.');
  }

  if (state.pendingWinner === null) {
    throw new Error('Data pengundian tersimpan tidak memiliki pemenang tertunda.');
  }

  return freezeState(
    'winner',
    state.activeLots,
    [...state.winners, state.pendingWinner],
    state.prizeIndex,
    null,
  );
}

function advance(state: RaffleState, prizes: readonly Prize[]): RaffleState {
  if (state.phase === 'spinning') {
    throw new Error('Tidak dapat melanjutkan saat pengundian berlangsung.');
  }

  if (state.phase !== 'winner') {
    throw new Error('Tidak ada pemenang yang dapat dilanjutkan.');
  }

  const nextPrizeIndex = state.prizeIndex + 1;

  return freezeState(
    nextPrizeIndex >= prizes.length ? 'complete' : 'idle',
    state.activeLots,
    state.winners,
    nextPrizeIndex,
    null,
  );
}

function forfeit(state: RaffleState): RaffleState {
  if (state.phase !== 'winner') {
    throw new Error('Hanya bisa hangus setelah pemenang muncul.');
  }

  return freezeState(
    'idle',
    state.activeLots,
    state.winners.slice(0, -1),
    state.prizeIndex,
    null,
  );
}

function reset(
  state: RaffleState,
  action: Extract<RaffleAction, { readonly type: 'RESET' }>,
  prizes: readonly Prize[],
): RaffleState {
  if (state.phase === 'spinning') {
    throw new Error('Pengaturan ulang tidak tersedia saat pengundian berlangsung.');
  }

  assertDistinctLots(action.fullPool);
  return freezeState(initialPhase(prizes), action.fullPool, [], 0, null);
}

function unknownAction(action: never): never {
  const type = (action as { readonly type?: unknown }).type;
  throw new Error(`Aksi pengundian tidak dikenal: ${String(type)}.`);
}

export function createInitialState(config: EventConfig, lots: readonly string[]): RaffleState {
  assertDistinctLots(lots);
  return freezeState(initialPhase(config.prizes), lots, [], 0, null);
}

export function transition(
  state: RaffleState,
  action: RaffleAction,
  prizes: readonly Prize[],
): RaffleState {
  assertStoredStateInvariants(state, prizes);

  switch (action.type) {
    case 'START_DRAW':
      return startDraw(state, action, prizes);
    case 'REVEAL_WINNER':
      return revealWinner(state);
    case 'ADVANCE':
      return advance(state, prizes);
    case 'FORFEIT':
      return forfeit(state);
    case 'RESET':
      return reset(state, action, prizes);
    default:
      return unknownAction(action);
  }
}

export function stabilizeRestoredState(state: RaffleState, prizes: readonly Prize[]): RaffleState {
  assertStoredStateInvariants(state, prizes);

  if (state.phase === 'spinning') {
    return transition(state, { type: 'REVEAL_WINNER' }, prizes);
  }

  return freezeState(
    state.phase,
    state.activeLots,
    state.winners,
    state.prizeIndex,
    state.pendingWinner,
  );
}
