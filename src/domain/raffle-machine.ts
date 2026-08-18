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

function reset(
  action: Extract<RaffleAction, { readonly type: 'RESET' }>,
  prizes: readonly Prize[],
): RaffleState {
  assertDistinctLots(action.fullPool);
  return freezeState(initialPhase(prizes), action.fullPool, [], 0, null);
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
  switch (action.type) {
    case 'START_DRAW':
      return startDraw(state, action, prizes);
    case 'REVEAL_WINNER':
      return revealWinner(state);
    case 'ADVANCE':
      return advance(state, prizes);
    case 'RESET':
      return reset(action, prizes);
  }
}

export function stabilizeRestoredState(state: RaffleState, prizes: readonly Prize[]): RaffleState {
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
