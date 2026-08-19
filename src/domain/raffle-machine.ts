import type {
  EventConfig,
  Prize,
  RaffleAction,
  RaffleRound,
  RaffleState,
  WinnerRecord,
} from './types';

function freezeWinner(winner: WinnerRecord): WinnerRecord {
  return Object.freeze({ ...winner });
}

function freezeState(
  phase: RaffleState['phase'],
  round: RaffleRound,
  activeLots: readonly string[],
  winners: readonly WinnerRecord[],
  smallPrizeCount: number,
  mainPrizeIndex: number,
  pendingWinner: WinnerRecord | null,
): RaffleState {
  return Object.freeze({
    phase,
    round,
    activeLots: Object.freeze([...activeLots]),
    winners: Object.freeze(winners.map(freezeWinner)),
    smallPrizeCount,
    mainPrizeIndex,
    pendingWinner: pendingWinner === null ? null : freezeWinner(pendingWinner),
  });
}

function assertDistinctLots(lots: readonly string[]): void {
  if (new Set(lots).size !== lots.length) {
    throw new Error('Kumpulan nomor kavling tidak boleh mengandung duplikat.');
  }
}

function currentPrize(state: RaffleState, mainPrizes: readonly Prize[]): Prize {
  if (state.round === 'small') {
    const num = state.smallPrizeCount + 1;
    return {
      id: `small-${num}`,
      label: `Hadiah Hiburan #${num}`,
    };
  }

  const prize = mainPrizes[state.mainPrizeIndex];
  if (prize === undefined) {
    throw new Error('Hadiah untuk pengundian saat ini tidak tersedia.');
  }
  return prize;
}

function assertStoredStateInvariants(state: RaffleState, mainPrizes: readonly Prize[]): void {
  if (!['idle', 'spinning', 'winner', 'complete'].includes(state.phase)) {
    throw new Error('Fase pengundian tersimpan tidak valid.');
  }

  if (!['small', 'main'].includes(state.round)) {
    throw new Error('Babak pengundian tersimpan tidak valid.');
  }

  if (!Number.isSafeInteger(state.smallPrizeCount) || state.smallPrizeCount < 0) {
    throw new Error('Jumlah hadiah hiburan tersimpan tidak valid.');
  }

  if (!Number.isSafeInteger(state.mainPrizeIndex) || state.mainPrizeIndex < 0) {
    throw new Error('Indeks hadiah tersimpan tidak valid.');
  }

  if (state.round === 'small') {
    if (state.mainPrizeIndex !== 0) {
      throw new Error('Indeks hadiah utama harus 0 pada babak hiburan.');
    }
    if (state.phase === 'complete') {
      throw new Error('Babak hiburan tidak boleh berstatus selesai.');
    }
  } else {
    if (
      state.phase === 'complete'
        ? state.mainPrizeIndex !== mainPrizes.length
        : state.mainPrizeIndex >= mainPrizes.length
    ) {
      throw new Error('Indeks hadiah tersimpan tidak valid.');
    }
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

  const smallWinners = state.winners.filter((w) => w.round === 'small');
  const mainWinners = state.winners.filter((w) => w.round === 'main');

  if (smallWinners.length + mainWinners.length !== state.winners.length) {
    throw new Error('Riwayat pemenang mengandung babak tidak valid.');
  }

  const expectedSmallCount = state.smallPrizeCount;
  if (smallWinners.length !== expectedSmallCount) {
    throw new Error('Jumlah pemenang hiburan tersimpan tidak cocok dengan data pengundian.');
  }

  const expectedMainCount =
    state.round === 'main'
      ? state.phase === 'winner'
        ? state.mainPrizeIndex + 1
        : state.phase === 'complete'
          ? mainPrizes.length
          : state.mainPrizeIndex
      : 0;

  if (mainWinners.length !== expectedMainCount) {
    throw new Error('Jumlah pemenang tersimpan tidak cocok dengan kemajuan hadiah.');
  }

  const smallLotSet = new Set<string>();
  for (const [i, w] of smallWinners.entries()) {
    if (smallLotSet.has(w.lotId)) {
      throw new Error('Riwayat pemenang tersimpan mengandung nomor kavling duplikat.');
    }
    if (state.round === 'small' && state.activeLots.includes(w.lotId)) {
      throw new Error('Nomor kavling pemenang masih aktif.');
    }
    if (w.prizeId !== `small-${i + 1}` || w.prizeLabel !== `Hadiah Hiburan #${i + 1}`) {
      throw new Error('Urutan hadiah hiburan pemenang tersimpan tidak valid.');
    }
    smallLotSet.add(w.lotId);
  }

  const mainLotSet = new Set<string>();
  for (const [i, w] of mainWinners.entries()) {
    if (mainLotSet.has(w.lotId)) {
      throw new Error('Riwayat pemenang tersimpan mengandung nomor kavling duplikat.');
    }
    if (state.round === 'main' && state.activeLots.includes(w.lotId)) {
      throw new Error('Nomor kavling pemenang masih aktif.');
    }
    const prize = mainPrizes[i];
    if (prize === undefined || prize.id !== w.prizeId || prize.label !== w.prizeLabel) {
      throw new Error('Urutan hadiah pemenang tersimpan tidak cocok dengan konfigurasi.');
    }
    mainLotSet.add(w.lotId);
  }

  if (state.pendingWinner !== null) {
    if (state.activeLots.includes(state.pendingWinner.lotId)) {
      throw new Error('Pemenang tertunda masih aktif.');
    }

    if (state.pendingWinner.round !== state.round) {
      throw new Error('Babak pemenang tertunda tidak cocok dengan babak saat ini.');
    }

    if (state.round === 'small') {
      if (smallLotSet.has(state.pendingWinner.lotId)) {
        throw new Error('Pemenang tertunda sudah tercatat sebagai pemenang.');
      }
      const expectedId = `small-${state.smallPrizeCount + 1}`;
      const expectedLabel = `Hadiah Hiburan #${state.smallPrizeCount + 1}`;
      if (
        state.pendingWinner.prizeId !== expectedId ||
        state.pendingWinner.prizeLabel !== expectedLabel
      ) {
        throw new Error('Pemenang tertunda tidak cocok dengan hadiah saat ini.');
      }
    } else {
      if (mainLotSet.has(state.pendingWinner.lotId)) {
        throw new Error('Pemenang tertunda sudah tercatat sebagai pemenang.');
      }
      const prize = currentPrize(state, mainPrizes);
      if (
        prize.id !== state.pendingWinner.prizeId ||
        prize.label !== state.pendingWinner.prizeLabel
      ) {
        throw new Error('Pemenang tertunda tidak cocok dengan hadiah saat ini.');
      }
    }
  }
}

function startDraw(
  state: RaffleState,
  action: Extract<RaffleAction, { readonly type: 'START_DRAW' }>,
  mainPrizes: readonly Prize[],
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

  const prize = currentPrize(state, mainPrizes);
  const pendingWinner: WinnerRecord = {
    lotId: action.lotId,
    prizeId: prize.id,
    prizeLabel: prize.label,
    round: state.round,
    drawnAt: action.drawnAt,
  };

  return freezeState(
    'spinning',
    state.round,
    [...state.activeLots.slice(0, lotIndex), ...state.activeLots.slice(lotIndex + 1)],
    state.winners,
    state.smallPrizeCount,
    state.mainPrizeIndex,
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

  const nextSmallPrizeCount =
    state.round === 'small' ? state.smallPrizeCount + 1 : state.smallPrizeCount;

  return freezeState(
    'winner',
    state.round,
    state.activeLots,
    [...state.winners, state.pendingWinner],
    nextSmallPrizeCount,
    state.mainPrizeIndex,
    null,
  );
}

function advance(state: RaffleState, mainPrizes: readonly Prize[]): RaffleState {
  if (state.phase === 'spinning') {
    throw new Error('Tidak dapat melanjutkan saat pengundian berlangsung.');
  }

  if (state.phase !== 'winner') {
    throw new Error('Tidak ada pemenang yang dapat dilanjutkan.');
  }

  if (state.round === 'small') {
    return freezeState(
      'idle',
      'small',
      state.activeLots,
      state.winners,
      state.smallPrizeCount,
      0,
      null,
    );
  }

  const nextMainPrizeIndex = state.mainPrizeIndex + 1;
  const nextPhase = nextMainPrizeIndex >= mainPrizes.length ? 'complete' : 'idle';

  return freezeState(
    nextPhase,
    'main',
    state.activeLots,
    state.winners,
    state.smallPrizeCount,
    nextMainPrizeIndex,
    null,
  );
}

function forfeit(state: RaffleState): RaffleState {
  if (state.phase !== 'winner') {
    throw new Error('Hanya bisa hangus setelah pemenang muncul.');
  }

  const lastWinner = state.winners[state.winners.length - 1];
  const nextSmallPrizeCount =
    state.round === 'small' && lastWinner?.round === 'small'
      ? Math.max(0, state.smallPrizeCount - 1)
      : state.smallPrizeCount;

  return freezeState(
    'idle',
    state.round,
    state.activeLots,
    state.winners.slice(0, -1),
    nextSmallPrizeCount,
    state.mainPrizeIndex,
    null,
  );
}

function switchToMainRound(
  state: RaffleState,
  action: Extract<RaffleAction, { readonly type: 'SWITCH_TO_MAIN_ROUND' }>,
  mainPrizes: readonly Prize[],
): RaffleState {
  if (state.phase === 'spinning') {
    throw new Error('Pengalihan babak tidak tersedia saat pengundian berlangsung.');
  }

  assertDistinctLots(action.fullPool);
  const phase = mainPrizes.length === 0 ? 'complete' : 'idle';
  return freezeState(
    phase,
    'main',
    action.fullPool,
    state.winners,
    state.smallPrizeCount,
    0,
    null,
  );
}

function reset(
  state: RaffleState,
  action: Extract<RaffleAction, { readonly type: 'RESET' }>,
): RaffleState {
  if (state.phase === 'spinning') {
    throw new Error('Pengaturan ulang tidak tersedia saat pengundian berlangsung.');
  }

  assertDistinctLots(action.fullPool);
  return freezeState('idle', 'small', action.fullPool, [], 0, 0, null);
}

function unknownAction(action: never): never {
  const type = (action as { readonly type?: unknown }).type;
  throw new Error(`Aksi pengundian tidak dikenal: ${String(type)}.`);
}

export function createInitialState(_config: EventConfig, lots: readonly string[]): RaffleState {
  assertDistinctLots(lots);
  return freezeState('idle', 'small', lots, [], 0, 0, null);
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
    case 'SWITCH_TO_MAIN_ROUND':
      return switchToMainRound(state, action, prizes);
    case 'RESET':
      return reset(state, action);
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
    state.round,
    state.activeLots,
    state.winners,
    state.smallPrizeCount,
    state.mainPrizeIndex,
    state.pendingWinner,
  );
}
