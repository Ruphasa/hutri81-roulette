import { describe, expect, it } from 'vitest';
import { randomIndex, selectWinner } from './random-selection';

describe('randomIndex', () => {
  it('returns an index within the supplied pool bounds', () => {
    expect(randomIndex(1, () => 4_294_967_295)).toBe(0);
    expect(randomIndex(10, () => 17)).toBe(7);
  });

  it('rejects an empty or invalid pool length', () => {
    expect(() => randomIndex(0)).toThrow('Panjang kumpulan harus lebih dari nol');
    expect(() => randomIndex(-1)).toThrow('Panjang kumpulan harus lebih dari nol');
    expect(() => randomIndex(1.5)).toThrow('Panjang kumpulan harus lebih dari nol');
  });

  it('uses injected values deterministically and rejects modulo-biased values', () => {
    const values = [4_294_967_295, 7];
    const next = () => values.shift() ?? 0;

    expect(randomIndex(10, next)).toBe(7);
  });
});

describe('selectWinner', () => {
  it('selects a lot by the unbiased selected index', () => {
    expect(selectWinner(['L201', 'K301', 'K302'], () => 4)).toBe('K301');
  });

  it('rejects an empty active pool', () => {
    expect(() => selectWinner([])).toThrow('Panjang kumpulan harus lebih dari nol');
  });
});
