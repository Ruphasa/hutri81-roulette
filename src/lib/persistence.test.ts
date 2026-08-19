import { describe, expect, it } from 'vitest';
import type { EventConfig, RaffleState } from '../domain/types';
import { MAIN_PRIZES } from '../config/event';
import {
  STORAGE_KEY,
  clearRaffleState,
  eventFingerprint,
  loadRaffleState,
  saveRaffleState,
} from './persistence';

const baseConfig: EventConfig = {
  id: 'hutri81-griya-shanta-rt08',
  title: 'Malam HUT RI ke-81',
  neighborhood: 'Griya Shanta RT 08',
  lotRanges: [
    { prefix: 'L', start: 201, end: 250 },
    { prefix: 'K', start: 301, end: 450 },
  ],
  prizes: MAIN_PRIZES,
};

const idleSmallState: RaffleState = {
  phase: 'idle',
  round: 'small',
  activeLots: ['L201', 'L202', 'K301'],
  winners: [],
  smallPrizeCount: 0,
  mainPrizeIndex: 0,
  pendingWinner: null,
};

const spinningSmallState: RaffleState = {
  phase: 'spinning',
  round: 'small',
  activeLots: ['L201', 'K301'],
  winners: [],
  smallPrizeCount: 0,
  mainPrizeIndex: 0,
  pendingWinner: {
    lotId: 'L202',
    prizeId: 'small-1',
    prizeLabel: 'Hadiah Hiburan #1',
    round: 'small',
    drawnAt: '2026-08-17T12:00:00.000Z',
  },
};

const winnerSmallState: RaffleState = {
  phase: 'winner',
  round: 'small',
  activeLots: ['L201', 'K301'],
  winners: [
    {
      lotId: 'L202',
      prizeId: 'small-1',
      prizeLabel: 'Hadiah Hiburan #1',
      round: 'small',
      drawnAt: '2026-08-17T12:00:00.000Z',
    },
  ],
  smallPrizeCount: 1,
  mainPrizeIndex: 0,
  pendingWinner: null,
};

const idleMainState: RaffleState = {
  phase: 'idle',
  round: 'main',
  activeLots: ['L201', 'L202', 'K301'],
  winners: [
    {
      lotId: 'L202',
      prizeId: 'small-1',
      prizeLabel: 'Hadiah Hiburan #1',
      round: 'small',
      drawnAt: '2026-08-17T12:00:00.000Z',
    },
  ],
  smallPrizeCount: 1,
  mainPrizeIndex: 0,
  pendingWinner: null,
};

function createMockStorage(
  initialEntries: Record<string, string> = {},
): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const store = new Map<string, string>(Object.entries(initialEntries));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe('eventFingerprint', () => {
  it('generates a stable deterministic fingerprint string for a given config', () => {
    const fp1 = eventFingerprint(baseConfig);
    const fp2 = eventFingerprint({ ...baseConfig });
    expect(fp1).toBe(fp2);
    expect(typeof fp1).toBe('string');
    expect(fp1.length).toBeGreaterThan(0);
  });

  it('changes when the event id changes', () => {
    const fpOriginal = eventFingerprint(baseConfig);
    const fpModified = eventFingerprint({ ...baseConfig, id: 'different-event-id' });
    expect(fpOriginal).not.toBe(fpModified);
  });

  it('changes when lot ranges are modified or reordered', () => {
    const fpOriginal = eventFingerprint(baseConfig);
    const fpModified = eventFingerprint({
      ...baseConfig,
      lotRanges: [
        { prefix: 'K', start: 301, end: 450 },
        { prefix: 'L', start: 201, end: 250 },
      ],
    });
    const fpRangeChanged = eventFingerprint({
      ...baseConfig,
      lotRanges: [{ prefix: 'L', start: 201, end: 251 }],
    });
    expect(fpOriginal).not.toBe(fpModified);
    expect(fpOriginal).not.toBe(fpRangeChanged);
  });

  it('changes when prize ids or prize order changes', () => {
    const fpOriginal = eventFingerprint(baseConfig);
    const fpModifiedOrder = eventFingerprint({
      ...baseConfig,
      prizes: [
        { id: 'main-magicom', label: 'Magicom' },
        { id: 'main-karpet', label: 'Karpet' },
        { id: 'main-kipas', label: 'Kipas Angin' },
      ],
    });
    const fpModifiedPrizes = eventFingerprint({
      ...baseConfig,
      prizes: [{ id: 'hadiah-utama', label: 'Hadiah Utama' }],
    });
    expect(fpOriginal).not.toBe(fpModifiedOrder);
    expect(fpOriginal).not.toBe(fpModifiedPrizes);
  });
});

describe('saveRaffleState', () => {
  it('saves the raffle state inside the versioned envelope to storage', () => {
    const storage = createMockStorage();
    const result = saveRaffleState(storage, baseConfig, idleSmallState);

    expect(result).toEqual({ status: 'saved' });

    const raw = storage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual({
      schemaVersion: 1,
      eventFingerprint: eventFingerprint(baseConfig),
      payload: idleSmallState,
    });
  });

  it('returns failed status when storage throws on setItem', () => {
    const failingStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError: LocalStorage quota exceeded');
      },
      removeItem: () => {},
    };

    const result = saveRaffleState(failingStorage, baseConfig, idleSmallState);
    expect(result).toEqual({
      status: 'failed',
      reason: 'QuotaExceededError: LocalStorage quota exceeded',
    });
  });
});

describe('loadRaffleState', () => {
  it('returns empty status when no data is in storage', () => {
    const storage = createMockStorage();
    const result = loadRaffleState(storage, baseConfig);

    expect(result).toEqual({ status: 'empty' });
  });

  it('returns empty status when stored item is an empty string', () => {
    const storage = createMockStorage({ [STORAGE_KEY]: '' });
    const result = loadRaffleState(storage, baseConfig);

    expect(result).toEqual({ status: 'empty' });
  });

  it('restores a valid idle state successfully', () => {
    const storage = createMockStorage();
    saveRaffleState(storage, baseConfig, idleSmallState);

    const result = loadRaffleState(storage, baseConfig);
    expect(result).toEqual({
      status: 'restored',
      state: idleSmallState,
    });
    if (result.status === 'restored') {
      expect(Object.isFrozen(result.state)).toBe(true);
      expect(Object.isFrozen(result.state.activeLots)).toBe(true);
    }
  });

  it('restores a valid winner state successfully', () => {
    const storage = createMockStorage();
    saveRaffleState(storage, baseConfig, winnerSmallState);

    const result = loadRaffleState(storage, baseConfig);
    expect(result).toEqual({
      status: 'restored',
      state: winnerSmallState,
    });
  });

  it('restores a valid main round state successfully', () => {
    const storage = createMockStorage();
    saveRaffleState(storage, baseConfig, idleMainState);

    const result = loadRaffleState(storage, baseConfig);
    expect(result).toEqual({
      status: 'restored',
      state: idleMainState,
    });
  });

  it('stabilizes an interrupted spinning state into a winner state upon recovery', () => {
    const storage = createMockStorage();
    saveRaffleState(storage, baseConfig, spinningSmallState);

    const result = loadRaffleState(storage, baseConfig);
    expect(result).toEqual({
      status: 'restored',
      state: {
        phase: 'winner',
        round: 'small',
        activeLots: ['L201', 'K301'],
        winners: [
          {
            lotId: 'L202',
            prizeId: 'small-1',
            prizeLabel: 'Hadiah Hiburan #1',
            round: 'small',
            drawnAt: '2026-08-17T12:00:00.000Z',
          },
        ],
        smallPrizeCount: 1,
        mainPrizeIndex: 0,
        pendingWinner: null,
      },
    });
  });

  it('returns incompatible status when stored data is malformed JSON', () => {
    const storage = createMockStorage({ [STORAGE_KEY]: '{"invalid json' });
    const result = loadRaffleState(storage, baseConfig);

    expect(result.status).toBe('incompatible');
    if (result.status === 'incompatible') {
      expect(result.reason).toContain('JSON');
    }
  });

  it('returns incompatible status when stored data is a non-object JSON primitive', () => {
    const storage = createMockStorage({ [STORAGE_KEY]: '12345' });
    const result = loadRaffleState(storage, baseConfig);

    expect(result.status).toBe('incompatible');
    if (result.status === 'incompatible') {
      expect(result.reason).toBeDefined();
    }
  });

  it('returns incompatible status when schemaVersion does not match version 1', () => {
    const envelopeV2 = {
      schemaVersion: 2,
      eventFingerprint: eventFingerprint(baseConfig),
      payload: idleSmallState,
    };
    const storage = createMockStorage({ [STORAGE_KEY]: JSON.stringify(envelopeV2) });
    const result = loadRaffleState(storage, baseConfig);

    expect(result.status).toBe('incompatible');
    if (result.status === 'incompatible') {
      expect(result.reason).toContain('skema');
    }
  });

  it('auto-resets storage and returns empty status when eventFingerprint does not match the current config', () => {
    const otherConfig: EventConfig = {
      ...baseConfig,
      id: 'other-event-config',
    };
    const storage = createMockStorage();
    saveRaffleState(storage, otherConfig, idleSmallState);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();

    const result = loadRaffleState(storage, baseConfig);
    expect(result).toEqual({ status: 'empty' });
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns incompatible status when payload fails domain invariants', () => {
    const invalidPayloadEnvelope = {
      schemaVersion: 1,
      eventFingerprint: eventFingerprint(baseConfig),
      payload: {
        phase: 'idle',
        round: 'small',
        activeLots: ['L201', 'L201'], // duplicate lot violation
        winners: [],
        smallPrizeCount: 0,
        mainPrizeIndex: 0,
        pendingWinner: null,
      },
    };
    const storage = createMockStorage({
      [STORAGE_KEY]: JSON.stringify(invalidPayloadEnvelope),
    });
    const result = loadRaffleState(storage, baseConfig);

    expect(result.status).toBe('incompatible');
    if (result.status === 'incompatible') {
      expect(result.reason).toContain('duplikat');
    }
  });

  it('returns incompatible status when storage throws on getItem', () => {
    const failingStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
      getItem: () => {
        throw new Error('SecurityError: Storage is disabled');
      },
      setItem: () => {},
      removeItem: () => {},
    };

    const result = loadRaffleState(failingStorage, baseConfig);
    expect(result.status).toBe('incompatible');
    if (result.status === 'incompatible') {
      expect(result.reason).toContain('SecurityError');
    }
  });
});

describe('clearRaffleState', () => {
  it('removes the saved state key from storage', () => {
    const storage = createMockStorage();
    saveRaffleState(storage, baseConfig, idleSmallState);
    expect(storage.getItem(STORAGE_KEY)).not.toBeNull();

    clearRaffleState(storage);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });
});
