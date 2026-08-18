import { stabilizeRestoredState } from '../domain/raffle-machine';
import type { EventConfig, RaffleState } from '../domain/types';

export const STORAGE_KEY = 'hutri81-raffle:v1';

export interface PersistedEnvelope {
  readonly schemaVersion: 1;
  readonly eventFingerprint: string;
  readonly payload: RaffleState;
}

export type LoadResult =
  | { readonly status: 'empty' }
  | { readonly status: 'restored'; readonly state: RaffleState }
  | { readonly status: 'incompatible'; readonly reason: string };

export type SaveResult =
  | { readonly status: 'saved' }
  | { readonly status: 'failed'; readonly reason: string };

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function eventFingerprint(config: EventConfig): string {
  const rangeParts = config.lotRanges.map((range) => {
    const pad = range.padTo !== undefined ? `:${range.padTo}` : '';
    return `${range.prefix}:${range.start}-${range.end}${pad}`;
  });
  const prizeParts = config.prizes.map((prize) => prize.id);
  return `${config.id}|ranges:${rangeParts.join(',')}|prizes:${prizeParts.join(',')}`;
}

export function saveRaffleState(
  storage: StorageLike,
  config: EventConfig,
  state: RaffleState,
): SaveResult {
  try {
    const envelope: PersistedEnvelope = {
      schemaVersion: 1,
      eventFingerprint: eventFingerprint(config),
      payload: state,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return { status: 'saved' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { status: 'failed', reason };
  }
}

export function loadRaffleState(
  storage: StorageLike,
  config: EventConfig,
): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { status: 'incompatible', reason };
  }

  if (raw === null || raw === undefined || raw === '') {
    return { status: 'empty' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'incompatible',
      reason: `Format JSON tidak valid: ${message}`,
    };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      status: 'incompatible',
      reason: 'Data tersimpan bukan objek envelope yang valid.',
    };
  }

  const envelope = parsed as Partial<PersistedEnvelope>;

  if (envelope.schemaVersion !== 1) {
    return {
      status: 'incompatible',
      reason: `Versi skema tersimpan (${String(envelope.schemaVersion)}) tidak kompatibel.`,
    };
  }

  const expectedFingerprint = eventFingerprint(config);
  if (typeof envelope.eventFingerprint !== 'string' || envelope.eventFingerprint !== expectedFingerprint) {
    clearRaffleState(storage);
    return { status: 'empty' };
  }

  if (typeof envelope.payload !== 'object' || envelope.payload === null || Array.isArray(envelope.payload)) {
    return {
      status: 'incompatible',
      reason: 'Payload status undian tidak valid.',
    };
  }

  try {
    const stabilized = stabilizeRestoredState(envelope.payload as RaffleState, config.prizes);
    return {
      status: 'restored',
      state: stabilized,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      status: 'incompatible',
      reason: `Status undian tersimpan tidak valid: ${reason}`,
    };
  }
}

export function clearRaffleState(storage: StorageLike): void {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore clear errors on teardown
  }
}
